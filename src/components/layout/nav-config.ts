import { House, Settings, Swords, Trophy, type LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/**
 * Primary navigation. Items are added as each feature ships, so the nav never
 * links to a page that doesn't exist yet. Planned: Notifications (with unread badge).
 */
export const primaryNav: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/leagues", label: "Leagues", icon: Trophy },
  { href: "/matches", label: "Matches", icon: Swords },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
