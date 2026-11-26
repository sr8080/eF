import { Archive, Crown, Shield, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { initials } from "@/components/user/user-avatar";
import { cn } from "@/lib/utils";
import type { LeagueRole } from "@/types/database";

export function LeagueLogo({
  name,
  src,
  size = "default",
  className,
}: {
  name: string;
  src?: string | null;
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  return (
    <Avatar
      size={size}
      className={cn(
        "rounded-xl after:rounded-xl",
        size === "lg" && "size-14 text-base",
        size === "default" && "size-11 text-sm",
        size === "sm" && "size-8 text-xs",
        className,
      )}
    >
      {src && <AvatarImage src={src} alt="" className="rounded-xl" />}
      <AvatarFallback className="rounded-xl bg-secondary font-semibold text-primary">
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

const ROLE_META: Record<
  LeagueRole,
  { label: string; icon: typeof Crown; className: string }
> = {
  owner: {
    label: "Owner",
    icon: Crown,
    className: "border-primary/30 bg-primary/15 text-primary",
  },
  admin: {
    label: "Admin",
    icon: Shield,
    className: "border-info/30 bg-info/15 text-info",
  },
  player: {
    label: "Player",
    icon: User,
    className: "border-border bg-secondary text-secondary-foreground",
  },
};

export function RoleBadge({ role }: { role: LeagueRole }) {
  const meta = ROLE_META[role];
  const Icon = meta.icon;
  return (
    <Badge variant="outline" className={cn("gap-1 font-medium", meta.className)}>
      <Icon className="size-3" />
      {meta.label}
    </Badge>
  );
}

export function ArchivedBadge() {
  return (
    <Badge
      variant="outline"
      className="gap-1 border-warning/30 bg-warning/10 font-medium text-warning"
    >
      <Archive className="size-3" />
      Archived
    </Badge>
  );
}

export function formatShortDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}
