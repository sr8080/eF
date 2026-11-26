import { z } from "zod";

export const LEAGUE_LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const LEAGUE_LOGO_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
export const LEAGUE_LOGO_ACCEPT = Object.keys(LEAGUE_LOGO_TYPES).join(",");

export const INVITE_CODE_REGEX = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/;

/** Extracts an 8-char invite code from either a raw code or a full /join/<code> URL. */
export function extractInviteCode(raw: string): string {
  const trimmed = raw.trim();
  const joinMatch = trimmed.match(/\/join\/([^/?#\s]+)/i);
  const candidate = joinMatch ? joinMatch[1] : trimmed;
  return candidate.replace(/[\s-]+/g, "").toUpperCase();
}

export const leagueDetailsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "League name must be at least 3 characters")
    .max(50, "League name must be 50 characters or fewer"),
  description: z
    .string()
    .trim()
    .max(280, "Description must be 280 characters or fewer"),
});

export const joinCodeFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Enter an invite code or link")
    .refine(
      (value) => INVITE_CODE_REGEX.test(extractInviteCode(value)),
      "Enter a valid 8-character invite code or invite link",
    ),
});

export type LeagueDetailsInput = z.infer<typeof leagueDetailsSchema>;
export type JoinCodeFormInput = z.infer<typeof joinCodeFormSchema>;
