import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/validations/auth";

/**
 * PKCE callback for email confirmation and password-recovery links
 * (`?code=...&next=/path`). Exchanges the code for a session cookie.
 *
 * Note: PKCE requires the link to be opened in the same browser that started
 * the flow. /auth/confirm (token_hash) works across devices; see docs/DEPLOYMENT.md.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  const errorDescription = searchParams.get("error_description");
  const url = new URL("/login", origin);
  url.searchParams.set(
    "error",
    errorDescription ?? "That link is invalid or has expired. Please try again.",
  );
  return NextResponse.redirect(url);
}
