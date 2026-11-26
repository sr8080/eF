"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { assertSupabaseEnv, env } from "@/lib/env";

/** Supabase client for Client Components. Uses the user's session cookie; RLS applies. */
export function createClient() {
  assertSupabaseEnv();
  return createBrowserClient<Database>(env.supabaseUrl, env.supabaseKey);
}
