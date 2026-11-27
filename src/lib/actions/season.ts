"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { isUuid } from "@/lib/leagues";
import { createClient } from "@/lib/supabase/server";
import { seasonFormSchema } from "@/lib/validations/season";
import { fail, validationError, type ActionResult } from "./result";

function mapSeasonError(error: { code?: string; message?: string } | null, fallback: string): string {
  const msg = error?.message ?? "";
  if (msg.includes("UNAUTHENTICATED")) return "Please sign in to continue.";
  if (msg.includes("LEAGUE_ARCHIVED")) return "This league is archived and read-only.";
  if (msg.includes("SEASON_LOCKED")) return "Completed or archived seasons cannot be modified.";
  if (msg.includes("ACTIVE_SEASON_EXISTS")) {
    return "Complete or archive the active season before starting a new one.";
  }
  if (msg.includes("NEEDS_PARTICIPANTS")) {
    return "Add at least 2 participants before starting a season.";
  }
  if (msg.includes("PARTICIPANT_HAS_MATCHES")) {
    return "Cannot remove a player who already has matches in this season.";
  }
  if (msg.includes("INVALID_PARTICIPANT")) {
    return "Every participant must be a current member of the league.";
  }
  if (msg.includes("INVALID_CHAMPION")) {
    return "Champion must be a participant in this season.";
  }
  if (msg.includes("INVALID_STATUS")) return "This season cannot transition from its current status.";
  if (msg.includes("FORBIDDEN") || error?.code === "42501") {
    return "Only league managers can perform this action.";
  }
  if (msg.includes("NOT_FOUND")) return "League or season not found.";
  if (msg.includes("INVALID_INPUT")) return "Check your season details and try again.";
  return fallback;
}

function revalidateSeasonPaths(leagueId: string) {
  revalidatePath(`/leagues/${leagueId}`, "layout");
  revalidatePath(`/leagues/${leagueId}/seasons`);
}

export async function createSeasonAction(
  leagueId: string,
  input: unknown,
  participantIds: string[],
): Promise<ActionResult<{ seasonId: string }>> {
  await requireUser();
  if (!isUuid(leagueId)) return fail("Invalid league.");

  const parsed = seasonFormSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const validIds = participantIds.filter(isUuid);
  const supabase = await createClient();
  const { data: seasonId, error } = await supabase.rpc("create_season", {
    p_league_id: leagueId,
    p_name: parsed.data.name,
    p_participant_ids: validIds.length > 0 ? validIds : null,
  });

  if (error || !seasonId) {
    return fail(mapSeasonError(error, "Could not create season."));
  }

  revalidateSeasonPaths(leagueId);
  return { ok: true, message: "Season created.", data: { seasonId } };
}

export async function updateSeasonNameAction(
  leagueId: string,
  seasonId: string,
  input: unknown,
): Promise<ActionResult> {
  await requireUser();
  if (!isUuid(leagueId) || !isUuid(seasonId)) return fail("Invalid request.");

  const parsed = seasonFormSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_season_name", {
    p_season_id: seasonId,
    p_name: parsed.data.name,
  });

  if (error) return fail(mapSeasonError(error, "Could not rename season."));

  revalidateSeasonPaths(leagueId);
  return { ok: true, message: "Season renamed." };
}

export async function setSeasonParticipantsAction(
  leagueId: string,
  seasonId: string,
  participantIds: string[],
): Promise<ActionResult> {
  await requireUser();
  if (!isUuid(leagueId) || !isUuid(seasonId)) return fail("Invalid request.");

  const validIds = Array.from(new Set(participantIds.filter(isUuid)));
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_season_participants", {
    p_season_id: seasonId,
    p_user_ids: validIds,
  });

  if (error) return fail(mapSeasonError(error, "Could not update season roster."));

  revalidateSeasonPaths(leagueId);
  return { ok: true, message: "Season participants updated." };
}

export async function startSeasonAction(
  leagueId: string,
  seasonId: string,
): Promise<ActionResult> {
  await requireUser();
  if (!isUuid(leagueId) || !isUuid(seasonId)) return fail("Invalid request.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("start_season", { p_season_id: seasonId });
  if (error) return fail(mapSeasonError(error, "Could not start season."));

  revalidateSeasonPaths(leagueId);
  return { ok: true, message: "Season is now active." };
}

export async function completeSeasonAction(
  leagueId: string,
  seasonId: string,
  championId: string | null,
): Promise<ActionResult> {
  await requireUser();
  if (!isUuid(leagueId) || !isUuid(seasonId)) return fail("Invalid request.");
  if (championId && !isUuid(championId)) return fail("Invalid champion selection.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_season", {
    p_season_id: seasonId,
    p_champion_id: championId || null,
  });
  if (error) return fail(mapSeasonError(error, "Could not complete season."));

  revalidateSeasonPaths(leagueId);
  return { ok: true, message: "Season marked as completed." };
}

export async function archiveSeasonAction(
  leagueId: string,
  seasonId: string,
): Promise<ActionResult> {
  await requireUser();
  if (!isUuid(leagueId) || !isUuid(seasonId)) return fail("Invalid request.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("archive_season", { p_season_id: seasonId });
  if (error) return fail(mapSeasonError(error, "Could not archive season."));

  revalidateSeasonPaths(leagueId);
  return { ok: true, message: "Season archived." };
}
