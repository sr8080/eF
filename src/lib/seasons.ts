import "server-only";

import { cache } from "react";
import { requireUser } from "@/lib/auth";
import { isUuid } from "@/lib/leagues";
import { createClient } from "@/lib/supabase/server";
import type { Achievement, League, LeagueRole, Profile, Season, SeasonStatus } from "@/types/database";

export type SeasonParticipantProfile = Pick<
  Profile,
  "id" | "username" | "display_name" | "avatar_url"
>;

export type LeagueSeasonWithRoster = {
  season: Season;
  participants: SeasonParticipantProfile[];
  champion: SeasonParticipantProfile | null;
};

export type PlayerSharedLeague = {
  league: League;
  playerRole: LeagueRole;
  joinedAt: string;
};

export type PlayerSeasonEntry = {
  seasonId: string;
  seasonName: string;
  seasonNumber: number;
  status: SeasonStatus;
  leagueId: string;
  leagueName: string;
};

export type PlayerAchievementEntry = {
  achievement: Achievement;
  leagueName: string;
  seasonName: string | null;
  seasonNumber: number | null;
};

export type PlayerProfileData = {
  profile: Profile;
  isSelf: boolean;
  sharedLeagues: PlayerSharedLeague[];
  seasons: PlayerSeasonEntry[];
  achievements: PlayerAchievementEntry[];
};

/** Returns all seasons for a league (newest number first) with rosters and champions. */
export const getLeagueSeasons = cache(async (leagueId: string): Promise<LeagueSeasonWithRoster[]> => {
  if (!isUuid(leagueId)) return [];
  const supabase = await createClient();

  const { data: seasons, error } = await supabase
    .from("seasons")
    .select("*")
    .eq("league_id", leagueId)
    .order("number", { ascending: false });

  if (error || !seasons?.length) return [];

  const seasonIds = seasons.map((s) => s.id);
  const { data: participantRows } = await supabase
    .from("season_participants")
    .select("season_id, profiles(id, username, display_name, avatar_url)")
    .in("season_id", seasonIds);

  const rosterBySeason = new Map<string, SeasonParticipantProfile[]>();
  const profileMap = new Map<string, SeasonParticipantProfile>();

  for (const row of participantRows ?? []) {
    const profile = row.profiles as SeasonParticipantProfile | null;
    if (!profile) continue;
    profileMap.set(profile.id, profile);
    const list = rosterBySeason.get(row.season_id) ?? [];
    list.push(profile);
    rosterBySeason.set(row.season_id, list);
  }

  // Fetch any champion profile who might not be in the map (defensive fallback).
  const missingChampionIds = seasons
    .map((s) => s.champion_id)
    .filter((id): id is string => Boolean(id) && !profileMap.has(id!));

  if (missingChampionIds.length > 0) {
    const { data: champs } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", missingChampionIds);
    for (const c of champs ?? []) profileMap.set(c.id, c);
  }

  return seasons.map((season) => {
    const participants = (rosterBySeason.get(season.id) ?? []).sort((a, b) =>
      a.display_name.localeCompare(b.display_name),
    );
    return {
      season,
      participants,
      champion: season.champion_id ? (profileMap.get(season.champion_id) ?? null) : null,
    };
  });
});

/** Loads a player's profile plus leagues, seasons and achievements shared with the viewer. */
export const getPlayerProfileData = cache(
  async (userId: string): Promise<PlayerProfileData | null> => {
    const viewer = await requireUser(`/players/${userId}`);
    if (!isUuid(userId)) return null;

    const supabase = await createClient();
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error || !profile) return null;

    // RLS on league_members/seasons/achievements automatically scopes results to
    // leagues the current viewer also belongs to.
    const [{ data: membershipRows }, { data: seasonRows }, { data: achievementRows }] =
      await Promise.all([
        supabase
          .from("league_members")
          .select("role, joined_at, leagues(*)")
          .eq("user_id", userId)
          .order("joined_at", { ascending: false }),
        supabase
          .from("season_participants")
          .select("seasons(id, name, number, status, league_id, leagues(id, name))")
          .eq("user_id", userId),
        supabase
          .from("achievements")
          .select("*, leagues(id, name), seasons(id, name, number)")
          .eq("user_id", userId)
          .order("awarded_at", { ascending: false }),
      ]);

    const sharedLeagues: PlayerSharedLeague[] = (membershipRows ?? [])
      .filter((r): r is typeof r & { leagues: League } => r.leagues !== null)
      .map((r) => ({
        league: r.leagues,
        playerRole: r.role,
        joinedAt: r.joined_at,
      }));

    const seasons: PlayerSeasonEntry[] = (seasonRows ?? [])
      .map((r) => {
        const s = r.seasons as {
          id: string;
          name: string;
          number: number;
          status: SeasonStatus;
          league_id: string;
          leagues: { id: string; name: string } | null;
        } | null;
        if (!s || !s.leagues) return null;
        return {
          seasonId: s.id,
          seasonName: s.name,
          seasonNumber: s.number,
          status: s.status,
          leagueId: s.league_id,
          leagueName: s.leagues.name,
        };
      })
      .filter((x): x is PlayerSeasonEntry => x !== null)
      .sort((a, b) => b.seasonNumber - a.seasonNumber);

    const achievements: PlayerAchievementEntry[] = (achievementRows ?? []).map((row) => {
      const league = row.leagues as { id: string; name: string } | null;
      const season = row.seasons as { id: string; name: string; number: number } | null;
      return {
        achievement: {
          id: row.id,
          user_id: row.user_id,
          league_id: row.league_id,
          season_id: row.season_id,
          kind: row.kind,
          awarded_at: row.awarded_at,
          created_at: row.created_at,
          updated_at: row.updated_at,
        },
        leagueName: league?.name ?? "League",
        seasonName: season?.name ?? null,
        seasonNumber: season?.number ?? null,
      };
    });

    return {
      profile,
      isSelf: viewer.id === profile.id,
      sharedLeagues,
      seasons,
      achievements,
    };
  },
);
