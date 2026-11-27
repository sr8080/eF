import type { Metadata } from "next";
import { Suspense } from "react";
import { requireLeagueContext } from "@/lib/leagues";
import { getLeagueMatches } from "@/lib/matches";
import { getLeagueSeasons } from "@/lib/seasons";
import { FormAlert } from "@/components/forms/form-fields";
import { FixturesManager } from "@/components/matches/fixtures-manager";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Fixtures" };

export default function LeagueFixturesPage({
  params,
}: PageProps<"/leagues/[leagueId]/fixtures">) {
  return (
    <Suspense fallback={<FixturesSkeleton />}>
      <LeagueFixtures params={params} />
    </Suspense>
  );
}

async function LeagueFixtures({
  params,
}: {
  params: PageProps<"/leagues/[leagueId]/fixtures">["params"];
}) {
  const { leagueId } = await params;
  const ctx = await requireLeagueContext(leagueId);
  const [seasons, matches] = await Promise.all([
    getLeagueSeasons(leagueId),
    getLeagueMatches(leagueId),
  ]);

  const isManager = ctx.role === "owner" || ctx.role === "admin";
  const initialSeason =
    seasons.find((s) => s.season.status === "active")?.season.id ??
    seasons[0]?.season.id ??
    "";

  return (
    <div className="space-y-4">
      {ctx.league.is_archived && (
        <FormAlert>
          This league is archived and read-only. Fixtures cannot be generated or modified.
        </FormAlert>
      )}

      <FixturesManager
        leagueId={ctx.league.id}
        currentUserId={ctx.user.id}
        isManager={isManager}
        isLeagueArchived={ctx.league.is_archived}
        seasons={seasons}
        matches={matches}
        initialSeasonId={initialSeason}
      />
    </div>
  );
}

function FixturesSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-16 rounded-xl" />
      <div className="grid gap-3 md:grid-cols-2">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
    </div>
  );
}
