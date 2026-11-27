import "server-only";

import { cache } from "react";
import { requireUser } from "@/lib/auth";
import { isUuid } from "@/lib/leagues";
import { deriveMatchDisplayStatus, type MatchDisplayStatus } from "@/lib/match-status";
import { createClient } from "@/lib/supabase/server";
import type { League, Match, MatchResult, Profile, Season } from "@/types/database";

export type MatchPlayerSummary = Pick<
  Profile,
  "id" | "username" | "display_name" | "avatar_url"
>;

export type EnrichedMatch = {
  match: Match;
  displayStatus: MatchDisplayStatus;
  playerA: MatchPlayerSummary;
  playerB: MatchPlayerSummary;
  result: Pick<MatchResult, "score_a" | "score_b" | "confirmed_at"> | null;
  season: Pick<Season, "id" | "name" | "number" | "status">;
  league: Pick<League, "id" | "name" | "logo_url" | "is_archived">;
};

const FALLBACK_PLAYER: MatchPlayerSummary = {
  id: "",
  username: "player",
  display_name: "Unknown player",
  avatar_url: null,
};

async function hydrateMatches(matches: Match[]): Promise<EnrichedMatch[]> {
  if (matches.length === 0) return [];
  const supabase = await createClient();

  const playerIds = Array.from(
    new Set(matches.flatMap((m) => [m.player_a_id, m.player_b_id])),
  );
  const seasonIds = Array.from(new Set(matches.map((m) => m.season_id)));
  const leagueIds = Array.from(new Set(matches.map((m) => m.league_id)));
  const matchIds = matches.map((m) => m.id);

  const [{ data: profiles }, { data: seasons }, { data: leagues }, { data: results }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", playerIds),
      supabase.from("seasons").select("id, name, number, status").in("id", seasonIds),
      supabase.from("leagues").select("id, name, logo_url, is_archived").in("id", leagueIds),
      supabase
        .from("match_results")
        .select("match_id, score_a, score_b, confirmed_at")
        .in("match_id", matchIds),
    ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const seasonMap = new Map((seasons ?? []).map((s) => [s.id, s]));
  const leagueMap = new Map((leagues ?? []).map((l) => [l.id, l]));
  const resultMap = new Map((results ?? []).map((r) => [r.match_id, r]));
  const nowMs = Date.now();

  return matches.map((match) => {
    const season = seasonMap.get(match.season_id) ?? {
      id: match.season_id,
      name: "Season",
      number: 1,
      status: "draft" as const,
    };
    const league = leagueMap.get(match.league_id) ?? {
      id: match.league_id,
      name: "League",
      logo_url: null,
      is_archived: false,
    };
    const res = resultMap.get(match.id);

    return {
      match,
      displayStatus: deriveMatchDisplayStatus(match.status, match.scheduled_at, nowMs),
      playerA: profileMap.get(match.player_a_id) ?? { ...FALLBACK_PLAYER, id: match.player_a_id },
      playerB: profileMap.get(match.player_b_id) ?? { ...FALLBACK_PLAYER, id: match.player_b_id },
      result: res
        ? { score_a: res.score_a, score_b: res.score_b, confirmed_at: res.confirmed_at }
        : null,
      season,
      league,
    };
  });
}

/** Fetches matches for a league (optionally filtered to one season), sorted by round then date. */
export const getLeagueMatches = cache(
  async (leagueId: string, seasonId?: string): Promise<EnrichedMatch[]> => {
    if (!isUuid(leagueId)) return [];
    const supabase = await createClient();

    let query = supabase
      .from("matches")
      .select("*")
      .eq("league_id", leagueId)
      .order("round", { ascending: true, nullsFirst: false })
      .order("scheduled_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    if (seasonId && isUuid(seasonId)) {
      query = query.eq("season_id", seasonId);
    }

    const { data, error } = await query;
    if (error || !data?.length) return [];
    return hydrateMatches(data);
  },
);

/** Fetches all matches involving the signed-in user across all their leagues. */
export const getUserMatches = cache(async (): Promise<EnrichedMatch[]> => {
  const user = await requireUser("/matches");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .or(`player_a_id.eq.${user.id},player_b_id.eq.${user.id}`)
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error || !data?.length) return [];
  return hydrateMatches(data);
});

/** Fetches a single match inside `leagueId`; returns null if invalid or inaccessible. */
export const getMatchDetail = cache(
  async (leagueId: string, matchId: string): Promise<EnrichedMatch | null> => {
    if (!isUuid(leagueId) || !isUuid(matchId)) return null;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .eq("league_id", leagueId)
      .eq("id", matchId)
      .maybeSingle();

    if (error || !data) return null;
    const hydrated = await hydrateMatches([data]);
    return hydrated[0] ?? null;
  },
);
