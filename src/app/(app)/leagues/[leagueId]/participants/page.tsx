import type { Metadata } from "next";
import { Suspense } from "react";
import { getLeagueMembers, requireLeagueContext } from "@/lib/leagues";
import { InvitePanel } from "@/components/leagues/invite-panel";
import { ParticipantsManager } from "@/components/leagues/participants-manager";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Participants" };

export default function LeagueParticipantsPage({
  params,
}: PageProps<"/leagues/[leagueId]/participants">) {
  return (
    <Suspense fallback={<ParticipantsSkeleton />}>
      <LeagueParticipants params={params} />
    </Suspense>
  );
}

async function LeagueParticipants({
  params,
}: {
  params: PageProps<"/leagues/[leagueId]/participants">["params"];
}) {
  const { leagueId } = await params;
  const ctx = await requireLeagueContext(leagueId);
  const members = await getLeagueMembers(leagueId);
  const isManager = ctx.role === "owner" || ctx.role === "admin";

  return (
    <div className="space-y-6">
      {isManager && (
        <InvitePanel
          leagueId={ctx.league.id}
          leagueName={ctx.league.name}
          initialCode={ctx.league.invite_code}
          canManage={isManager}
          isArchived={ctx.league.is_archived}
        />
      )}

      <section aria-labelledby="participants-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="participants-heading" className="font-semibold">
            All participants (<span className="tabular">{members.length}</span>)
          </h2>
        </div>

        <ParticipantsManager
          leagueId={ctx.league.id}
          currentUserId={ctx.user.id}
          currentUserRole={ctx.role}
          isArchived={ctx.league.is_archived}
          members={members}
        />
      </section>
    </div>
  );
}

function ParticipantsSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-36 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
