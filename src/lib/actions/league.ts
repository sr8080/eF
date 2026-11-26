"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/leagues";
import {
  extractInviteCode,
  INVITE_CODE_REGEX,
  LEAGUE_LOGO_MAX_BYTES,
  LEAGUE_LOGO_TYPES,
  leagueDetailsSchema,
} from "@/lib/validations/league";
import type { LeagueRole } from "@/types/database";
import { fail, validationError, type ActionResult } from "./result";

function mapLeagueError(error: { code?: string; message?: string } | null, fallback: string): string {
  const msg = error?.message ?? "";
  if (msg.includes("UNAUTHENTICATED")) return "Please sign in to continue.";
  if (msg.includes("INVALID_INVITE_CODE")) return "No league matches that invite code.";
  if (msg.includes("LEAGUE_ARCHIVED")) return "This league is archived and read-only.";
  if (msg.includes("OWNER_MUST_TRANSFER")) {
    return "Transfer ownership to another member before leaving the league.";
  }
  if (msg.includes("CANNOT_MODIFY_OWNER")) {
    return "The owner's role cannot be changed directly. Transfer ownership instead.";
  }
  if (msg.includes("INVALID_ROLE")) return "Use transfer ownership to assign a new owner.";
  if (msg.includes("INVALID_TARGET")) return "Choose a different member.";
  if (msg.includes("USE_LEAVE")) return "Use Leave league to leave the league yourself.";
  if (msg.includes("Admins cannot remove other admins")) {
    return "Admins cannot remove other admins.";
  }
  if (msg.includes("league owner cannot be removed")) {
    return "The league owner cannot be removed.";
  }
  if (msg.includes("FORBIDDEN") || error?.code === "42501") {
    return "You don't have permission to perform this action.";
  }
  if (msg.includes("NOT_FOUND")) return "League or member not found.";
  if (msg.includes("INVALID_INPUT")) return "Check your inputs and try again.";
  return fallback;
}

function validateLogoFile(file: File): string | null {
  const ext = LEAGUE_LOGO_TYPES[file.type];
  if (!ext) return "Use a PNG, JPG or WebP image.";
  if (file.size > LEAGUE_LOGO_MAX_BYTES) return "Logo must be 2 MB or smaller.";
  return null;
}

async function storeLeagueLogo(
  leagueId: string,
  file: File,
): Promise<ActionResult<{ url: string }>> {
  const fileError = validateLogoFile(file);
  if (fileError) return fail(fileError);

  const ext = LEAGUE_LOGO_TYPES[file.type];
  const supabase = await createClient();
  const path = `${leagueId}/logo-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("league-logos")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) return fail("Logo upload failed. Check your permissions and try again.");

  const { data: publicUrl } = supabase.storage.from("league-logos").getPublicUrl(path);

  const { data: updated, error: updateError } = await supabase
    .from("leagues")
    .update({ logo_url: publicUrl.publicUrl })
    .eq("id", leagueId)
    .select("id")
    .maybeSingle();

  if (updateError || !updated) {
    await supabase.storage.from("league-logos").remove([path]);
    return fail("Could not save the league logo.");
  }

  // Best-effort cleanup of older logos for this league.
  const { data: existing } = await supabase.storage.from("league-logos").list(leagueId);
  const stale = (existing ?? [])
    .map((f) => `${leagueId}/${f.name}`)
    .filter((p) => p !== path);
  if (stale.length) await supabase.storage.from("league-logos").remove(stale);

  return { ok: true, message: "League logo updated.", data: { url: publicUrl.publicUrl } };
}

function revalidateLeaguePaths(leagueId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/leagues", "layout");
  if (leagueId) revalidatePath(`/leagues/${leagueId}`, "layout");
}

export async function createLeagueAction(
  formData: FormData,
): Promise<ActionResult<{ leagueId: string; warning?: string }>> {
  await requireUser();

  const parsed = leagueDetailsSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) return validationError(parsed.error);

  const logo = formData.get("logo");
  const hasLogo = logo instanceof File && logo.size > 0;
  if (hasLogo) {
    const fileError = validateLogoFile(logo);
    if (fileError) return fail(fileError);
  }

  const supabase = await createClient();
  const { data: leagueId, error } = await supabase.rpc("create_league", {
    p_name: parsed.data.name,
    p_description: parsed.data.description,
  });

  if (error || !leagueId) {
    return fail(mapLeagueError(error, "Could not create the league. Please try again."));
  }

  let warning: string | undefined;
  if (hasLogo) {
    const logoRes = await storeLeagueLogo(leagueId, logo);
    if (!logoRes.ok) {
      warning = `League created, but the logo couldn't be uploaded: ${logoRes.error}`;
    }
  }

  revalidateLeaguePaths(leagueId);
  return {
    ok: true,
    message: warning ?? "League created.",
    data: { leagueId, warning },
  };
}

export async function updateLeagueAction(
  leagueId: string,
  input: unknown,
): Promise<ActionResult> {
  await requireUser();
  if (!isUuid(leagueId)) return fail("Invalid league.");

  const parsed = leagueDetailsSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leagues")
    .update({
      name: parsed.data.name,
      description: parsed.data.description,
    })
    .eq("id", leagueId)
    .select("id")
    .maybeSingle();

  if (error) return fail(mapLeagueError(error, "Could not update league settings."));
  if (!data) return fail("You can't edit an archived league or lack permission.");

  revalidateLeaguePaths(leagueId);
  return { ok: true, message: "League settings saved." };
}

