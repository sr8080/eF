import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { ActiveNavList, NavList } from "@/components/layout/nav-links";
import { UserMenu } from "@/components/layout/user-menu";
import { requireUser } from "@/lib/auth";

/**
 * Authenticated shell. The chrome (logo, nav) is static and prerenders; the
 * user menu reads the session, so it streams in behind its own Suspense boundary.
 * Each page is responsible for its own auth check via requireUser().
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh">
      {/* Desktop / tablet sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="px-4 py-5">
          <Logo href="/dashboard" />
        </div>
        <nav aria-label="Main" className="flex-1 px-3">
          <Suspense fallback={<NavList variant="sidebar" />}>
            <ActiveNavList variant="sidebar" />
          </Suspense>
        </nav>
        <div className="border-t border-sidebar-border p-2">
          <Suspense fallback={<UserMenuSkeleton wide />}>
            <CurrentUserMenu wide />
          </Suspense>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/85 px-4 backdrop-blur-md md:hidden">
          <Logo href="/dashboard" />
          <Suspense fallback={<UserMenuSkeleton />}>
            <CurrentUserMenu />
          </Suspense>
        </header>

        <main className="pb-bottom-nav flex-1 md:pb-10">{children}</main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav
        aria-label="Main"
        className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 backdrop-blur-md md:hidden"
      >
        <Suspense fallback={<NavList variant="bottom" />}>
          <ActiveNavList variant="bottom" />
        </Suspense>
      </nav>
    </div>
  );
}

async function CurrentUserMenu({ wide = false }: { wide?: boolean }) {
  const { profile } = await requireUser();
  return (
    <UserMenu
      showName={wide}
      profile={{
        displayName: profile.display_name,
        username: profile.username,
        avatarUrl: profile.avatar_url,
      }}
    />
  );
}

function UserMenuSkeleton({ wide = false }: { wide?: boolean }) {
  return (
    <div className="flex items-center gap-3 p-2">
      <div className="size-8 animate-pulse rounded-full bg-muted" />
      {wide && (
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          <div className="h-2.5 w-16 animate-pulse rounded bg-muted" />
        </div>
      )}
    </div>
  );
}
