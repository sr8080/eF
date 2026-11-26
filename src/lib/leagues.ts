import "server-only";

import { cache } from "react";
import { notFound } from "next/navigation";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { League, LeagueInvitePreview, LeagueRole, Profile } from "@/types/database";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

export type UserLeagueSummary = {
  league: League;
  role: LeagueRole;
  joinedAt: string;
  memberCount: number;
};

export type LeagueContext = {
  user: CurrentUser;
  league: League;
  role: LeagueRole;
  memberCount: number;
};

export type LeagueMemberWithProfile = {
  id: string;
  userId: string;
  role: LeagueRole;
  joinedAt: string;
  profile: Pick<Profile, "id" | "username" | "display_name" | "avatar_url">;
};

const ROLE_ORDER: Record<LeagueRole, number> = {
  owner: 0,
  admin: 1,
  player: 2,
};

/** Returns all leagues the signed-in user belongs to, with member counts. */
export const getUserLeagues = cache(async (): Promise<UserLeagueSummary[]> => {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from("league_members")
    .select("role, joined_at, leagues(*)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });

  if (error || !rows?.length) return [];

  const validRows = rows.filter((r): r is typeof r & { leagues: League } => r.leagues !== null);
  const leagueIds = validRows.map((r) => r.leagues.id);

  const counts = new Map<string, number>();
  if (leagueIds.length > 0) {
    const { data: members } = await supabase
      .from("league_members")
      .select("league_id")
      .in("league_id", leagueIds);

    for (const m of members ?? []) {
      counts.set(m.league_id, (counts.get(m.league_id) ?? 0) + 1);
    }
  }

  return validRows
    .map((r) => ({
      league: r.leagues,
      role: r.role,
      joinedAt: r.joined_at,
      memberCount: counts.get(r.leagues.id) ?? 1,
    }))
    .sort((a, b) => {
      if (a.league.is_archived !== b.league.is_archived) {
        return a.league.is_archived ? 1 : -1;
      }
      return b.joinedAt.localeCompare(a.joinedAt);
    });
});

/** Fetches league + caller role if the user is a member; returns null otherwise. */
export const getLeagueContext = cache(async (leagueId: string): Promise<LeagueContext | null> => {
  const user = await requireUser(`/leagues/${leagueId}`);
  if (!isUuid(leagueId)) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("league_members")
    .select("role, leagues(*)")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data?.leagues) return null;

  const { count } = await supabase
    .from("league_members")
    .select("*", { count: "exact", head: true })
    .eq("league_id", leagueId);

  return {
    user,
    league: data.leagues,
    role: data.role,
    memberCount: count ?? 1,
  };
});

/** Requires membership in `leagueId`, calling notFound() for non-members or bad IDs. */
export async function requireLeagueContext(leagueId: string): Promise<LeagueContext> {
  const ctx = await getLeagueContext(leagueId);
  if (!ctx) notFound();
  return ctx;
}

/** Lists all members of a league ordered by role (owner → admin → player) then join date. */
export async function getLeagueMembers(leagueId: string): Promise<LeagueMemberWithProfile[]> {
  if (!isUuid(leagueId)) return [];
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("league_members")
    .select("id, user_id, role, joined_at, profiles(id, username, display_name, avatar_url)")
    .eq("league_id", leagueId)
    .order("joined_at", { ascending: true });

  if (error || !data) return [];

  return data
    .filter((row): row is typeof row & { profiles: Profile } => row.profiles !== null)
    .map((row) => ({
      id: row.id,
      userId: row.user_id,
      role: row.role,
      joinedAt: row.joined_at,
      profile: {
        id: row.profiles.id,
        username: row.profiles.username,
        display_name: row.profiles.display_name,
        avatar_url: row.profiles.avatar_url,
      },
    }))
    .sort((a, b) => {
      const roleDiff = ROLE_ORDER[a.role] - ROLE_ORDER[b.role];
      if (roleDiff !== 0) return roleDiff;
      return a.joinedAt.localeCompare(b.joinedAt);
    });
}

/** Public invite preview callable by signed-out or signed-in visitors. */
export async function getLeagueInvitePreview(code: string): Promise<LeagueInvitePreview | null> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_league_invite_preview", {
    p_code: normalized,
  });

  if (error || !data || data.length === 0) return null;
  return data[0];
}
