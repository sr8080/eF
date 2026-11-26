import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { env } from "@/lib/env";

/** Routes that require a signed-in user. Everything else is public. */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/leagues",
  "/matches",
  "/players",
  "/notifications",
  "/settings",
];

/** Auth pages a signed-in user should be bounced away from. */
const GUEST_ONLY = ["/login", "/register", "/forgot-password"];

function matches(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Refreshes the Supabase auth cookie (if needed) and applies coarse route
 * protection. This is a UX convenience only: every page, Server Action and RLS
 * policy still checks authorization itself.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!env.supabaseUrl || !env.supabaseKey) return response;

  const supabase = createServerClient<Database>(env.supabaseUrl, env.supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      },
    },
  });

  // Do not put code between createServerClient and getClaims(): getClaims both
  // validates the JWT and triggers the token refresh that writes new cookies.
  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims?.sub);
  const { pathname, search } = request.nextUrl;

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    if (path === "/login") url.searchParams.set("next", `${pathname}${search}`);
    const redirect = NextResponse.redirect(url);
    // Carry over any refreshed auth cookies.
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  };

  if (!isSignedIn && matches(pathname, PROTECTED_PREFIXES)) return redirectTo("/login");
  if (isSignedIn && matches(pathname, GUEST_ONLY)) return redirectTo("/dashboard");

  return response;
}
