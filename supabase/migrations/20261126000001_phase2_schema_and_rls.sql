-- =============================================================================
-- Phase 2: core relational schema, security helpers and RLS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.league_role as enum ('owner', 'admin', 'player');
create type public.season_status as enum ('draft', 'active', 'completed', 'archived');
-- Note: "pending_result" is intentionally NOT stored; derive it in queries/views
-- when status = 'scheduled' and scheduled_at < now().
create type public.match_status as enum (
  'scheduled',
  'awaiting_confirmation',
  'confirmed',
  'disputed',
  'cancelled'
);
create type public.submission_source as enum ('manual', 'screenshot_ai');
create type public.submission_kind as enum ('submission', 'correction', 'admin_resolution');
create type public.dispute_status as enum ('open', 'resolved');
create type public.notification_type as enum (
  'league_joined',
  'member_promoted',
  'member_removed',
  'ownership_transferred',
  'season_started',
  'match_scheduled',
  'result_submitted',
  'result_confirmed',
  'result_disputed',
  'dispute_resolved',
  'result_corrected',
  'achievement_awarded'
);
create type public.achievement_kind as enum (
  'champion',
  'golden_boot',
  'best_defense',
  'unbeaten_season',
  'win_streak',
  'top_scorer'
);

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

-- 1. Leagues
create table public.leagues (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text not null default '',
  logo_url     text,
  owner_id     uuid not null references public.profiles (id) on delete restrict,
  invite_code  text not null,
  is_archived  boolean not null default false,
  archived_at  timestamptz,
  points_win   integer not null default 3 check (points_win >= 0),
  points_draw  integer not null default 1 check (points_draw >= 0),
  points_loss  integer not null default 0 check (points_loss >= 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint leagues_name_length check (char_length(btrim(name)) between 3 and 50),
  constraint leagues_description_length check (char_length(description) <= 280),
  -- Unambiguous 8-char alphabet (excludes 0, O, 1, I).
  constraint leagues_invite_code_format check (invite_code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$'),
  constraint leagues_archived_consistency check (
    (is_archived = false and archived_at is null)
    or (is_archived = true and archived_at is not null)
  )
);

create unique index leagues_invite_code_key on public.leagues (invite_code);
create index leagues_owner_id_idx on public.leagues (owner_id);

create trigger leagues_set_updated_at
  before update on public.leagues
  for each row execute function public.set_updated_at();

-- 2. League members
create table public.league_members (
  id          uuid primary key default gen_random_uuid(),
  league_id   uuid not null references public.leagues (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  role        public.league_role not null default 'player',
  joined_at   timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint league_members_unique unique (league_id, user_id)
);

-- Exactly one owner per league.
create unique index league_members_one_owner_idx
  on public.league_members (league_id)
  where role = 'owner';

create index league_members_league_id_idx on public.league_members (league_id);
create index league_members_user_id_idx on public.league_members (user_id);

create trigger league_members_set_updated_at
  before update on public.league_members
  for each row execute function public.set_updated_at();

-- 3. Seasons
create table public.seasons (
  id           uuid primary key default gen_random_uuid(),
  league_id    uuid not null references public.leagues (id) on delete cascade,
  name         text not null,
  number       integer not null check (number >= 1),
  status       public.season_status not null default 'draft',
  started_at   timestamptz,
  ended_at     timestamptz,
  champion_id  uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint seasons_name_length check (char_length(btrim(name)) between 1 and 60),
  constraint seasons_league_number_unique unique (league_id, number)
);

-- At most one active season per league.
create unique index seasons_one_active_idx
  on public.seasons (league_id)
  where status = 'active';

create index seasons_league_id_idx on public.seasons (league_id);
create index seasons_champion_id_idx on public.seasons (champion_id);

create trigger seasons_set_updated_at
  before update on public.seasons
  for each row execute function public.set_updated_at();

-- 4. Season participants
create table public.season_participants (
  id          uuid primary key default gen_random_uuid(),
  season_id   uuid not null references public.seasons (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint season_participants_unique unique (season_id, user_id)
);

create index season_participants_season_id_idx on public.season_participants (season_id);
create index season_participants_user_id_idx on public.season_participants (user_id);

create trigger season_participants_set_updated_at
  before update on public.season_participants
  for each row execute function public.set_updated_at();

-- 5. Matches
create table public.matches (
  id            uuid primary key default gen_random_uuid(),
  league_id     uuid not null references public.leagues (id) on delete cascade,
  season_id     uuid not null references public.seasons (id) on delete cascade,
  player_a_id   uuid not null references public.profiles (id) on delete restrict,
  player_b_id   uuid not null references public.profiles (id) on delete restrict,
  scheduled_at  timestamptz,
  status        public.match_status not null default 'scheduled',
  round         integer check (round is null or round >= 1),
  created_by    uuid not null references public.profiles (id) on delete restrict,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint matches_distinct_players check (player_a_id <> player_b_id)
);

create index matches_league_id_idx on public.matches (league_id);
create index matches_season_id_idx on public.matches (season_id);
create index matches_player_a_id_idx on public.matches (player_a_id);
create index matches_player_b_id_idx on public.matches (player_b_id);
create index matches_created_by_idx on public.matches (created_by);
create index matches_league_status_scheduled_idx on public.matches (league_id, status, scheduled_at);

create trigger matches_set_updated_at
  before update on public.matches
  for each row execute function public.set_updated_at();

-- 6. Match submissions (audit trail of every proposed score)
create table public.match_submissions (
  id            uuid primary key default gen_random_uuid(),
  league_id     uuid not null references public.leagues (id) on delete cascade,
  match_id      uuid not null references public.matches (id) on delete cascade,
  submitted_by  uuid not null references public.profiles (id) on delete restrict,
  score_a       integer not null check (score_a >= 0),
  score_b       integer not null check (score_b >= 0),
  source        public.submission_source not null default 'manual',
  kind          public.submission_kind not null default 'submission',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index match_submissions_league_id_idx on public.match_submissions (league_id);
create index match_submissions_match_id_idx on public.match_submissions (match_id);
create index match_submissions_submitted_by_idx on public.match_submissions (submitted_by);

create trigger match_submissions_set_updated_at
  before update on public.match_submissions
  for each row execute function public.set_updated_at();

-- 7. Match results (one official confirmed row per match)
create table public.match_results (
  id            uuid primary key default gen_random_uuid(),
  league_id     uuid not null references public.leagues (id) on delete cascade,
  match_id      uuid not null unique references public.matches (id) on delete cascade,
  score_a       integer not null check (score_a >= 0),
  score_b       integer not null check (score_b >= 0),
  confirmed_by  uuid not null references public.profiles (id) on delete restrict,
  confirmed_at  timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index match_results_league_id_idx on public.match_results (league_id);
create index match_results_confirmed_by_idx on public.match_results (confirmed_by);

create trigger match_results_set_updated_at
  before update on public.match_results
  for each row execute function public.set_updated_at();

-- 8. Match screenshots
create table public.match_screenshots (
  id             uuid primary key default gen_random_uuid(),
  league_id      uuid not null references public.leagues (id) on delete cascade,
  match_id       uuid not null references public.matches (id) on delete cascade,
  storage_path   text not null,
  uploaded_by    uuid not null references public.profiles (id) on delete restrict,
  ai_extraction  jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index match_screenshots_league_id_idx on public.match_screenshots (league_id);
create index match_screenshots_match_id_idx on public.match_screenshots (match_id);
create index match_screenshots_uploaded_by_idx on public.match_screenshots (uploaded_by);

create trigger match_screenshots_set_updated_at
  before update on public.match_screenshots
  for each row execute function public.set_updated_at();

-- 9. Result disputes
create table public.result_disputes (
  id               uuid primary key default gen_random_uuid(),
  league_id        uuid not null references public.leagues (id) on delete cascade,
  match_id         uuid not null references public.matches (id) on delete cascade,
  raised_by        uuid not null references public.profiles (id) on delete restrict,
  reason           text not null,
  status           public.dispute_status not null default 'open',
  resolved_by      uuid references public.profiles (id) on delete set null,
  resolution_note  text,
  resolved_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint result_disputes_reason_length check (char_length(btrim(reason)) between 1 and 500)
);

create index result_disputes_league_id_idx on public.result_disputes (league_id);
create index result_disputes_match_id_idx on public.result_disputes (match_id);
create index result_disputes_raised_by_idx on public.result_disputes (raised_by);
create index result_disputes_resolved_by_idx on public.result_disputes (resolved_by);
create index result_disputes_league_status_idx on public.result_disputes (league_id, status);

create trigger result_disputes_set_updated_at
  before update on public.result_disputes
  for each row execute function public.set_updated_at();

-- 10. Notifications
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  type        public.notification_type not null,
  league_id   uuid references public.leagues (id) on delete cascade,
  match_id    uuid references public.matches (id) on delete cascade,
  payload     jsonb not null default '{}'::jsonb,
  read_at     timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index notifications_user_id_idx on public.notifications (user_id);
create index notifications_user_read_idx on public.notifications (user_id, read_at);
create index notifications_league_id_idx on public.notifications (league_id);
create index notifications_match_id_idx on public.notifications (match_id);

create trigger notifications_set_updated_at
  before update on public.notifications
  for each row execute function public.set_updated_at();

-- 11. Achievements
create table public.achievements (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  league_id   uuid not null references public.leagues (id) on delete cascade,
  season_id   uuid references public.seasons (id) on delete cascade,
  kind        public.achievement_kind not null,
  awarded_at  timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index achievements_user_id_idx on public.achievements (user_id);
create index achievements_league_id_idx on public.achievements (league_id);
create index achievements_season_id_idx on public.achievements (season_id);

create trigger achievements_set_updated_at
  before update on public.achievements
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- SECURITY DEFINER helpers (avoid recursive RLS on league_members)
-- -----------------------------------------------------------------------------
create or replace function public.is_league_member(p_league_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.league_members
    where league_id = p_league_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.league_role(p_league_id uuid)
returns public.league_role
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.league_members
  where league_id = p_league_id
    and user_id = auth.uid();
$$;

create or replace function public.is_league_manager(p_league_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.league_members
    where league_id = p_league_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

create or replace function public.is_league_archived(p_league_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select is_archived from public.leagues where id = p_league_id),
    false
  );
$$;

revoke all on function public.is_league_member(uuid) from public;
grant execute on function public.is_league_member(uuid) to authenticated;

revoke all on function public.league_role(uuid) from public;
grant execute on function public.league_role(uuid) to authenticated;

revoke all on function public.is_league_manager(uuid) from public;
grant execute on function public.is_league_manager(uuid) to authenticated;

revoke all on function public.is_league_archived(uuid) from public;
grant execute on function public.is_league_archived(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Row Level Security & table privileges
-- -----------------------------------------------------------------------------
alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
alter table public.seasons enable row level security;
alter table public.season_participants enable row level security;
alter table public.matches enable row level security;
alter table public.match_submissions enable row level security;
alter table public.match_results enable row level security;
alter table public.match_screenshots enable row level security;
alter table public.result_disputes enable row level security;
alter table public.notifications enable row level security;
alter table public.achievements enable row level security;

-- Leagues: members read; managers update non-archived settings columns only.
-- Creation, invite code regeneration, ownership transfer and archiving go through
-- SECURITY DEFINER RPCs.
revoke all on public.leagues from anon, authenticated;
grant select on public.leagues to authenticated;
grant update (name, description, logo_url, points_win, points_draw, points_loss)
  on public.leagues to authenticated;

create policy "leagues: members can read"
  on public.leagues for select
  to authenticated
  using (public.is_league_member(id));

create policy "leagues: managers can update active settings"
  on public.leagues for update
  to authenticated
  using (public.is_league_manager(id) and not is_archived)
  with check (public.is_league_manager(id) and not is_archived);

-- League members: members read; all writes go through SECURITY DEFINER RPCs.
revoke all on public.league_members from anon, authenticated;
grant select on public.league_members to authenticated;

create policy "league_members: members can read"
  on public.league_members for select
  to authenticated
  using (public.is_league_member(league_id));

-- Seasons & participants: members read.
-- Phase 3 will add season lifecycle functions/policies.
revoke all on public.seasons from anon, authenticated;
grant select on public.seasons to authenticated;

create policy "seasons: members can read"
  on public.seasons for select
  to authenticated
  using (public.is_league_member(league_id));

revoke all on public.season_participants from anon, authenticated;
grant select on public.season_participants to authenticated;

create policy "season_participants: members can read"
  on public.season_participants for select
  to authenticated
  using (
    exists (
      select 1
      from public.seasons s
      where s.id = season_id
        and public.is_league_member(s.league_id)
    )
  );

-- Matches, submissions, results, screenshots, disputes, achievements:
-- Members read only. Clients have NO direct INSERT/UPDATE/DELETE access.
-- Phase 4 (fixture generation) and Phase 5 (submit_match_result,
-- confirm_match_result, dispute_match_result, resolve_dispute, achievement awards)
-- will perform all writes via SECURITY DEFINER functions.
revoke all on public.matches from anon, authenticated;
grant select on public.matches to authenticated;

create policy "matches: members can read"
  on public.matches for select
  to authenticated
  using (public.is_league_member(league_id));

revoke all on public.match_submissions from anon, authenticated;
grant select on public.match_submissions to authenticated;

create policy "match_submissions: members can read"
  on public.match_submissions for select
  to authenticated
  using (public.is_league_member(league_id));

revoke all on public.match_results from anon, authenticated;
grant select on public.match_results to authenticated;

create policy "match_results: members can read"
  on public.match_results for select
  to authenticated
  using (public.is_league_member(league_id));

revoke all on public.match_screenshots from anon, authenticated;
grant select on public.match_screenshots to authenticated;

create policy "match_screenshots: members can read"
  on public.match_screenshots for select
  to authenticated
  using (public.is_league_member(league_id));

revoke all on public.result_disputes from anon, authenticated;
grant select on public.result_disputes to authenticated;

create policy "result_disputes: members can read"
  on public.result_disputes for select
  to authenticated
  using (public.is_league_member(league_id));

revoke all on public.achievements from anon, authenticated;
grant select on public.achievements to authenticated;

create policy "achievements: members can read"
  on public.achievements for select
  to authenticated
  using (public.is_league_member(league_id));

-- Notifications: users read and mark read_at on their own rows only.
-- Inserts come from Phase 5 SECURITY DEFINER functions.
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy "notifications: users read own"
  on public.notifications for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "notifications: users mark own read"
  on public.notifications for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
