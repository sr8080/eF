import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/validations/auth";

const ALLOWED_TYPES: EmailOtpType[] = ["signup", "recovery", "email", "email_change", "invite", "magiclink"];

/**
 * Token-hash verification (`?token_hash=...&type=signup|recovery&next=/path`).
 * Works even when the email is opened on a different device than the one that
 * signed up. Requires the Supabase email templates to link here (see docs).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const fallback = type === "recovery" ? "/reset-password" : "/dashboard";
  const next = safeRedirectPath(searchParams.get("next"), fallback);

  if (tokenHash && type && ALLOWED_TYPES.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  const url = new URL("/login", origin);
  url.searchParams.set("error", "That link is invalid or has expired. Please try again.");
  return NextResponse.redirect(url);
}
