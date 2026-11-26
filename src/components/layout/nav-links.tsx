"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isActive, primaryNav } from "./nav-config";

type Variant = "sidebar" | "bottom";

/**
 * Presentational nav list. Rendered with `activePath` once the pathname is
 * known, and without it as the Suspense fallback (pathname can suspend under
 * dynamic routes with Cache Components).
 */
export function NavList({ variant, activePath }: { variant: Variant; activePath?: string }) {
  return (
    <ul className={cn(variant === "sidebar" ? "space-y-1" : "grid h-16 grid-flow-col auto-cols-fr")}>
      {primaryNav.map((item) => {
        const active = activePath ? isActive(activePath, item.href) : false;
        const Icon = item.icon;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                variant === "sidebar"
                  ? cn(
                      "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium",
                      active
                        ? "bg-sidebar-accent text-foreground shadow-[inset_2px_0_0_var(--primary)]"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-foreground",
                    )
                  : cn(
                      "flex h-full flex-col items-center justify-center gap-1 text-[0.7rem] font-medium",
                      active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                    ),
              )}
            >
              <Icon className={cn(variant === "sidebar" ? "size-[18px]" : "size-5", active && "text-primary")} />
              <span>{item.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function ActiveNavList({ variant }: { variant: Variant }) {
  const pathname = usePathname();
  return <NavList variant={variant} activePath={pathname} />;
}
