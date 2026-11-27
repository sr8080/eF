import { z } from "zod";

const uuidString = z.string().uuid("Select a valid option");

const optionalRoundString = z
  .string()
  .trim()
  .refine(
    (v) => v === "" || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 999),
    "Round must be a whole number (1–999)",
  );

const optionalDatetimeString = z
  .string()
  .trim()
  .refine((v) => v === "" || !Number.isNaN(Date.parse(v)), "Enter a valid date and time");

export const createMatchSchema = z
  .object({
    seasonId: uuidString,
    playerAId: uuidString,
    playerBId: uuidString,
    round: optionalRoundString,
    scheduledAt: optionalDatetimeString,
  })
  .refine((v) => v.playerAId !== v.playerBId, {
    path: ["playerBId"],
    message: "Choose two different players",
  });

export const generateFixturesSchema = z.object({
  seasonId: uuidString,
  doubleRoundRobin: z.boolean(),
  startAt: optionalDatetimeString,
  intervalDays: z
    .string()
    .trim()
    .refine(
      (v) => /^\d+$/.test(v) && Number(v) >= 0 && Number(v) <= 365,
      "Enter 0–365 days",
    ),
});

export const rescheduleMatchSchema = z.object({
  round: optionalRoundString,
  scheduledAt: optionalDatetimeString,
});

export function parseOptionalInt(value: string): number | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : Number(trimmed);
}

export function parseOptionalIsoDatetime(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : new Date(trimmed).toISOString();
}

export type CreateMatchInput = z.infer<typeof createMatchSchema>;
export type GenerateFixturesInput = z.infer<typeof generateFixturesSchema>;
export type RescheduleMatchInput = z.infer<typeof rescheduleMatchSchema>;
