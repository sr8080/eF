"use client";

import Link from "next/link";
import { useTransition } from "react";
import { LogOut, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/user/user-avatar";
import { logout } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

export type MenuProfile = {
  displayName: string;
  username: string;
  avatarUrl: string | null;
};

export function UserMenu({ profile, showName = false }: { profile: MenuProfile; showName?: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-3 rounded-lg text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
          showName ? "w-full p-2 hover:bg-sidebar-accent/60" : "rounded-full p-0.5",
        )}
        aria-label="Account menu"
      >
        <UserAvatar name={profile.displayName} src={profile.avatarUrl} />
        {showName && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{profile.displayName}</span>
            <span className="block truncate text-xs text-muted-foreground">@{profile.username}</span>
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={showName ? "start" : "end"} side={showName ? "top" : "bottom"} className="w-56">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate font-medium text-foreground">{profile.displayName}</span>
          <span className="block truncate text-xs text-muted-foreground">@{profile.username}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          disabled={pending}
          onSelect={(e) => {
            e.preventDefault();
            startTransition(() => logout());
          }}
        >
          <LogOut /> {pending ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
