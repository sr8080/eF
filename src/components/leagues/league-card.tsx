import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import { ArchivedBadge, LeagueLogo, RoleBadge } from "./league-badges";
import type { UserLeagueSummary } from "@/lib/leagues";
import { cn } from "@/lib/utils";

export function LeagueCard({ item }: { item: UserLeagueSummary }) {
  const { league, role, memberCount } = item;

  return (
    <Link
      href={`/leagues/${league.id}`}
      className={cn(
        "group flex items-center gap-3.5 rounded-xl border bg-card p-3.5 transition-colors hover:border-primary/40 hover:bg-surface-2 sm:p-4",
        league.is_archived && "opacity-75",
      )}
    >
      <LeagueLogo name={league.name} src={league.logo_url} size="default" />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate font-semibold text-foreground group-hover:text-primary">
            {league.name}
          </h3>
          <RoleBadge role={role} />
          {league.is_archived && <ArchivedBadge />}
        </div>

        {league.description ? (
          <p className="mt-1 truncate text-sm text-muted-foreground">{league.description}</p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground/70">No description</p>
        )}

        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="size-3.5" />
          <span className="tabular">{memberCount}</span>
          <span>{memberCount === 1 ? "member" : "members"}</span>
        </p>
      </div>

      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
    </Link>
  );
}