export async function uploadLeagueLogoAction(
  leagueId: string,
  formData: FormData,
): Promise<ActionResult<{ url: string }>> {
  await requireUser();
  if (!isUuid(leagueId)) return fail("Invalid league.");

  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) return fail("Choose an image to upload.");

  const result = await storeLeagueLogo(leagueId, file);
  if (result.ok) revalidateLeaguePaths(leagueId);
  return result;
}

export async function removeLeagueLogoAction(leagueId: string): Promise<ActionResult> {
  await requireUser();
  if (!isUuid(leagueId)) return fail("Invalid league.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leagues")
    .update({ logo_url: null })
    .eq("id", leagueId)
    .select("id")
    .maybeSingle();

  if (error) return fail(mapLeagueError(error, "Could not remove the league logo."));
  if (!data) return fail("You can't edit an archived league or lack permission.");

  const { data: existing } = await supabase.storage.from("league-logos").list(leagueId);
  const paths = (existing ?? []).map((f) => `${leagueId}/${f.name}`);
  if (paths.length) await supabase.storage.from("league-logos").remove(paths);

  revalidateLeaguePaths(leagueId);
  return { ok: true, message: "League logo removed." };
}

export async function joinLeagueAction(rawCode: string): Promise<ActionResult<{ leagueId: string }>> {
  await requireUser();
  const code = extractInviteCode(rawCode);
  if (!INVITE_CODE_REGEX.test(code)) {
    return {
      ok: false,
      error: "Enter a valid 8-character invite code or link.",
      fieldErrors: { code: ["Enter a valid 8-character invite code or link"] },
    };
  }

  const supabase = await createClient();
  const { data: leagueId, error } = await supabase.rpc("join_league_by_code", {
    p_code: code,
  });

  if (error || !leagueId) {
    return fail(mapLeagueError(error, "Could not join the league. Please try again."));
  }

  revalidateLeaguePaths(leagueId);
  return { ok: true, message: "Welcome to the league.", data: { leagueId } };
}

export async function regenerateInviteCodeAction(
  leagueId: string,
): Promise<ActionResult<{ code: string }>> {
  await requireUser();
  if (!isUuid(leagueId)) return fail("Invalid league.");

  const supabase = await createClient();
  const { data: code, error } = await supabase.rpc("regenerate_invite_code", {
    p_league_id: leagueId,
  });

  if (error || !code) {
    return fail(mapLeagueError(error, "Could not regenerate the invite code."));
  }

  revalidateLeaguePaths(leagueId);
  return { ok: true, message: "Invite code regenerated.", data: { code } };
}

export async function setMemberRoleAction(
  leagueId: string,
  userId: string,
  role: Extract<LeagueRole, "admin" | "player">,
): Promise<ActionResult> {
  await requireUser();
  if (!isUuid(leagueId) || !isUuid(userId)) return fail("Invalid request.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_member_role", {
    p_league_id: leagueId,
    p_user_id: userId,
    p_role: role,
  });

  if (error) return fail(mapLeagueError(error, "Could not update member role."));

  revalidateLeaguePaths(leagueId);
  return {
    ok: true,
    message: role === "admin" ? "Member promoted to admin." : "Member demoted to player.",
  };
}

export async function removeMemberAction(leagueId: string, userId: string): Promise<ActionResult> {
  await requireUser();
  if (!isUuid(leagueId) || !isUuid(userId)) return fail("Invalid request.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_member", {
    p_league_id: leagueId,
    p_user_id: userId,
  });

  if (error) return fail(mapLeagueError(error, "Could not remove member."));

  revalidateLeaguePaths(leagueId);
  return { ok: true, message: "Member removed from the league." };
}

export async function leaveLeagueAction(leagueId: string): Promise<ActionResult> {
  await requireUser();
  if (!isUuid(leagueId)) return fail("Invalid league.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("leave_league", {
    p_league_id: leagueId,
  });

  if (error) return fail(mapLeagueError(error, "Could not leave the league."));

  revalidateLeaguePaths(leagueId);
  return { ok: true, message: "You left the league." };
}

export async function transferOwnershipAction(
  leagueId: string,
  newOwnerId: string,
): Promise<ActionResult> {
  await requireUser();
  if (!isUuid(leagueId) || !isUuid(newOwnerId)) return fail("Invalid request.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("transfer_ownership", {
    p_league_id: leagueId,
    p_new_owner_id: newOwnerId,
  });

  if (error) return fail(mapLeagueError(error, "Could not transfer ownership."));

  revalidateLeaguePaths(leagueId);
  return { ok: true, message: "Ownership transferred." };
}

export async function archiveLeagueAction(leagueId: string): Promise<ActionResult> {
  await requireUser();
  if (!isUuid(leagueId)) return fail("Invalid league.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("archive_league", { p_league_id: leagueId });
  if (error) return fail(mapLeagueError(error, "Could not archive the league."));

  revalidateLeaguePaths(leagueId);
  return { ok: true, message: "League archived. It is now read-only." };
}

export async function unarchiveLeagueAction(leagueId: string): Promise<ActionResult> {
  await requireUser();
  if (!isUuid(leagueId)) return fail("Invalid league.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("unarchive_league", { p_league_id: leagueId });
  if (error) return fail(mapLeagueError(error, "Could not unarchive the league."));

  revalidateLeaguePaths(leagueId);
  return { ok: true, message: "League restored." };
}
