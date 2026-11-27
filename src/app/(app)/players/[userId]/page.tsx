import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Award, CalendarDays, Settings, Trophy } from "lucide-react";
import { getPlayerProfileData } from "@/lib/seasons";
import { EmptyState, PageContainer } from "@/components/layout/page-header";
import {
  ArchivedBadge,
  LeagueLogo,
  RoleBadge,
  formatShortDate,
} from "@/components/leagues/league-badges";
import { SeasonStatusBadge } from "@/components/seasons/season-badges";
import { UserAvatar } from "@/components/user/user-avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Player Profile" };

const ACHIEVEMENT_LABELS: Record<string, string> = {
  champion: "Season Champion",
  golden_boot: "Golden Boot",
  best_defense: "Best Defense",
  unbeaten_season: "Unbeaten Season",
  win_streak: "Win Streak",
  top_scorer: "Top Scorer",
};

export default function PlayerProfilePage({
  params,
}: PageProps<"/players/[userId]">) {
  return (
    <PageContainer>
      <Suspense fallback={<PlayerSkeleton />}>
        <PlayerProfile params={params} />
      </Suspense>
    </PageContainer>
  );
}

async function PlayerProfile({
  params,
}: {
  params: PageProps<"/players/[userId]">["params"];
}) {
  const { userId } = await params;
  const data = await getPlayerProfileData(userId);
  if (!data) notFound();

  const { profile, isSelf, sharedLeagues, seasons, achievements } = data;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <UserAvatar
            name={profile.display_name}
            src={profile.avatar_url}
            className="size-16 text-lg"
          />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold md:text-3xl">
              {profile.display_name}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              @{profile.username} · Member since{" "}
              <span className="tabular">{formatShortDate(profile.created_at)}</span>
            </p>
          </div>
        </div>

        {isSelf && (
          <Button asChild variant="outline" className="min-h-11 sm:min-h-9">
            <Link href="/settings">
              <Settings /> Edit profile
            </Link>
          </Button>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-3 lg:col-span-2" aria-labelledby="shared-leagues-heading">
          <h2
            id="shared-leagues-heading"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {isSelf ? "Your leagues" : "Shared leagues"} (
            <span className="tabular">{sharedLeagues.length}</span>)
          </h2>

          {sharedLeagues.length === 0 ? (
            <EmptyState
              icon={<Trophy />}
              title={isSelf ? "Not in any leagues yet" : "No shared leagues"}
              description={
                isSelf
                  ? "Create a league or join with an invite code to start competing."
                  : "You and this player aren’t in any of the same leagues yet."
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {sharedLeagues.map(({ league, playerRole, joinedAt }) => (
                <Link
                  key={league.id}
                  href={`/leagues/${league.id}`}
                  className="flex items-center gap-3 rounded-xl border bg-card p-3.5 transition-colors hover:border-primary/40 hover:bg-surface-2"
                >
                  <LeagueLogo name={league.name} src={league.logo_url} size="default" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate font-semibold">{league.name}</span>
                      <RoleBadge role={playerRole} />
                      {league.is_archived && <ArchivedBadge />}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Joined <span className="tabular">{formatShortDate(joinedAt)}</span>
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="pt-3">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Seasons (<span className="tabular">{seasons.length}</span>)
            </h2>

            {seasons.length === 0 ? (
              <EmptyState
                icon={<CalendarDays />}
                title="No seasons recorded"
                description="Seasons this player participates in across shared leagues will appear here."
              />
            ) : (
              <div className="divide-y rounded-xl border bg-card">
                {seasons.map((s) => (
                  <Link
                    key={s.seasonId}
                    href={`/leagues/${s.leagueId}/seasons`}
                    className="flex items-center justify-between gap-3 p-3.5 transition-colors hover:bg-surface-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        <span className="tabular mr-1.5 text-xs text-muted-foreground">
                          #{s.seasonNumber}
                        </span>
                        {s.seasonName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{s.leagueName}</p>
                    </div>
                    <SeasonStatusBadge status={s.status} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="space-y-3" aria-labelledby="achievements-heading">
          <h2
            id="achievements-heading"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Achievements (<span className="tabular">{achievements.length}</span>)
          </h2>

          {achievements.length === 0 ? (
            <EmptyState
              icon={<Award />}
              title="No achievements yet"
              description="Titles and awards earned across shared leagues will show up here once seasons wrap up."
            />
          ) : (
            <div className="space-y-2.5">
              {achievements.map((entry) => (
                <div
                  key={entry.achievement.id}
                  className="flex items-center gap-3 rounded-xl border bg-card p-3.5"
                >
                  <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                    <Award className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium">
                      {ACHIEVEMENT_LABELS[entry.achievement.kind] ?? entry.achievement.kind}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {entry.leagueName}
                      {entry.seasonName ? ` · #${entry.seasonNumber} ${entry.seasonName}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function PlayerSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <Skeleton className="h-24 rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-56 rounded-xl lg:col-span-2" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    </div>
  );
}
