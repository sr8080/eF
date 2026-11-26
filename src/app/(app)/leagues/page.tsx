import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Link2, Plus, Trophy } from "lucide-react";
import { getUserLeagues } from "@/lib/leagues";
import { EmptyState, PageContainer, PageHeader } from "@/components/layout/page-header";
import { LeagueCard } from "@/components/leagues/league-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Leagues" };

export default function LeaguesPage() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Compete"
        title="My Leagues"
        description="Leagues you organize or play in."
        actions={
          <>
            <Button asChild variant="outline" className="min-h-11 sm:min-h-9">
              <Link href="/join">
                <Link2 /> Join with code
              </Link>
            </Button>
            <Button asChild className="min-h-11 sm:min-h-9">
              <Link href="/leagues/new">
                <Plus /> Create league
              </Link>
            </Button>
          </>
        }
      />

      <Suspense fallback={<LeaguesSkeleton />}>
        <LeaguesList />
      </Suspense>
    </PageContainer>
  );
}

async function LeaguesList() {
  const leagues = await getUserLeagues();

  if (leagues.length === 0) {
    return (
      <EmptyState
        icon={<Trophy />}
        title="No leagues yet"
        description="Start a private eFootball league for your friends or join one with an invite code."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild className="min-h-11 sm:min-h-9">
              <Link href="/leagues/new">Create league</Link>
            </Button>
            <Button asChild variant="outline" className="min-h-11 sm:min-h-9">
              <Link href="/join">Join with code</Link>
            </Button>
          </div>
        }
      />
    );
  }

  const active = leagues.filter((l) => !l.league.is_archived);
  const archived = leagues.filter((l) => l.league.is_archived);

  return (
    <div className="space-y-8">
      {active.length > 0 && (
        <section aria-labelledby="active-leagues-heading" className="space-y-3">
          <h2
            id="active-leagues-heading"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Active (<span className="tabular">{active.length}</span>)
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {active.map((item) => (
              <LeagueCard key={item.league.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {archived.length > 0 && (
        <section aria-labelledby="archived-leagues-heading" className="space-y-3">
          <h2
            id="archived-leagues-heading"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Archived (<span className="tabular">{archived.length}</span>)
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {archived.map((item) => (
              <LeagueCard key={item.league.id} item={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function LeaguesSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2" aria-busy="true" aria-label="Loading leagues">
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-24 rounded-xl" />
    </div>
  );
}
