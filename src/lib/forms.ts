import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import type { ActionResult } from "@/lib/actions/result";

/** Copies server-side field errors onto a React Hook Form instance. */
export function applyServerErrors<T extends FieldValues>(
  result: ActionResult<unknown>,
  setError: UseFormSetError<T>,
) {
  if (result.ok || !result.fieldErrors) return;
  for (const [field, messages] of Object.entries(result.fieldErrors)) {
    if (messages?.[0]) setError(field as Path<T>, { type: "server", message: messages[0] });
  }
}
