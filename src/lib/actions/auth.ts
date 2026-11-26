"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  safeRedirectPath,
} from "@/lib/validations/auth";
import { fail, validationError, type ActionResult } from "./result";

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Incorrect email or password.";
  if (m.includes("email not confirmed")) return "Please confirm your email first. Check your inbox.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Too many attempts. Please wait a minute and try again.";
  if (m.includes("password") && m.includes("weak")) return "That password is too weak.";
  return "Something went wrong. Please try again.";
}

export async function login(input: unknown, next?: string): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return fail(friendlyAuthError(error.message));

  revalidatePath("/", "layout");
  redirect(safeRedirectPath(next));
}

export async function register(input: unknown, next?: string): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const { email, password, username, displayName } = parsed.data;

  const supabase = await createClient();

  const { data: available, error: rpcError } = await supabase.rpc("is_username_available", {
    p_username: username,
  });
  if (rpcError) return fail("Could not check username availability. Please try again.");
  if (!available) {
    return { ok: false, error: "That username is taken.", fieldErrors: { username: ["That username is taken"] } };
  }

  const redirectPath = safeRedirectPath(next);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${env.siteUrl}/auth/callback?next=${encodeURIComponent(redirectPath)}`,
      data: { username, display_name: displayName },
    },
  });
  if (error) return fail(friendlyAuthError(error.message));

  // With email confirmation on, Supabase returns a user with no identities when the
  // email is already registered (to avoid leaking which emails exist via timing).
  if (data.user && data.user.identities?.length === 0) {
    return {
      ok: false,
      error: "An account with this email already exists. Try signing in.",
      fieldErrors: { email: ["Already registered"] },
    };
  }

  // Email confirmation disabled → we already have a session.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect(redirectPath);
  }

  return { ok: true, message: "Check your inbox to confirm your email address." };
}

export async function requestPasswordReset(input: unknown): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${env.siteUrl}/auth/callback?next=/reset-password`,
  });

  // Rate limiting is the only error worth surfacing; anything else gets the same
  // generic response so the form can't be used to discover registered emails.
  if (error && /rate limit|too many/i.test(error.message)) return fail(friendlyAuthError(error.message));

  return {
    ok: true,
    message: "If an account exists for that email, a reset link is on its way.",
  };
}

export async function resetPassword(input: unknown): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) {
    return fail("Your reset link has expired. Request a new one.");
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (/same.*password|different from the old/i.test(error.message)) {
      return fail("New password must be different from your current one.");
    }
    return fail(friendlyAuthError(error.message));
  }

  revalidatePath("/", "layout");
  redirect("/dashboard?passwordUpdated=1");
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
