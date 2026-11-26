import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

/**
 * Data Access Layer for the current user. Every server-side read of "who is
 * signed in" goes through here.
 *
 * `cache()` dedupes the lookup within one request, so layouts and pages can both
 * call it freely.
 */

export type CurrentUser = {
  id: string;
  email: string;
  profile: Profile;
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();

  // getClaims() verifies the JWT signature, unlike getSession() which trusts the cookie.
  const { data: claimsData, error } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (error || !claims?.sub) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", claims.sub)
    .maybeSingle();

  if (!profile) return null;

  return { id: claims.sub, email: String(claims.email ?? ""), profile };
});

/** For pages and actions that must have a user. Redirects to /login otherwise. */
export async function requireUser(nextPath?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login");
  }
  return user;
}
