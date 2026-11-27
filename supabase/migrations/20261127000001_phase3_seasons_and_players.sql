-- =============================================================================
-- Phase 3: season lifecycle & participant management functions
-- =============================================================================

create or replace function public.create_season(
  p_league_id uuid,
  p_name text,
  p_participant_ids uuid[] default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_name text := btrim(coalesce(p_name, ''));
  v_archived boolean;
  v_next_number integer;
  v_season_id uuid;
  v_pid uuid;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED: Sign in to create a season.';
  end if;

  select is_archived into v_archived
  from public.leagues
  where id = p_league_id;

  if not found then
    raise exception 'NOT_FOUND: League not found.';
  end if;

  if not public.is_league_manager(p_league_id) then
    raise exception 'FORBIDDEN: Only league managers can create seasons.';
  end if;

  if v_archived then
    raise exception 'LEAGUE_ARCHIVED: Archived leagues are read-only.';
  end if;

  if char_length(v_name) < 1 or char_length(v_name) > 60 then
    raise exception 'INVALID_INPUT: Season name must be between 1 and 60 characters.';
  end if;

  select coalesce(max(number), 0) + 1
  into v_next_number
  from public.seasons
  where league_id = p_league_id;

  insert into public.seasons (league_id, name, number, status)
  values (p_league_id, v_name, v_next_number, 'draft'::public.season_status)
  returning id into v_season_id;

  if p_participant_ids is not null then
    foreach v_pid in array p_participant_ids loop
      if not exists (
        select 1
        from public.league_members
        where league_id = p_league_id
          and user_id = v_pid
      ) then
        raise exception 'INVALID_PARTICIPANT: Every participant must be a member of the league.';
      end if;

      insert into public.season_participants (season_id, user_id)
      values (v_season_id, v_pid)
      on conflict (season_id, user_id) do nothing;
    end loop;
  end if;

  return v_season_id;
end;
$$;

create or replace function public.update_season_name(p_season_id uuid, p_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_name text := btrim(coalesce(p_name, ''));
  v_season record;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED: Authentication required.';
  end if;

  select s.id, s.league_id, s.status, l.is_archived
  into v_season
  from public.seasons s
  join public.leagues l on l.id = s.league_id
  where s.id = p_season_id;

  if not found then
    raise exception 'NOT_FOUND: Season not found.';
  end if;

  if not public.is_league_manager(v_season.league_id) then
    raise exception 'FORBIDDEN: Only league managers can rename seasons.';
  end if;

  if v_season.is_archived then
    raise exception 'LEAGUE_ARCHIVED: Archived leagues are read-only.';
  end if;

  if v_season.status = 'archived'::public.season_status then
    raise exception 'SEASON_LOCKED: Archived seasons cannot be modified.';
  end if;

  if char_length(v_name) < 1 or char_length(v_name) > 60 then
    raise exception 'INVALID_INPUT: Season name must be between 1 and 60 characters.';
  end if;

  update public.seasons
  set name = v_name
  where id = p_season_id;
end;
$$;

create or replace function public.set_season_participants(
  p_season_id uuid,
  p_user_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_season record;
  v_pid uuid;
  v_clean_ids uuid[] := coalesce(p_user_ids, array[]::uuid[]);
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED: Authentication required.';
  end if;

  select s.id, s.league_id, s.status, l.is_archived
  into v_season
  from public.seasons s
  join public.leagues l on l.id = s.league_id
  where s.id = p_season_id;

  if not found then
    raise exception 'NOT_FOUND: Season not found.';
  end if;

  if not public.is_league_manager(v_season.league_id) then
    raise exception 'FORBIDDEN: Only league managers can update season participants.';
  end if;

  if v_season.is_archived then
    raise exception 'LEAGUE_ARCHIVED: Archived leagues are read-only.';
  end if;

  if v_season.status not in ('draft'::public.season_status, 'active'::public.season_status) then
    raise exception 'SEASON_LOCKED: Completed or archived seasons cannot be modified.';
  end if;

  foreach v_pid in array v_clean_ids loop
    if not exists (
      select 1
      from public.league_members
      where league_id = v_season.league_id
        and user_id = v_pid
    ) then
      raise exception 'INVALID_PARTICIPANT: Every participant must be a member of the league.';
    end if;
  end loop;

  -- Prevent removing players who already have matches in this season.
  if exists (
    select 1
    from public.season_participants sp
    where sp.season_id = p_season_id
      and not (sp.user_id = any(v_clean_ids))
      and exists (
        select 1
        from public.matches m
        where m.season_id = p_season_id
          and (m.player_a_id = sp.user_id or m.player_b_id = sp.user_id)
      )
  ) then
    raise exception 'PARTICIPANT_HAS_MATCHES: Cannot remove a player who already has matches in this season.';
  end if;

  delete from public.season_participants
  where season_id = p_season_id
    and not (user_id = any(v_clean_ids));

  foreach v_pid in array v_clean_ids loop
    insert into public.season_participants (season_id, user_id)
    values (p_season_id, v_pid)
    on conflict (season_id, user_id) do nothing;
  end loop;
end;
$$;

create or replace function public.start_season(p_season_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_season record;
  v_participant_count bigint;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED: Authentication required.';
  end if;

  select s.id, s.league_id, s.status, l.is_archived
  into v_season
  from public.seasons s
  join public.leagues l on l.id = s.league_id
  where s.id = p_season_id;

  if not found then
    raise exception 'NOT_FOUND: Season not found.';
  end if;

  if not public.is_league_manager(v_season.league_id) then
    raise exception 'FORBIDDEN: Only league managers can start seasons.';
  end if;

  if v_season.is_archived then
    raise exception 'LEAGUE_ARCHIVED: Archived leagues are read-only.';
  end if;

  if v_season.status <> 'draft'::public.season_status then
    raise exception 'INVALID_STATUS: Only draft seasons can be started.';
  end if;

  select count(*) into v_participant_count
  from public.season_participants
  where season_id = p_season_id;

  if v_participant_count < 2 then
    raise exception 'NEEDS_PARTICIPANTS: Add at least 2 participants before starting a season.';
  end if;

  if exists (
    select 1
    from public.seasons
    where league_id = v_season.league_id
      and status = 'active'::public.season_status
      and id <> p_season_id
  ) then
    raise exception 'ACTIVE_SEASON_EXISTS: Complete or archive the active season before starting a new one.';
  end if;

  update public.seasons
  set status = 'active'::public.season_status,
      started_at = coalesce(started_at, now())
  where id = p_season_id;
end;
$$;

create or replace function public.complete_season(
  p_season_id uuid,
  p_champion_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_season record;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED: Authentication required.';
  end if;

  select s.id, s.league_id, s.status, l.is_archived
  into v_season
  from public.seasons s
  join public.leagues l on l.id = s.league_id
  where s.id = p_season_id;

  if not found then
    raise exception 'NOT_FOUND: Season not found.';
  end if;

  if not public.is_league_manager(v_season.league_id) then
    raise exception 'FORBIDDEN: Only league managers can complete seasons.';
  end if;

  if v_season.is_archived then
    raise exception 'LEAGUE_ARCHIVED: Archived leagues are read-only.';
  end if;

  if v_season.status <> 'active'::public.season_status then
    raise exception 'INVALID_STATUS: Only active seasons can be completed.';
  end if;

  if p_champion_id is not null and not exists (
    select 1
    from public.season_participants
    where season_id = p_season_id
      and user_id = p_champion_id
  ) then
    raise exception 'INVALID_CHAMPION: Champion must be a participant in this season.';
  end if;

  update public.seasons
  set status = 'completed'::public.season_status,
      ended_at = coalesce(ended_at, now()),
      champion_id = p_champion_id
  where id = p_season_id;
end;
$$;

create or replace function public.archive_season(p_season_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_season record;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED: Authentication required.';
  end if;

  select s.id, s.league_id, s.status, l.is_archived
  into v_season
  from public.seasons s
  join public.leagues l on l.id = s.league_id
  where s.id = p_season_id;

  if not found then
    raise exception 'NOT_FOUND: Season not found.';
  end if;

  if not public.is_league_manager(v_season.league_id) then
    raise exception 'FORBIDDEN: Only league managers can archive seasons.';
  end if;

  if v_season.is_archived then
    raise exception 'LEAGUE_ARCHIVED: Archived leagues are read-only.';
  end if;

  if v_season.status = 'archived'::public.season_status then
    return;
  end if;

  update public.seasons
  set status = 'archived'::public.season_status,
      ended_at = coalesce(ended_at, now())
  where id = p_season_id;
end;
$$;

revoke all on function public.create_season(uuid, text, uuid[]) from public;
grant execute on function public.create_season(uuid, text, uuid[]) to authenticated;

revoke all on function public.update_season_name(uuid, text) from public;
grant execute on function public.update_season_name(uuid, text) to authenticated;

revoke all on function public.set_season_participants(uuid, uuid[]) from public;
grant execute on function public.set_season_participants(uuid, uuid[]) to authenticated;

revoke all on function public.start_season(uuid) from public;
grant execute on function public.start_season(uuid) to authenticated;

revoke all on function public.complete_season(uuid, uuid) from public;
grant execute on function public.complete_season(uuid, uuid) to authenticated;

revoke all on function public.archive_season(uuid) from public;
grant execute on function public.archive_season(uuid) to authenticated;
