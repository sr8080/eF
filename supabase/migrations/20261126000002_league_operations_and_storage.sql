-- =============================================================================
-- Phase 2: atomic league operations and storage buckets/policies
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Internal helper: collision-free 8-char invite code (no 0/O/1/I)
-- -----------------------------------------------------------------------------
create or replace function public.generate_invite_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  raw_bytes bytea;
  candidate text;
  i integer;
begin
  loop
    -- gen_random_uuid() provides 16 CSPRNG bytes; 256 is divisible by 32 so
    -- modulo indexing is unbiased.
    raw_bytes := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
    candidate := '';
    for i in 0..7 loop
      candidate := candidate || substr(alphabet, (get_byte(raw_bytes, i) % 32) + 1, 1);
    end loop;

    exit when not exists (
      select 1 from public.leagues where invite_code = candidate
    );
  end loop;

  return candidate;
end;
$$;

revoke all on function public.generate_invite_code() from public;

-- -----------------------------------------------------------------------------
-- League operations (atomic, authorization enforced inside SQL)
-- -----------------------------------------------------------------------------

create or replace function public.create_league(p_name text, p_description text default '')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_name text := btrim(coalesce(p_name, ''));
  v_desc text := btrim(coalesce(p_description, ''));
  v_code text;
  v_league_id uuid;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED: Sign in to create a league.';
  end if;

  if char_length(v_name) < 3 or char_length(v_name) > 50 then
    raise exception 'INVALID_INPUT: League name must be between 3 and 50 characters.';
  end if;

  if char_length(v_desc) > 280 then
    raise exception 'INVALID_INPUT: Description must be 280 characters or fewer.';
  end if;

  v_code := public.generate_invite_code();

  insert into public.leagues (name, description, owner_id, invite_code)
  values (v_name, v_desc, v_user_id, v_code)
  returning id into v_league_id;

  insert into public.league_members (league_id, user_id, role)
  values (v_league_id, v_user_id, 'owner');

  return v_league_id;
end;
$$;

