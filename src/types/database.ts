/**
 * Database types in the shape produced by `supabase gen types typescript`.
 *
 * Hand-maintained until a Supabase project is linked. Once it is, regenerate with:
 *   npx supabase gen types typescript --project-id <ref> --schema public > src/types/database.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13";
  };
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      leagues: {
        Row: {
          id: string;
          name: string;
          description: string;
          logo_url: string | null;
          owner_id: string;
          invite_code: string;
          is_archived: boolean;
          archived_at: string | null;
          points_win: number;
          points_draw: number;
          points_loss: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          logo_url?: string | null;
          owner_id: string;
          invite_code: string;
          is_archived?: boolean;
          archived_at?: string | null;
          points_win?: number;
          points_draw?: number;
          points_loss?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          logo_url?: string | null;
          owner_id?: string;
          invite_code?: string;
          is_archived?: boolean;
          archived_at?: string | null;
          points_win?: number;
          points_draw?: number;
          points_loss?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "leagues_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      league_members: {
        Row: {
          id: string;
          league_id: string;
          user_id: string;
          role: Database["public"]["Enums"]["league_role"];
          joined_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          league_id: string;
          user_id: string;
          role?: Database["public"]["Enums"]["league_role"];
          joined_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          league_id?: string;
          user_id?: string;
          role?: Database["public"]["Enums"]["league_role"];
          joined_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "league_members_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "league_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      seasons: {
        Row: {
          id: string;
          league_id: string;
          name: string;
          number: number;
          status: Database["public"]["Enums"]["season_status"];
          started_at: string | null;
          ended_at: string | null;
          champion_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          league_id: string;
          name: string;
          number: number;
          status?: Database["public"]["Enums"]["season_status"];
          started_at?: string | null;
          ended_at?: string | null;
          champion_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          league_id?: string;
          name?: string;
          number?: number;
          status?: Database["public"]["Enums"]["season_status"];
          started_at?: string | null;
          ended_at?: string | null;
          champion_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seasons_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "seasons_champion_id_fkey";
            columns: ["champion_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      season_participants: {
        Row: {
          id: string;
          season_id: string;
          user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          season_id: string;
          user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          season_id?: string;
          user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "season_participants_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "season_participants_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      matches: {
        Row: {
          id: string;
          league_id: string;
          season_id: string;
          player_a_id: string;
          player_b_id: string;
          scheduled_at: string | null;
          status: Database["public"]["Enums"]["match_status"];
          round: number | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          league_id: string;
          season_id: string;
          player_a_id: string;
          player_b_id: string;
          scheduled_at?: string | null;
          status?: Database["public"]["Enums"]["match_status"];
          round?: number | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          league_id?: string;
          season_id?: string;
          player_a_id?: string;
          player_b_id?: string;
          scheduled_at?: string | null;
          status?: Database["public"]["Enums"]["match_status"];
          round?: number | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "matches_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_player_a_id_fkey";
            columns: ["player_a_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_player_b_id_fkey";
            columns: ["player_b_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      match_submissions: {
        Row: {
          id: string;
          league_id: string;
          match_id: string;
          submitted_by: string;
          score_a: number;
          score_b: number;
          source: Database["public"]["Enums"]["submission_source"];
          kind: Database["public"]["Enums"]["submission_kind"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          league_id: string;
          match_id: string;
          submitted_by: string;
          score_a: number;
          score_b: number;
          source?: Database["public"]["Enums"]["submission_source"];
          kind?: Database["public"]["Enums"]["submission_kind"];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          league_id?: string;
          match_id?: string;
          submitted_by?: string;
          score_a?: number;
          score_b?: number;
          source?: Database["public"]["Enums"]["submission_source"];
          kind?: Database["public"]["Enums"]["submission_kind"];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "match_submissions_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_submissions_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_submissions_submitted_by_fkey";
            columns: ["submitted_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      match_results: {
        Row: {
          id: string;
          league_id: string;
          match_id: string;
          score_a: number;
          score_b: number;
          confirmed_by: string;
          confirmed_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          league_id: string;
          match_id: string;
          score_a: number;
          score_b: number;
          confirmed_by: string;
          confirmed_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          league_id?: string;
          match_id?: string;
          score_a?: number;
          score_b?: number;
          confirmed_by?: string;
          confirmed_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "match_results_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_results_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: true;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_results_confirmed_by_fkey";
            columns: ["confirmed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      match_screenshots: {
        Row: {
          id: string;
          league_id: string;
          match_id: string;
          storage_path: string;
          uploaded_by: string;
          ai_extraction: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          league_id: string;
          match_id: string;
          storage_path: string;
          uploaded_by: string;
          ai_extraction?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          league_id?: string;
          match_id?: string;
          storage_path?: string;
          uploaded_by?: string;
          ai_extraction?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "match_screenshots_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_screenshots_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_screenshots_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      result_disputes: {
        Row: {
          id: string;
          league_id: string;
          match_id: string;
          raised_by: string;
          reason: string;
          status: Database["public"]["Enums"]["dispute_status"];
          resolved_by: string | null;
          resolution_note: string | null;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          league_id: string;
          match_id: string;
          raised_by: string;
          reason: string;
          status?: Database["public"]["Enums"]["dispute_status"];
          resolved_by?: string | null;
          resolution_note?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          league_id?: string;
          match_id?: string;
          raised_by?: string;
          reason?: string;
          status?: Database["public"]["Enums"]["dispute_status"];
          resolved_by?: string | null;
          resolution_note?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "result_disputes_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "result_disputes_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "result_disputes_raised_by_fkey";
            columns: ["raised_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "result_disputes_resolved_by_fkey";
            columns: ["resolved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: Database["public"]["Enums"]["notification_type"];
          league_id: string | null;
          match_id: string | null;
          payload: Json;
          read_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: Database["public"]["Enums"]["notification_type"];
          league_id?: string | null;
          match_id?: string | null;
          payload?: Json;
          read_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: Database["public"]["Enums"]["notification_type"];
          league_id?: string | null;
          match_id?: string | null;
          payload?: Json;
          read_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
        ];
      };
      achievements: {
        Row: {
          id: string;
          user_id: string;
          league_id: string;
          season_id: string | null;
          kind: Database["public"]["Enums"]["achievement_kind"];
          awarded_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          league_id: string;
          season_id?: string | null;
          kind: Database["public"]["Enums"]["achievement_kind"];
          awarded_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          league_id?: string;
          season_id?: string | null;
          kind?: Database["public"]["Enums"]["achievement_kind"];
          awarded_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "achievements_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "achievements_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "achievements_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      is_username_available: {
        Args: { p_username: string };
        Returns: boolean;
      };
      is_league_member: {
        Args: { p_league_id: string };
        Returns: boolean;
      };
      league_role: {
        Args: { p_league_id: string };
        Returns: Database["public"]["Enums"]["league_role"] | null;
      };
      is_league_manager: {
        Args: { p_league_id: string };
        Returns: boolean;
      };
      is_league_archived: {
        Args: { p_league_id: string };
        Returns: boolean;
      };
      create_league: {
        Args: { p_name: string; p_description?: string };
        Returns: string;
      };
      get_league_invite_preview: {
        Args: { p_code: string };
        Returns: {
          id: string;
          name: string;
          logo_url: string | null;
          member_count: number;
          is_archived: boolean;
        }[];
      };
      join_league_by_code: {
        Args: { p_code: string };
        Returns: string;
      };
      regenerate_invite_code: {
        Args: { p_league_id: string };
        Returns: string;
      };
      set_member_role: {
        Args: {
          p_league_id: string;
          p_user_id: string;
          p_role: Database["public"]["Enums"]["league_role"];
        };
        Returns: undefined;
      };
      remove_member: {
        Args: { p_league_id: string; p_user_id: string };
        Returns: undefined;
      };
      leave_league: {
        Args: { p_league_id: string };
        Returns: undefined;
      };
      transfer_ownership: {
        Args: { p_league_id: string; p_new_owner_id: string };
        Returns: undefined;
      };
      archive_league: {
        Args: { p_league_id: string };
        Returns: undefined;
      };
      unarchive_league: {
        Args: { p_league_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      league_role: "owner" | "admin" | "player";
      season_status: "draft" | "active" | "completed" | "archived";
      match_status: "scheduled" | "awaiting_confirmation" | "confirmed" | "disputed" | "cancelled";
      submission_source: "manual" | "screenshot_ai";
      submission_kind: "submission" | "correction" | "admin_resolution";
      dispute_status: "open" | "resolved";
      notification_type:
        | "league_joined"
        | "member_promoted"
        | "member_removed"
        | "ownership_transferred"
        | "season_started"
        | "match_scheduled"
        | "result_submitted"
        | "result_confirmed"
        | "result_disputed"
        | "dispute_resolved"
        | "result_corrected"
        | "achievement_awarded";
      achievement_kind:
        | "champion"
        | "golden_boot"
        | "best_defense"
        | "unbeaten_season"
        | "win_streak"
        | "top_scorer";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];

export type Profile = Tables<"profiles">;
export type League = Tables<"leagues">;
export type LeagueMember = Tables<"league_members">;
export type LeagueRole = Enums<"league_role">;
export type LeagueInvitePreview =
  Database["public"]["Functions"]["get_league_invite_preview"]["Returns"][number];
