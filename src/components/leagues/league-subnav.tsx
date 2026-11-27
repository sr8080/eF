"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, LayoutDashboard, Settings, Swords, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export type LeagueTab = {
  segment: string;
  label: string;
  icon: typeof LayoutDashboard;
  managersOnly?: boolean;
};

// Ready for future Phase 5+ tabs (Standings, Stats, Gallery).
const LEAGUE_TABS: LeagueTab[] = [
  { segment: "", label: "Overview", icon: LayoutDashboard },
  { segment: "/seasons", label: "Seasons", icon: CalendarDays },
  { segment: "/fixtures", label: "Fixtures", icon: Swords },
  { segment: "/participants", label: "Participants", icon: Users },
  { segment: "/settings", label: "Settings", icon: Settings, managersOnly: true },
];

export function LeagueSubNav({
  leagueId,
  isManager,
  activePath,
}: {
  leagueId: string;
  isManager: boolean;
  activePath?: string;
}) {
  const base = `/leagues/${leagueId}`;
  const visibleTabs = LEAGUE_TABS.filter((t) => !t.managersOnly || isManager);

  return (
    <nav
      aria-label="League sections"
      className="mb-6 -mx-4 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0"
    >
      <ul className="flex min-w-max gap-1">
        {visibleTabs.map((tab) => {
          const href = `${base}${tab.segment}`;
          const active = activePath
            ? tab.segment === ""
              ? activePath === base
              : activePath === href || activePath.startsWith(`${href}/`)
            : false;
          const Icon = tab.icon;

          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 border-b-2 px-3.5 text-sm font-medium whitespace-nowrap transition-colors",
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className={cn("size-4", active && "text-primary")} />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function ActiveLeagueSubNav({
  leagueId,
  isManager,
}: {
  leagueId: string;
  isManager: boolean;
}) {
  const pathname = usePathname();
  return <LeagueSubNav leagueId={leagueId} isManager={isManager} activePath={pathname} />;
}
