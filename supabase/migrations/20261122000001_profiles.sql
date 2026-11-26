-- =============================================================================
-- Phase 1: profiles + avatar storage
-- =============================================================================
-- One profile per auth user. Created automatically by a trigger on signup so the
-- client never needs INSERT rights on this table.

-- Shared helper: keep updated_at current on every UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  username      text not null,
  display_name  text not null,
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,20}$'),
  constraint profiles_display_name_length check (char_length(btrim(display_name)) between 1 and 40)
);

create unique index profiles_username_key on public.profiles (username);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Auto-create a profile on signup.
-- Username/display name come from signUp({ options: { data: {...} } }).
-- If the requested username is missing, malformed or already taken (race with
-- another signup), fall back to a generated one so signup never fails here;
-- the user can change it in Settings.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text := lower(coalesce(new.raw_user_meta_data ->> 'username', ''));
  requested_display  text := btrim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  final_username     text;
begin
  if requested_username ~ '^[a-z0-9_]{3,20}$'
     and not exists (select 1 from public.profiles where username = requested_username) then
    final_username := requested_username;
  else
    final_username := 'player_' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;

  if char_length(requested_display) not between 1 and 40 then
    requested_display := final_username;
  end if;

  insert into public.profiles (id, username, display_name)
  values (new.id, final_username, requested_display);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Lets the register form give a friendly "username taken" error before signup.
-- SECURITY DEFINER so anonymous visitors can call it without SELECT on profiles;
-- it only reveals a boolean.
create or replace function public.is_username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.profiles where username = lower(p_username)
  );
$$;

revoke all on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;

-- Signed-in users can see basic public profile fields (needed to invite players
-- by username and to render opponents). Anonymous visitors see nothing.
create policy "profiles: authenticated can read"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles: users update own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- No INSERT/DELETE policies: inserts happen via trigger, deletes cascade from auth.users.

-- Column-level guard: clients may only change these columns.
revoke update on public.profiles from authenticated;
grant update (username, display_name, avatar_url) on public.profiles to authenticated;

-- =============================================================================
-- Storage: avatars (public read, owner-only write)
-- Files live at avatars/<user_id>/<filename>
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars', 'avatars', true, 2097152,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create policy "avatars: public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars: owner can upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars: owner can update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars: owner can delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