create or replace function public.get_league_invite_preview(p_code text)
returns table (
  id uuid,
  name text,
  logo_url text,
  member_count bigint,
  is_archived boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    l.id,
    l.name,
    l.logo_url,
    (select count(*) from public.league_members m where m.league_id = l.id) as member_count,
    l.is_archived
  from public.leagues l
  where l.invite_code = upper(btrim(coalesce(p_code, '')));
$$;

create or replace function public.join_league_by_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_league record;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED: Sign in to join a league.';
  end if;

  select id, is_archived
  into v_league
  from public.leagues
  where invite_code = v_code;

  if not found then
    raise exception 'INVALID_INVITE_CODE: No league matches that invite code.';
  end if;

  -- Idempotent for existing members.
  if exists (
    select 1
    from public.league_members
    where league_id = v_league.id
      and user_id = v_user_id
  ) then
    return v_league.id;
  end if;

  if v_league.is_archived then
    raise exception 'LEAGUE_ARCHIVED: This league is archived and not accepting new members.';
  end if;

  insert into public.league_members (league_id, user_id, role)
  values (v_league.id, v_user_id, 'player')
  on conflict (league_id, user_id) do nothing;

  return v_league.id;
end;
$$;

create or replace function public.regenerate_invite_code(p_league_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_archived boolean;
  v_code text;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED: Authentication required.';
  end if;

  select is_archived into v_archived
  from public.leagues
  where id = p_league_id;

  if not found then
    raise exception 'NOT_FOUND: League not found.';
  end if;

  if not public.is_league_manager(p_league_id) then
    raise exception 'FORBIDDEN: Only league managers can regenerate the invite code.';
  end if;

  if v_archived then
    raise exception 'LEAGUE_ARCHIVED: Archived leagues are read-only.';
  end if;

  v_code := public.generate_invite_code();

  update public.leagues
  set invite_code = v_code
  where id = p_league_id;

  return v_code;
end;
$$;

create or replace function public.set_member_role(
  p_league_id uuid,
  p_user_id uuid,
  p_role public.league_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_archived boolean;
  v_target_role public.league_role;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED: Authentication required.';
  end if;

  select is_archived into v_archived
  from public.leagues
  where id = p_league_id;

  if not found then
    raise exception 'NOT_FOUND: League not found.';
  end if;

  if public.league_role(p_league_id) is distinct from 'owner'::public.league_role then
    raise exception 'FORBIDDEN: Only the league owner can change member roles.';
  end if;

  if v_archived then
    raise exception 'LEAGUE_ARCHIVED: Archived leagues are read-only.';
  end if;

  if p_role = 'owner'::public.league_role then
    raise exception 'INVALID_ROLE: Use transfer ownership to make another member the owner.';
  end if;

  select role into v_target_role
  from public.league_members
  where league_id = p_league_id
    and user_id = p_user_id;

  if not found then
    raise exception 'NOT_FOUND: Member not found in this league.';
  end if;

  if v_target_role = 'owner'::public.league_role then
    raise exception 'CANNOT_MODIFY_OWNER: The owner''s role cannot be changed directly.';
  end if;

  update public.league_members
  set role = p_role
  where league_id = p_league_id
    and user_id = p_user_id;
end;
$$;

create or replace function public.remove_member(p_league_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_archived boolean;
  v_caller_role public.league_role;
  v_target_role public.league_role;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED: Authentication required.';
  end if;

  select is_archived into v_archived
  from public.leagues
  where id = p_league_id;

  if not found then
    raise exception 'NOT_FOUND: League not found.';
  end if;

  v_caller_role := public.league_role(p_league_id);
  if v_caller_role not in ('owner'::public.league_role, 'admin'::public.league_role) then
    raise exception 'FORBIDDEN: Only league managers can remove members.';
  end if;

  if v_archived then
    raise exception 'LEAGUE_ARCHIVED: Archived leagues are read-only.';
  end if;

  select role into v_target_role
  from public.league_members
  where league_id = p_league_id
    and user_id = p_user_id;

  if not found then
    raise exception 'NOT_FOUND: Member not found in this league.';
  end if;

  if v_target_role = 'owner'::public.league_role then
    raise exception 'FORBIDDEN: The league owner cannot be removed.';
  end if;

  if v_caller_role = 'admin'::public.league_role and v_target_role = 'admin'::public.league_role then
    raise exception 'FORBIDDEN: Admins cannot remove other admins.';
  end if;

  if p_user_id = v_user_id then
    raise exception 'USE_LEAVE: Use Leave League to leave the league yourself.';
  end if;

  delete from public.league_members
  where league_id = p_league_id
    and user_id = p_user_id;
end;
$$;

create or replace function public.leave_league(p_league_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_archived boolean;
  v_role public.league_role;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED: Authentication required.';
  end if;

  select is_archived into v_archived
  from public.leagues
  where id = p_league_id;

  if not found then
    raise exception 'NOT_FOUND: League not found.';
  end if;

  v_role := public.league_role(p_league_id);
  if v_role is null then
    raise exception 'NOT_FOUND: You are not a member of this league.';
  end if;

  if v_role = 'owner'::public.league_role then
    raise exception 'OWNER_MUST_TRANSFER: Transfer ownership to another member before leaving.';
  end if;

  if v_archived then
    raise exception 'LEAGUE_ARCHIVED: Archived leagues are read-only.';
  end if;

  delete from public.league_members
  where league_id = p_league_id
    and user_id = v_user_id;
end;
$$;

create or replace function public.transfer_ownership(p_league_id uuid, p_new_owner_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_archived boolean;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED: Authentication required.';
  end if;

  select is_archived into v_archived
  from public.leagues
  where id = p_league_id;

  if not found then
    raise exception 'NOT_FOUND: League not found.';
  end if;

  if public.league_role(p_league_id) is distinct from 'owner'::public.league_role then
    raise exception 'FORBIDDEN: Only the league owner can transfer ownership.';
  end if;

  if v_archived then
    raise exception 'LEAGUE_ARCHIVED: Archived leagues are read-only.';
  end if;

  if p_new_owner_id = v_user_id then
    raise exception 'INVALID_TARGET: You are already the league owner.';
  end if;

  if not exists (
    select 1
    from public.league_members
    where league_id = p_league_id
      and user_id = p_new_owner_id
  ) then
    raise exception 'NOT_FOUND: The new owner must already be a member of this league.';
  end if;

  -- Demote current owner first so league_members_one_owner_idx stays satisfied.
  update public.league_members
  set role = 'admin'::public.league_role
  where league_id = p_league_id
    and user_id = v_user_id;

  update public.league_members
  set role = 'owner'::public.league_role
  where league_id = p_league_id
    and user_id = p_new_owner_id;

  update public.leagues
  set owner_id = p_new_owner_id
  where id = p_league_id;
end;
$$;

create or replace function public.archive_league(p_league_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED: Authentication required.';
  end if;

  if not exists (select 1 from public.leagues where id = p_league_id) then
    raise exception 'NOT_FOUND: League not found.';
  end if;

  if public.league_role(p_league_id) is distinct from 'owner'::public.league_role then
    raise exception 'FORBIDDEN: Only the league owner can archive this league.';
  end if;

  update public.leagues
  set is_archived = true,
      archived_at = coalesce(archived_at, now())
  where id = p_league_id;
end;
$$;

create or replace function public.unarchive_league(p_league_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED: Authentication required.';
  end if;

  if not exists (select 1 from public.leagues where id = p_league_id) then
    raise exception 'NOT_FOUND: League not found.';
  end if;

  if public.league_role(p_league_id) is distinct from 'owner'::public.league_role then
    raise exception 'FORBIDDEN: Only the league owner can unarchive this league.';
  end if;

  update public.leagues
  set is_archived = false,
      archived_at = null
  where id = p_league_id;
end;
$$;

revoke all on function public.create_league(text, text) from public;
grant execute on function public.create_league(text, text) to authenticated;

revoke all on function public.get_league_invite_preview(text) from public;
grant execute on function public.get_league_invite_preview(text) to anon, authenticated;

revoke all on function public.join_league_by_code(text) from public;
grant execute on function public.join_league_by_code(text) to authenticated;

revoke all on function public.regenerate_invite_code(uuid) from public;
grant execute on function public.regenerate_invite_code(uuid) to authenticated;

revoke all on function public.set_member_role(uuid, uuid, public.league_role) from public;
grant execute on function public.set_member_role(uuid, uuid, public.league_role) to authenticated;

revoke all on function public.remove_member(uuid, uuid) from public;
grant execute on function public.remove_member(uuid, uuid) to authenticated;

revoke all on function public.leave_league(uuid) from public;
grant execute on function public.leave_league(uuid) to authenticated;

revoke all on function public.transfer_ownership(uuid, uuid) from public;
grant execute on function public.transfer_ownership(uuid, uuid) to authenticated;

revoke all on function public.archive_league(uuid) from public;
grant execute on function public.archive_league(uuid) to authenticated;

revoke all on function public.unarchive_league(uuid) from public;
grant execute on function public.unarchive_league(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Storage: league-logos (public read, manager-only write)
--          match-screenshots (private, league-member-only read)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'league-logos', 'league-logos', true, 2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'match-screenshots', 'match-screenshots', false, 5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

-- league-logos policies (path: <league_id>/<filename>)
create policy "league-logos: public read"
  on storage.objects for select
  using (bucket_id = 'league-logos');

create policy "league-logos: managers can upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'league-logos'
    and exists (
      select 1
      from public.leagues l
      where l.id::text = (storage.foldername(storage.objects.name))[1]
        and not l.is_archived
        and public.is_league_manager(l.id)
    )
  );

create policy "league-logos: managers can update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'league-logos'
    and exists (
      select 1
      from public.leagues l
      where l.id::text = (storage.foldername(storage.objects.name))[1]
        and not l.is_archived
        and public.is_league_manager(l.id)
    )
  );

create policy "league-logos: managers can delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'league-logos'
    and exists (
      select 1
      from public.leagues l
      where l.id::text = (storage.foldername(storage.objects.name))[1]
        and not l.is_archived
        and public.is_league_manager(l.id)
    )
  );

-- match-screenshots policies (path: <league_id>/<match_id>/<filename>)
-- Phase 5 will add upload/delete rules alongside submit_match_result.
create policy "match-screenshots: members can read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'match-screenshots'
    and exists (
      select 1
      from public.matches m
      where m.id::text = (storage.foldername(storage.objects.name))[2]
        and m.league_id::text = (storage.foldername(storage.objects.name))[1]
        and public.is_league_member(m.league_id)
    )
  );
