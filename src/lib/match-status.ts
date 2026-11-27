import type { MatchStatus } from "@/types/database";

export type MatchDisplayStatus = MatchStatus | "pending_result";

/**
 * Derives "pending_result" on the fly when a scheduled match's kickoff time has
 * passed without a result submission, avoiding any stored status drift or cron job.
 */
export function deriveMatchDisplayStatus(
  status: MatchStatus,
  scheduledAt: string | null,
  nowMs = Date.now(),
): MatchDisplayStatus {
  if (status === "scheduled" && scheduledAt !== null) {
    const kickoff = Date.parse(scheduledAt);
    if (!Number.isNaN(kickoff) && kickoff < nowMs) {
      return "pending_result";
    }
  }
  return status;
}

export function formatMatchDateTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
