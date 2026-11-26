import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight } from "lucide-react";
import { getLeagueMembers, requireLeagueContext } from "@/lib/leagues";
import { InvitePanel } from "@/components/leagues/invite-panel";
import { RoleBadge } from "@/components/leagues/league-badges";
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
  const members = await getLeagueMembers(leagueId);

  const { league, role, memberCount } = ctx;
  const isManager = role === "owner" || role === "admin";
  const previewMembers = members.slice(0, 6);

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

        <InvitePanel
          leagueId={league.id}
          leagueName={league.name}
          initialCode={league.invite_code}
          canManage={isManager}
          isArchived={league.is_archived}
        />

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
              <div className="flex min-w-0 items-center gap-2.5">
                <UserAvatar name={m.profile.display_name} src={m.profile.avatar_url} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{m.profile.display_name}</p>
                  <p className="truncate text-xs text-muted-foreground">@{m.profile.username}</p>
                </div>
              </div>
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
        <Skeleton className="h-44 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
