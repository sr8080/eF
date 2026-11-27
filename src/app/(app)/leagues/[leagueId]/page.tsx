import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, CalendarDays, Swords } from "lucide-react";
import { getLeagueMembers, requireLeagueContext } from "@/lib/leagues";
import { getLeagueMatches } from "@/lib/matches";
import { getLeagueSeasons } from "@/lib/seasons";
import { InvitePanel } from "@/components/leagues/invite-panel";
import { RoleBadge, formatShortDate } from "@/components/leagues/league-badges";
import { MatchCard } from "@/components/matches/match-card";
import { SeasonStatusBadge } from "@/components/seasons/season-badges";
import { UserAvatar } from "@/components/user/user-avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "League Overview" };

export default function LeagueOverviewPage({
  params,
}: PageProps<"/leagues/[leagueId]">) {
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <LeagueOverview params={params} />
    </Suspense>
  );
}

async function LeagueOverview({
  params,
}: {
  params: PageProps<"/leagues/[leagueId]">["params"];
}) {
  const { leagueId } = await params;
  const ctx = await requireLeagueContext(leagueId);
  const [members, seasons, matches] = await Promise.all([
    getLeagueMembers(leagueId),
    getLeagueSeasons(leagueId),
    getLeagueMatches(leagueId),
  ]);

  const { league, role, memberCount } = ctx;
  const isManager = role === "owner" || role === "admin";
  const previewMembers = members.slice(0, 6);
  const activeSeason = seasons.find((s) => s.season.status === "active") ?? seasons[0] ?? null;
  const upcomingFixtures = matches
    .filter((m) => m.displayStatus !== "cancelled" && m.displayStatus !== "confirmed")
    .slice(0, 3);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {league.description && (
          <section className="rounded-xl border bg-card p-4 sm:p-5" aria-labelledby="about-heading">
            <h2 id="about-heading" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              About
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
              {league.description}
            </p>
          </section>
        )}

        <section className="rounded-xl border bg-card p-4 sm:p-5" aria-labelledby="season-summary-heading">
          <div className="flex items-center justify-between gap-2">
            <h2 id="season-summary-heading" className="font-semibold">
              Current season
            </h2>
            <Link
              href={`/leagues/${league.id}/seasons`}
              className="text-xs font-medium text-info hover:underline"
            >
              Manage seasons ({seasons.length})
            </Link>
          </div>

          {activeSeason ? (
            <div className="mt-3 flex flex-col gap-3 rounded-lg border bg-surface-2 p-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="tabular text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    #{activeSeason.season.number}
                  </span>
                  <span className="font-semibold">{activeSeason.season.name}</span>
                  <SeasonStatusBadge status={activeSeason.season.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className="tabular">{activeSeason.participants.length}</span>{" "}
                  {activeSeason.participants.length === 1 ? "player" : "players"}
                  {activeSeason.season.started_at && (
                    <> · Started {formatShortDate(activeSeason.season.started_at)}</>
                  )}
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="min-h-10 sm:min-h-8">
                <Link href={`/leagues/${league.id}/seasons`}>
                  Open seasons <ArrowRight />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="mt-3 flex flex-col items-start justify-between gap-3 rounded-lg border border-dashed bg-surface-2/60 p-3.5 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <CalendarDays className="size-4 shrink-0" />
                <span>No season created yet.</span>
              </div>
              <Button asChild variant="secondary" size="sm" className="min-h-10 sm:min-h-8">
                <Link href={`/leagues/${league.id}/seasons`}>
                  {isManager ? "Create season" : "View seasons"}
                </Link>
              </Button>
            </div>
          )}
        </section>

        <InvitePanel
          leagueId={league.id}
          leagueName={league.name}
          initialCode={league.invite_code}
          canManage={isManager}
          isArchived={league.is_archived}
        />

        <section className="rounded-xl border bg-card p-4 sm:p-5" aria-labelledby="fixtures-summary-heading">
          <div className="flex items-center justify-between gap-2">
            <h2 id="fixtures-summary-heading" className="font-semibold">
              Upcoming fixtures
            </h2>
            <Link
              href={`/leagues/${league.id}/fixtures`}
              className="text-xs font-medium text-info hover:underline"
            >
              View all ({matches.length})
            </Link>
          </div>

          {upcomingFixtures.length > 0 ? (
            <div className="mt-3 space-y-2.5">
              {upcomingFixtures.map((item) => (
                <MatchCard key={item.match.id} item={item} currentUserId={ctx.user.id} />
              ))}
            </div>
          ) : (
            <div className="mt-3 flex flex-col items-start justify-between gap-3 rounded-lg border border-dashed bg-surface-2/60 p-3.5 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <Swords className="size-4 shrink-0" />
                <span>No upcoming fixtures yet.</span>
              </div>
              <Button asChild variant="secondary" size="sm" className="min-h-10 sm:min-h-8">
                <Link href={`/leagues/${league.id}/fixtures`}>
                  {isManager ? "Schedule fixtures" : "View fixtures"}
                </Link>
              </Button>
            </div>
          )}
        </section>

        <section className="rounded-xl border bg-card p-4 sm:p-5" aria-labelledby="scoring-heading">
          <h2 id="scoring-heading" className="font-semibold">
            Scoring rules
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Points awarded per confirmed match.
          </p>
          <dl className="mt-4 grid grid-cols-3 gap-2.5 text-center">
            <div className="rounded-lg border bg-surface-2 p-3">
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">Win</dt>
              <dd className="tabular mt-1 text-xl font-semibold text-win">{league.points_win}</dd>
            </div>
            <div className="rounded-lg border bg-surface-2 p-3">
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">Draw</dt>
              <dd className="tabular mt-1 text-xl font-semibold text-draw">{league.points_draw}</dd>
            </div>
            <div className="rounded-lg border bg-surface-2 p-3">
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">Loss</dt>
              <dd className="tabular mt-1 text-xl font-semibold text-loss">{league.points_loss}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="h-fit rounded-xl border bg-card p-4 sm:p-5" aria-labelledby="members-preview-heading">
        <div className="flex items-center justify-between gap-2">
          <h2 id="members-preview-heading" className="font-semibold">
            Members (<span className="tabular">{memberCount}</span>)
          </h2>
          <Link
            href={`/leagues/${league.id}/participants`}
            className="text-xs font-medium text-info hover:underline"
          >
            View all
          </Link>
        </div>

        <ul className="mt-4 space-y-3">
          {previewMembers.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2.5">
              <Link
                href={`/players/${m.userId}`}
                className="group flex min-w-0 items-center gap-2.5"
              >
                <UserAvatar name={m.profile.display_name} src={m.profile.avatar_url} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium group-hover:text-primary">
                    {m.profile.display_name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">@{m.profile.username}</p>
                </div>
              </Link>
              <RoleBadge role={m.role} />
            </li>
          ))}
        </ul>

        <Button asChild variant="outline" className="mt-4 min-h-11 w-full sm:min-h-9">
          <Link href={`/leagues/${league.id}/participants`}>
            Manage participants <ArrowRight />
          </Link>
        </Button>
      </section>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-3" aria-busy="true">
      <div className="space-y-4 lg:col-span-2">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-44 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
