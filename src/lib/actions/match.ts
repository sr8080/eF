"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { isUuid } from "@/lib/leagues";
import { createClient } from "@/lib/supabase/server";
import {
  createMatchSchema,
  generateFixturesSchema,
  parseOptionalInt,
  parseOptionalIsoDatetime,
  rescheduleMatchSchema,
} from "@/lib/validations/match";
import { fail, validationError, type ActionResult } from "./result";

function mapMatchError(error: { code?: string; message?: string } | null, fallback: string): string {
  const msg = error?.message ?? "";
  if (msg.includes("UNAUTHENTICATED")) return "Please sign in to continue.";
  if (msg.includes("LEAGUE_ARCHIVED")) return "This league is archived and read-only.";
  if (msg.includes("SEASON_LOCKED")) {
    return "Matches in completed or archived seasons cannot be modified.";
  }
  if (msg.includes("FIXTURES_ALREADY_EXIST")) {
    return "This season already has active fixtures. Add single matches or cancel existing ones first.";
  }
  if (msg.includes("NEEDS_PARTICIPANTS")) {
    return "Add at least 2 participants to the season before generating fixtures.";
  }
  if (msg.includes("INVALID_PARTICIPANT")) {
    return "Both players must be enrolled in this season.";
  }
  if (msg.includes("INVALID_STATUS")) {
    return "Only scheduled matches can be modified or cancelled.";
  }
  if (msg.includes("FORBIDDEN") || error?.code === "42501") {
    return "Only league managers can manage fixtures.";
  }
  if (msg.includes("NOT_FOUND")) return "Match or season not found.";
  if (msg.includes("INVALID_INPUT")) return "Check your match details and try again.";
  return fallback;
}

function revalidateMatchPaths(leagueId: string, matchId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/matches");
  revalidatePath(`/leagues/${leagueId}`, "layout");
  revalidatePath(`/leagues/${leagueId}/fixtures`);
  if (matchId) revalidatePath(`/leagues/${leagueId}/matches/${matchId}`);
}

export async function createMatchAction(
  leagueId: string,
  input: unknown,
): Promise<ActionResult<{ matchId: string }>> {
  await requireUser();
  if (!isUuid(leagueId)) return fail("Invalid league.");

  const parsed = createMatchSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createClient();
  const { data: matchId, error } = await supabase.rpc("create_match", {
    p_season_id: parsed.data.seasonId,
    p_player_a_id: parsed.data.playerAId,
    p_player_b_id: parsed.data.playerBId,
    p_round: parseOptionalInt(parsed.data.round),
    p_scheduled_at: parseOptionalIsoDatetime(parsed.data.scheduledAt),
  });

  if (error || !matchId) {
    return fail(mapMatchError(error, "Could not create match."));
  }

  revalidateMatchPaths(leagueId, matchId);
  return { ok: true, message: "Match scheduled.", data: { matchId } };
}

export async function generateFixturesAction(
  leagueId: string,
  input: unknown,
): Promise<ActionResult<{ count: number }>> {
  await requireUser();
  if (!isUuid(leagueId)) return fail("Invalid league.");

  const parsed = generateFixturesSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createClient();
  const { data: count, error } = await supabase.rpc("generate_round_robin_fixtures", {
    p_season_id: parsed.data.seasonId,
    p_double_round_robin: parsed.data.doubleRoundRobin,
    p_start_at: parseOptionalIsoDatetime(parsed.data.startAt),
    p_interval_days: Number(parsed.data.intervalDays),
  });

  if (error || typeof count !== "number") {
    return fail(mapMatchError(error, "Could not generate fixtures."));
  }

  revalidateMatchPaths(leagueId);
  return {
    ok: true,
    message: `Generated ${count} ${count === 1 ? "fixture" : "fixtures"}.`,
    data: { count },
  };
}

export async function rescheduleMatchAction(
  leagueId: string,
  matchId: string,
  input: unknown,
): Promise<ActionResult> {
  await requireUser();
  if (!isUuid(leagueId) || !isUuid(matchId)) return fail("Invalid request.");

  const parsed = rescheduleMatchSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_match_schedule", {
    p_match_id: matchId,
    p_round: parseOptionalInt(parsed.data.round),
    p_scheduled_at: parseOptionalIsoDatetime(parsed.data.scheduledAt),
  });

  if (error) return fail(mapMatchError(error, "Could not reschedule match."));

  revalidateMatchPaths(leagueId, matchId);
  return { ok: true, message: "Match schedule updated." };
}

export async function cancelMatchAction(leagueId: string, matchId: string): Promise<ActionResult> {
  await requireUser();
  if (!isUuid(leagueId) || !isUuid(matchId)) return fail("Invalid request.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_match", { p_match_id: matchId });
  if (error) return fail(mapMatchError(error, "Could not cancel match."));

  revalidateMatchPaths(leagueId, matchId);
  return { ok: true, message: "Match cancelled." };
}
