import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getLeagueMembers, requireLeagueContext } from "@/lib/leagues";
import { FormAlert } from "@/components/forms/form-fields";
import {
  LeagueDangerZone,
  LeagueLogoUploader,
  LeagueSettingsForm,
} from "@/components/leagues/league-settings-forms";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "League Settings" };

export default function LeagueSettingsPage({
  params,
}: PageProps<"/leagues/[leagueId]/settings">) {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <LeagueSettings params={params} />
    </Suspense>
  );
}

async function LeagueSettings({
  params,
}: {
  params: PageProps<"/leagues/[leagueId]/settings">["params"];
}) {
  const { leagueId } = await params;
  const ctx = await requireLeagueContext(leagueId);

  if (ctx.role !== "owner" && ctx.role !== "admin") {
    notFound();
  }

  const isOwner = ctx.role === "owner";
  const members = isOwner ? await getLeagueMembers(leagueId) : [];

  return (
    <div className="max-w-2xl space-y-4">
      {ctx.league.is_archived && (
        <FormAlert>
          This league is archived and read-only.
          {isOwner ? " Unarchive it below to make changes." : " Ask the owner to unarchive it."}
        </FormAlert>
      )}

      <section className="rounded-xl border bg-card p-4 sm:p-5">
        <div className="mb-4">
          <h2 className="font-semibold">League logo</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Displayed on league cards, headers, and invite previews.
          </p>
        </div>
        <LeagueLogoUploader
          leagueId={ctx.league.id}
          name={ctx.league.name}
          logoUrl={ctx.league.logo_url}
          isArchived={ctx.league.is_archived}
        />
      </section>

      <section className="rounded-xl border bg-card p-4 sm:p-5">
        <div className="mb-4">
          <h2 className="font-semibold">General</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Update the league name and description.
          </p>
        </div>
        <LeagueSettingsForm
          leagueId={ctx.league.id}
          defaults={{
            name: ctx.league.name,
            description: ctx.league.description,
          }}
          isArchived={ctx.league.is_archived}
        />
      </section>

      {isOwner && (
        <section className="rounded-xl border border-destructive/30 bg-card p-4 sm:p-5">
          <div className="mb-4">
            <h2 className="font-semibold text-destructive">Danger zone</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Owner-only actions that change league control or availability.
            </p>
          </div>
          <LeagueDangerZone
            leagueId={ctx.league.id}
            leagueName={ctx.league.name}
            currentUserId={ctx.user.id}
            isArchived={ctx.league.is_archived}
            members={members}
          />
        </section>
      )}
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="max-w-2xl space-y-4" aria-busy="true">
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}
