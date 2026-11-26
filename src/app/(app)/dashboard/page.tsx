import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Camera, CircleCheck, Trophy, UserRound } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { EmptyState, PageContainer, PageHeader } from "@/components/layout/page-header";
import { FormAlert } from "@/components/forms/form-fields";
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
  const [{ profile }, params] = await Promise.all([requireUser("/dashboard"), searchParams]);
  const firstName = profile.display_name.split(" ")[0];

  const checklist = [
    { done: true, label: "Create your account", href: null, icon: UserRound },
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
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="lg:col-span-2" aria-labelledby="leagues-heading">
          <h2 id="leagues-heading" className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Your leagues
          </h2>
          <EmptyState
            icon={<Trophy />}
            title="You’re not in a league yet"
            description="Once leagues are set up, the ones you play in will show here with your position, upcoming fixtures and recent results."
          />
        </section>

        <section aria-labelledby="profile-heading" className="rounded-xl border bg-card p-4">
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
                  <span className={item.done ? "text-muted-foreground line-through" : ""}>{item.label}</span>
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
