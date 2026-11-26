import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { getLeagueContext } from "@/lib/leagues";
import { PageContainer } from "@/components/layout/page-header";
import { ArchivedBadge, LeagueLogo, RoleBadge } from "@/components/leagues/league-badges";
import { ActiveLeagueSubNav, LeagueSubNav } from "@/components/leagues/league-subnav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function LeagueLayout({
  children,
  params,
}: LayoutProps<"/leagues/[leagueId]">) {
  return (
    <PageContainer>
      <Suspense fallback={<LeagueShellSkeleton />}>
        <LeagueShellHeader params={params} />
      </Suspense>
      {children}
    </PageContainer>
  );
}

async function LeagueShellHeader({
  params,
}: {
  params: LayoutProps<"/leagues/[leagueId]">["params"];
}) {
  const { leagueId } = await params;
  const ctx = await getLeagueContext(leagueId);
  if (!ctx) return null;

  const { league, role, memberCount } = ctx;
  const isManager = role === "owner" || role === "admin";

  return (
    <header className="mb-2">
      <div className="mb-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link href="/leagues">
            <ArrowLeft /> All leagues
          </Link>
        </Button>
      </div>

      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3.5">
          <LeagueLogo name={league.name} src={league.logo_url} size="lg" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold md:text-3xl">{league.name}</h1>
              <RoleBadge role={role} />
              {league.is_archived && <ArchivedBadge />}
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="size-3.5" />
              <span className="tabular">{memberCount}</span>
              <span>{memberCount === 1 ? "member" : "members"}</span>
            </p>
          </div>
        </div>
      </div>

      <Suspense fallback={<LeagueSubNav leagueId={league.id} isManager={isManager} />}>
        <ActiveLeagueSubNav leagueId={league.id} isManager={isManager} />
      </Suspense>
    </header>
  );
}

function LeagueShellSkeleton() {
  return (
    <div className="mb-6" aria-busy="true">
      <Skeleton className="mb-4 h-7 w-28" />
      <div className="mb-5 flex items-center gap-3.5">
        <Skeleton className="size-14 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
      <Skeleton className="h-11 w-full" />
    </div>
  );
}
