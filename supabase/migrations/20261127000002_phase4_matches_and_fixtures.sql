-- =============================================================================
-- Phase 4: match scheduling, round-robin fixture generation & cancellation
-- =============================================================================

create or replace function public.create_match(
  p_season_id uuid,
  p_player_a_id uuid,
  p_player_b_id uuid,
  p_round integer default null,
  p_scheduled_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_season record;
  v_match_id uuid;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED: Sign in to create a match.';
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
    raise exception 'FORBIDDEN: Only league managers can schedule matches.';
  end if;

  if v_season.is_archived then
    raise exception 'LEAGUE_ARCHIVED: Archived leagues are read-only.';
  end if;

  if v_season.status not in ('draft'::public.season_status, 'active'::public.season_status) then
    raise exception 'SEASON_LOCKED: Matches cannot be added to completed or archived seasons.';
  end if;

  if p_player_a_id is null or p_player_b_id is null or p_player_a_id = p_player_b_id then
    raise exception 'INVALID_INPUT: Choose two different players.';
  end if;

  if p_round is not null and p_round < 1 then
    raise exception 'INVALID_INPUT: Round must be 1 or greater.';
  end if;

  if not exists (
    select 1
    from public.season_participants
    where season_id = p_season_id
      and user_id = p_player_a_id
  ) or not exists (
    select 1
    from public.season_participants
    where season_id = p_season_id
      and user_id = p_player_b_id
  ) then
    raise exception 'INVALID_PARTICIPANT: Both players must be enrolled in this season.';
  end if;

  insert into public.matches (
    league_id,
    season_id,
    player_a_id,
    player_b_id,
    scheduled_at,
    status,
    round,
    created_by
  )
  values (
    v_season.league_id,
    p_season_id,
    p_player_a_id,
    p_player_b_id,
    p_scheduled_at,
    'scheduled'::public.match_status,
    p_round,
    v_user_id
  )
  returning id into v_match_id;

  return v_match_id;
end;
$$;

create or replace function public.generate_round_robin_fixtures(
  p_season_id uuid,
  p_double_round_robin boolean default false,
  p_start_at timestamptz default null,
  p_interval_days integer default 7
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_season record;
  v_players uuid[];
  v_count integer;
  v_ring uuid[];
  v_m integer;
  v_rounds integer;
  v_half integer;
  v_r integer;
  v_i integer;
  v_a uuid;
  v_b uuid;
  v_tmp uuid;
  v_sched timestamptz;
  v_inserted integer := 0;
  v_leg integer;
  v_max_legs integer;
  v_round_num integer;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED: Sign in to generate fixtures.';
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
    raise exception 'FORBIDDEN: Only league managers can generate fixtures.';
  end if;

  if v_season.is_archived then
    raise exception 'LEAGUE_ARCHIVED: Archived leagues are read-only.';
  end if;

  if v_season.status not in ('draft'::public.season_status, 'active'::public.season_status) then
    raise exception 'SEASON_LOCKED: Fixtures cannot be generated for completed or archived seasons.';
  end if;

  if p_interval_days is null or p_interval_days < 0 or p_interval_days > 365 then
    raise exception 'INVALID_INPUT: Interval between rounds must be between 0 and 365 days.';
  end if;

  if exists (
    select 1
    from public.matches
    where season_id = p_season_id
      and status <> 'cancelled'::public.match_status
  ) then
    raise exception 'FIXTURES_ALREADY_EXIST: This season already has active fixtures. Add single matches or cancel existing ones first.';
  end if;

  select array_agg(user_id order by random())
  into v_players
  from public.season_participants
  where season_id = p_season_id;

  v_count := coalesce(array_length(v_players, 1), 0);
  if v_count < 2 then
    raise exception 'NEEDS_PARTICIPANTS: Add at least 2 participants before generating fixtures.';
  end if;

  v_ring := v_players;
  if (v_count % 2) = 1 then
    v_ring := array_append(v_ring, null::uuid);
  end if;

  v_m := array_length(v_ring, 1);
  v_rounds := v_m - 1;
  v_half := v_m / 2;
  v_max_legs := case when coalesce(p_double_round_robin, false) then 2 else 1 end;

  for v_leg in 1..v_max_legs loop
    -- Reset ring for leg 2 so pairings mirror leg 1 cleanly with reversed home/away.
    if v_leg = 2 then
      v_ring := v_players;
      if (v_count % 2) = 1 then
        v_ring := array_append(v_ring, null::uuid);
      end if;
    end if;

    for v_r in 1..v_rounds loop
      v_round_num := ((v_leg - 1) * v_rounds) + v_r;
      if p_start_at is not null then
        v_sched := p_start_at + (((v_round_num - 1) * p_interval_days)::text || ' days')::interval;
      else
        v_sched := null;
      end if;

      for v_i in 1..v_half loop
        v_a := v_ring[v_i];
        v_b := v_ring[v_m - v_i + 1];

        if v_a is not null and v_b is not null then
          -- Alternate home/away across rounds and swap for the second leg.
          if ((v_r % 2) = 0) <> (v_leg = 2) then
            v_tmp := v_a;
            v_a := v_b;
            v_b := v_tmp;
          end if;

          insert into public.matches (
            league_id,
            season_id,
            player_a_id,
            player_b_id,
            scheduled_at,
            status,
            round,
            created_by
          )
          values (
            v_season.league_id,
            p_season_id,
            v_a,
            v_b,
            v_sched,
            'scheduled'::public.match_status,
            v_round_num,
            v_user_id
          );

          v_inserted := v_inserted + 1;
        end if;
      end loop;

      -- Circle-method rotation: keep index 1 fixed, rotate 2..v_m clockwise.
      if v_m > 2 then
        v_tmp := v_ring[v_m];
        for v_i in reverse v_m..3 loop
          v_ring[v_i] := v_ring[v_i - 1];
        end loop;
        v_ring[2] := v_tmp;
      end if;
    end loop;
  end loop;

  return v_inserted;
end;
$$;

create or replace function public.update_match_schedule(
  p_match_id uuid,
  p_round integer default null,
  p_scheduled_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_match record;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED: Authentication required.';
  end if;

  select m.id, m.league_id, m.status, s.status as season_status, l.is_archived
  into v_match
  from public.matches m
  join public.seasons s on s.id = m.season_id
  join public.leagues l on l.id = m.league_id
  where m.id = p_match_id;

  if not found then
    raise exception 'NOT_FOUND: Match not found.';
  end if;

  if not public.is_league_manager(v_match.league_id) then
    raise exception 'FORBIDDEN: Only league managers can reschedule matches.';
  end if;

  if v_match.is_archived then
    raise exception 'LEAGUE_ARCHIVED: Archived leagues are read-only.';
  end if;

  if v_match.season_status not in ('draft'::public.season_status, 'active'::public.season_status) then
    raise exception 'SEASON_LOCKED: Matches in completed or archived seasons cannot be modified.';
  end if;

  if v_match.status <> 'scheduled'::public.match_status then
    raise exception 'INVALID_STATUS: Only scheduled matches can be rescheduled.';
  end if;

  if p_round is not null and p_round < 1 then
    raise exception 'INVALID_INPUT: Round must be 1 or greater.';
  end if;

  update public.matches
  set round = p_round,
      scheduled_at = p_scheduled_at
  where id = p_match_id;
end;
$$;

create or replace function public.cancel_match(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_match record;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED: Authentication required.';
  end if;

  select m.id, m.league_id, m.status, s.status as season_status, l.is_archived
  into v_match
  from public.matches m
  join public.seasons s on s.id = m.season_id
  join public.leagues l on l.id = m.league_id
  where m.id = p_match_id;

  if not found then
    raise exception 'NOT_FOUND: Match not found.';
  end if;

  if not public.is_league_manager(v_match.league_id) then
    raise exception 'FORBIDDEN: Only league managers can cancel matches.';
  end if;

  if v_match.is_archived then
    raise exception 'LEAGUE_ARCHIVED: Archived leagues are read-only.';
  end if;

  if v_match.season_status not in ('draft'::public.season_status, 'active'::public.season_status) then
    raise exception 'SEASON_LOCKED: Matches in completed or archived seasons cannot be modified.';
  end if;

  if v_match.status <> 'scheduled'::public.match_status then
    raise exception 'INVALID_STATUS: Only scheduled matches can be cancelled.';
  end if;

  update public.matches
  set status = 'cancelled'::public.match_status
  where id = p_match_id;
end;
$$;

revoke all on function public.create_match(uuid, uuid, uuid, integer, timestamptz) from public;
grant execute on function public.create_match(uuid, uuid, uuid, integer, timestamptz) to authenticated;

revoke all on function public.generate_round_robin_fixtures(uuid, boolean, timestamptz, integer) from public;
grant execute on function public.generate_round_robin_fixtures(uuid, boolean, timestamptz, integer) to authenticated;

revoke all on function public.update_match_schedule(uuid, integer, timestamptz) from public;
grant execute on function public.update_match_schedule(uuid, integer, timestamptz) to authenticated;

revoke all on function public.cancel_match(uuid) from public;
grant execute on function public.cancel_match(uuid) to authenticated;
