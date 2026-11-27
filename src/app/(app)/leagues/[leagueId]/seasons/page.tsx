import type { Metadata } from "next";
import { Suspense } from "react";
import { getLeagueMembers, requireLeagueContext } from "@/lib/leagues";
import { getLeagueSeasons } from "@/lib/seasons";
import { FormAlert } from "@/components/forms/form-fields";
import { SeasonsManager } from "@/components/seasons/seasons-manager";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Seasons" };

export default function LeagueSeasonsPage({
  params,
}: PageProps<"/leagues/[leagueId]/seasons">) {
  return (
    <Suspense fallback={<SeasonsSkeleton />}>
      <LeagueSeasons params={params} />
    </Suspense>
  );
}

async function LeagueSeasons({
  params,
}: {
  params: PageProps<"/leagues/[leagueId]/seasons">["params"];
}) {
  const { leagueId } = await params;
  const ctx = await requireLeagueContext(leagueId);
  const [members, seasons] = await Promise.all([
    getLeagueMembers(leagueId),
    getLeagueSeasons(leagueId),
  ]);

  const isManager = ctx.role === "owner" || ctx.role === "admin";

  return (
    <div className="space-y-4">
      {ctx.league.is_archived && (
        <FormAlert>
          This league is archived and read-only. Seasons cannot be created or modified.
        </FormAlert>
      )}

      <SeasonsManager
        leagueId={ctx.league.id}
        isManager={isManager}
        isArchived={ctx.league.is_archived}
        leagueMembers={members}
        seasons={seasons}
      />
    </div>
  );
}

function SeasonsSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-56 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
    </div>
  );
}
