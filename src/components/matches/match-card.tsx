import Link from "next/link";
import { CalendarDays, ChevronRight } from "lucide-react";
import type { EnrichedMatch } from "@/lib/matches";
import { formatMatchDateTime } from "@/lib/match-status";
import { UserAvatar } from "@/components/user/user-avatar";
import { cn } from "@/lib/utils";
import { MatchStatusBadge } from "./match-badges";

export function MatchCard({
  item,
  showLeague = false,
  currentUserId,
}: {
  item: EnrichedMatch;
  showLeague?: boolean;
  currentUserId?: string;
}) {
  const { match, displayStatus, playerA, playerB, result, season, league } = item;
  const isCancelled = displayStatus === "cancelled";

  return (
    <Link
      href={`/leagues/${league.id}/matches/${match.id}`}
      className={cn(
        "group block rounded-xl border bg-card p-3.5 transition-colors hover:border-primary/40 hover:bg-surface-2 sm:p-4",
        isCancelled && "opacity-70",
      )}
    >
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-2">
          {showLeague && (
            <span className="font-medium text-foreground/90">{league.name}</span>
          )}
          {showLeague && <span>·</span>}
          <span>
            #{season.number} {season.name}
          </span>
          {match.round !== null && (
            <>
              <span>·</span>
              <span className="tabular font-medium">Round {match.round}</span>
            </>
          )}
        </div>

        <MatchStatusBadge status={displayStatus} />
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
          {/* Player A (Home) */}
          <div className="flex min-w-0 items-center gap-2">
            <UserAvatar name={playerA.display_name} src={playerA.avatar_url} size="sm" />
            <span
              className={cn(
                "truncate text-sm font-medium",
                currentUserId === playerA.id && "text-primary",
              )}
            >
              {playerA.display_name}
            </span>
          </div>

          {/* Score or VS */}
          <div className="shrink-0 text-center">
            {result ? (
              <span className="tabular inline-flex items-center gap-1 rounded-md border bg-surface-2 px-2.5 py-1 text-sm font-semibold">
                <span>{result.score_a}</span>
                <span className="text-muted-foreground">–</span>
                <span>{result.score_b}</span>
              </span>
            ) : (
              <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                vs
              </span>
            )}
          </div>

          {/* Player B (Away) */}
          <div className="flex min-w-0 items-center justify-end gap-2 text-right">
            <span
              className={cn(
                "truncate text-sm font-medium",
                currentUserId === playerB.id && "text-primary",
              )}
            >
              {playerB.display_name}
            </span>
            <UserAvatar name={playerB.display_name} src={playerB.avatar_url} size="sm" />
          </div>
        </div>

        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
      </div>

      {match.scheduled_at && (
        <p className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="size-3.5" />
          <span className="tabular">{formatMatchDateTime(match.scheduled_at)}</span>
        </p>
      )}
    </Link>
  );
}
