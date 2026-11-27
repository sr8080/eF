import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, CalendarDays, Info } from "lucide-react";
import { requireLeagueContext } from "@/lib/leagues";
import { getMatchDetail } from "@/lib/matches";
import { formatMatchDateTime } from "@/lib/match-status";
import { MatchStatusBadge } from "@/components/matches/match-badges";
import { MatchDetailControls } from "@/components/matches/match-detail-controls";
import { UserAvatar } from "@/components/user/user-avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Match" };

export default function MatchDetailPage({
  params,
}: PageProps<"/leagues/[leagueId]/matches/[matchId]">) {
  return (
    <Suspense fallback={<MatchDetailSkeleton />}>
      <MatchDetail params={params} />
    </Suspense>
  );
}

async function MatchDetail({
  params,
}: {
  params: PageProps<"/leagues/[leagueId]/matches/[matchId]">["params"];
}) {
  const { leagueId, matchId } = await params;
  const ctx = await requireLeagueContext(leagueId);
  const detail = await getMatchDetail(leagueId, matchId);
  if (!detail) notFound();

  const { match, displayStatus, playerA, playerB, result, season } = detail;
  const isManager = ctx.role === "owner" || ctx.role === "admin";
  const canManageFixture =
    isManager &&
    !ctx.league.is_archived &&
    match.status === "scheduled" &&
    (season.status === "draft" || season.status === "active");

  return (
    <div className="space-y-4">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link href={`/leagues/${ctx.league.id}/fixtures`}>
            <ArrowLeft /> Back to fixtures
          </Link>
        </Button>
      </div>

      <section className="rounded-xl border bg-card p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            #{season.number} {season.name}
            {match.round !== null && (
              <>
                {" "}
                · <span className="tabular font-medium">Round {match.round}</span>
              </>
            )}
          </span>
          <MatchStatusBadge status={displayStatus} />
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-2">
          <Link
            href={`/players/${playerA.id}`}
            className="group flex flex-col items-center gap-2 text-center"
          >
            <UserAvatar name={playerA.display_name} src={playerA.avatar_url} size="lg" />
            <div>
              <p className="font-semibold group-hover:text-primary">{playerA.display_name}</p>
              <p className="text-xs text-muted-foreground">@{playerA.username}</p>
            </div>
          </Link>

          <div className="text-center">
            {result ? (
              <div className="tabular flex items-center gap-2 rounded-xl border bg-surface-2 px-4 py-2 text-3xl font-semibold">
                <span>{result.score_a}</span>
                <span className="text-muted-foreground">–</span>
                <span>{result.score_b}</span>
              </div>
            ) : (
              <span className="rounded-lg bg-secondary px-3 py-1.5 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                vs
              </span>
            )}
          </div>

          <Link
            href={`/players/${playerB.id}`}
            className="group flex flex-col items-center gap-2 text-center"
          >
            <UserAvatar name={playerB.display_name} src={playerB.avatar_url} size="lg" />
            <div>
              <p className="font-semibold group-hover:text-primary">{playerB.display_name}</p>
              <p className="text-xs text-muted-foreground">@{playerB.username}</p>
            </div>
          </Link>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-4 border-t pt-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5" />
            {match.scheduled_at ? (
              <span className="tabular">{formatMatchDateTime(match.scheduled_at)}</span>
            ) : (
              "Kickoff not scheduled yet"
            )}
          </span>
        </div>
      </section>

      {match.status !== "confirmed" && match.status !== "cancelled" && (
        <div className="flex items-start gap-2.5 rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-info" />
          <p>
            Score submission, screenshot proof, and opponent confirmation arrive in Phase 5.
          </p>
        </div>
      )}

      {canManageFixture && (
        <MatchDetailControls
          leagueId={ctx.league.id}
          matchId={match.id}
          initialRound={match.round}
          initialScheduledAt={match.scheduled_at}
        />
      )}
    </div>
  );
}

function MatchDetailSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-52 rounded-xl" />
      <Skeleton className="h-36 rounded-xl" />
    </div>
  );
}
