import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Camera, CircleCheck, Link2, Plus, Swords, Trophy, UserRound } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getUserLeagues } from "@/lib/leagues";
import { getUserMatches } from "@/lib/matches";
import { EmptyState, PageContainer, PageHeader } from "@/components/layout/page-header";
import { FormAlert } from "@/components/forms/form-fields";
import { LeagueCard } from "@/components/leagues/league-card";
import { MatchCard } from "@/components/matches/match-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/user/user-avatar";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <PageContainer>
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  );
}

async function Dashboard({ searchParams }: { searchParams: PageProps<"/dashboard">["searchParams"] }) {
  const [user, leagues, matches, params] = await Promise.all([
    requireUser("/dashboard"),
    getUserLeagues(),
    getUserMatches(),
    searchParams,
  ]);
  const { profile } = user;
  const firstName = profile.display_name.split(" ")[0];
  const visibleLeagues = leagues.slice(0, 5);
  const openMatches = matches
    .filter((m) => m.displayStatus !== "confirmed" && m.displayStatus !== "cancelled")
    .slice(0, 4);

  const checklist = [
    { done: true, label: "Create your account", href: null, icon: UserRound },
    { done: leagues.length > 0, label: "Create or join a league", href: "/leagues", icon: Trophy },
    { done: Boolean(profile.avatar_url), label: "Add a profile picture", href: "/settings", icon: Camera },
  ];

  return (
    <>
      {params.passwordUpdated && (
        <div className="mb-5">
          <FormAlert variant="success">Your password has been updated.</FormAlert>
        </div>
      )}

      <PageHeader
        eyebrow="Dashboard"
        title={`Welcome back, ${firstName}`}
        description="Your leagues, fixtures and results in one place."
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

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section aria-labelledby="leagues-heading">
            <div className="mb-3 flex items-center justify-between">
              <h2
                id="leagues-heading"
                className="text-sm font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Your leagues
              </h2>
              {leagues.length > 0 && (
                <Link href="/leagues" className="text-xs font-medium text-info hover:underline">
                  View all ({leagues.length})
                </Link>
              )}
            </div>

            {leagues.length === 0 ? (
              <EmptyState
                icon={<Trophy />}
                title="You’re not in a league yet"
                description="Create a league for your crew or join one using an invite code."
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button asChild>
                      <Link href="/leagues/new">Create league</Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/join">Join with code</Link>
                    </Button>
                  </div>
                }
              />
            ) : (
              <div className="space-y-3">
                {visibleLeagues.map((item) => (
                  <LeagueCard key={item.league.id} item={item} />
                ))}
              </div>
            )}
          </section>

          <section aria-labelledby="upcoming-matches-heading">
            <div className="mb-3 flex items-center justify-between">
              <h2
                id="upcoming-matches-heading"
                className="text-sm font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Upcoming matches
              </h2>
              {matches.length > 0 && (
                <Link href="/matches" className="text-xs font-medium text-info hover:underline">
                  View all ({matches.length})
                </Link>
              )}
            </div>

            {openMatches.length === 0 ? (
              <EmptyState
                icon={<Swords />}
                title="No upcoming matches"
                description="When fixtures are scheduled in your leagues, your upcoming matches will appear here."
              />
            ) : (
              <div className="space-y-3">
                {openMatches.map((item) => (
                  <MatchCard key={item.match.id} item={item} showLeague currentUserId={user.id} />
                ))}
              </div>
            )}
          </section>
        </div>

        <section aria-labelledby="profile-heading" className="h-fit rounded-xl border bg-card p-4">
          <h2 id="profile-heading" className="sr-only">
            Your profile
          </h2>
          <div className="flex items-center gap-3">
            <UserAvatar name={profile.display_name} src={profile.avatar_url} size="lg" />
            <div className="min-w-0">
              <p className="truncate font-semibold">{profile.display_name}</p>
              <p className="truncate text-sm text-muted-foreground">@{profile.username}</p>
            </div>
          </div>

          <ul className="mt-4 space-y-2">
            {checklist.map((item) => (
              <li key={item.label} className="flex items-center gap-2.5 text-sm">
                {item.done ? (
                  <CircleCheck className="size-4 text-primary" />
                ) : (
                  <item.icon className="size-4 text-muted-foreground" />
                )}
                {item.href && !item.done ? (
                  <Link href={item.href} className="text-info hover:underline">
                    {item.label}
                  </Link>
                ) : (
                  <span className={item.done ? "text-muted-foreground line-through" : ""}>
                    {item.label}
                  </span>
                )}
              </li>
            ))}
          </ul>

          <Button asChild variant="outline" className="mt-4 w-full">
            <Link href="/settings">Edit profile</Link>
          </Button>
        </section>
      </div>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard">
      <Skeleton className="mb-2 h-3 w-24" />
      <Skeleton className="mb-8 h-8 w-64" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-48 lg:col-span-2" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}
