import { z } from "zod";

export const seasonNameSchema = z
  .string()
  .trim()
  .min(1, "Season name is required")
  .max(60, "Season name must be 60 characters or fewer");

export const seasonFormSchema = z.object({
  name: seasonNameSchema,
});

export type SeasonFormInput = z.infer<typeof seasonFormSchema>;
