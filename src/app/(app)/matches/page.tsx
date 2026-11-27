import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Swords } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getUserMatches } from "@/lib/matches";
import { EmptyState, PageContainer, PageHeader } from "@/components/layout/page-header";
import { MatchCard } from "@/components/matches/match-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Matches" };

export default function MyMatchesPage() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Schedule"
        title="My Matches"
        description="Your fixtures across every league you play in."
      />

      <Suspense fallback={<MatchesSkeleton />}>
        <MyMatchesList />
      </Suspense>
    </PageContainer>
  );
}

async function MyMatchesList() {
  const [user, matches] = await Promise.all([requireUser("/matches"), getUserMatches()]);

  if (matches.length === 0) {
    return (
      <EmptyState
        icon={<Swords />}
        title="No matches scheduled yet"
        description="Once a league manager generates fixtures or schedules a match for you, it will show here."
        action={
          <Button asChild className="min-h-11 sm:min-h-9">
            <Link href="/leagues">Browse My Leagues</Link>
          </Button>
        }
      />
    );
  }

  const attention = matches.filter(
    (m) =>
      m.displayStatus === "pending_result" ||
      m.displayStatus === "awaiting_confirmation" ||
      m.displayStatus === "disputed",
  );
  const upcoming = matches.filter((m) => m.displayStatus === "scheduled");
  const past = matches.filter(
    (m) => m.displayStatus === "confirmed" || m.displayStatus === "cancelled",
  );

  const sections = [
    { id: "attention", title: "Action / Pending result", items: attention },
    { id: "upcoming", title: "Upcoming", items: upcoming },
    { id: "past", title: "Completed & Cancelled", items: past },
  ].filter((s) => s.items.length > 0);

  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <section key={section.id} aria-labelledby={`${section.id}-heading`} className="space-y-3">
          <h2
            id={`${section.id}-heading`}
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {section.title} (<span className="tabular">{section.items.length}</span>)
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {section.items.map((item) => (
              <MatchCard
                key={item.match.id}
                item={item}
                showLeague
                currentUserId={user.id}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function MatchesSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2" aria-busy="true">
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />
    </div>
  );
}
