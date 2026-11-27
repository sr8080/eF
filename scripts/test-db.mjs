/**
 * Database policy tests. Runs every migration in supabase/migrations against an
 * in-memory Postgres (PGlite) with minimal stand-ins for Supabase's `auth` and
 * `storage` schemas, then checks triggers, RLS and grants behave as intended.
 *
 *   npm run test:db
 *
 * This does not replace testing against a real Supabase project, but it catches
 * SQL errors and policy regressions in seconds, offline.
 */
import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(import.meta.dirname, "..", "supabase", "migrations");
const migrationFiles = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const db = new PGlite();

// --- Minimal stand-ins for what Supabase provides ---------------------------
await db.exec(`
  create role anon; create role authenticated;
  create schema auth;
  create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}'::jsonb);
  create function auth.uid() returns uuid language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean,
    file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable
    as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  grant usage on schema public, auth, storage to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  grant all on storage.objects to authenticated, anon;
  alter default privileges in schema public grant all on tables to anon, authenticated;
`);

for (const file of migrationFiles) {
  await db.exec(readFileSync(join(dir, file), "utf8"));
  console.log(`✓ applied ${file}`);
}

// ============================================================================
// profiles (20261122000001)
// ============================================================================

let failures = 0;
const check = (label, cond, extra = "") => {
  console.log(`${cond ? "✓" : "✗"} ${label}${extra ? "  " + extra : ""}`);
  if (!cond) failures++;
};
const one = async (sql, params) => (await db.query(sql, params)).rows[0];

const A = "11111111-1111-1111-1111-111111111111";
const B = "22222222-2222-2222-2222-222222222222";
const C = "33333333-3333-3333-3333-333333333333";

await db.query(`insert into auth.users (id, raw_user_meta_data) values ($1, $2)`, [
  A, { username: "Alex_10", display_name: "  Alex Silva " },
]);
let p = await one(`select * from public.profiles where id = $1`, [A]);
check("signup creates profile with lowercased username", p?.username === "alex_10", JSON.stringify(p?.username));
check("display name trimmed", p?.display_name === "Alex Silva", JSON.stringify(p?.display_name));

await db.query(`insert into auth.users (id, raw_user_meta_data) values ($1, $2)`, [
  B, { username: "alex_10", display_name: "Dup" },
]);
p = await one(`select * from public.profiles where id = $1`, [B]);
check("duplicate username falls back instead of failing signup", p?.username === "player_22222222", p?.username);

await db.query(`insert into auth.users (id) values ($1)`, [C]);
p = await one(`select * from public.profiles where id = $1`, [C]);
check("missing metadata still creates profile", p?.username === "player_33333333" && p?.display_name === "player_33333333");

check("is_username_available: taken (case-insensitive)", (await one(`select public.is_username_available('ALEX_10') v`)).v === false);
check("is_username_available: free", (await one(`select public.is_username_available('newbie') v`)).v === true);

// --- RLS as an authenticated user ------------------------------------------
await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${A}', false);`);

const visible = (await db.query(`select id from public.profiles`)).rows.length;
check("authenticated user can read profiles", visible === 3, `rows=${visible}`);

let r = await db.query(`update public.profiles set display_name = 'Alex S' where id = $1`, [A]);
check("user can update own profile", r.affectedRows === 1);

r = await db.query(`update public.profiles set display_name = 'hacked' where id = $1`, [B]);
check("user cannot update someone else's profile", r.affectedRows === 0);

for (const [label, sql] of [
  ["cannot change own id", `update public.profiles set id = gen_random_uuid() where id = '${A}'`],
  ["cannot backdate created_at", `update public.profiles set created_at = now() - interval '1 year' where id = '${A}'`],
  ["cannot insert profiles directly", `insert into public.profiles (id, username, display_name) values (gen_random_uuid(), 'zz_top', 'x')`],
  ["cannot delete profiles", `delete from public.profiles where id = '${A}'`],
  ["username format enforced", `update public.profiles set username = 'Bad Name!' where id = '${A}'`],
  ["duplicate username rejected on update", `update public.profiles set username = 'player_22222222' where id = '${A}'`],
]) {
  let blocked = false;
  try {
    const res = await db.query(sql);
    blocked = res.affectedRows === 0;
  } catch {
    blocked = true;
  }
  check(label, blocked);
}

// --- Storage policies --------------------------------------------------------
let ok = true;
try { await db.query(`insert into storage.objects (bucket_id, name) values ('avatars', '${A}/avatar-1.png')`); } catch { ok = false; }
check("user can upload into own avatar folder", ok);

ok = false;
try { await db.query(`insert into storage.objects (bucket_id, name) values ('avatars', '${B}/avatar-1.png')`); } catch { ok = true; }
check("user cannot upload into another user's folder", ok);

await db.exec(`reset role; set role anon; select set_config('request.jwt.claim.sub', '', false);`);
const anonRows = (await db.query(`select id from public.profiles`)).rows.length;
check("anonymous visitors cannot read profiles", anonRows === 0, `rows=${anonRows}`);
check("anon can call is_username_available", (await one(`select public.is_username_available('free_name') v`)).v === true);

await db.exec(`reset role;`);
const bucket = await one(`select * from storage.buckets where id = 'avatars'`);
check("avatars bucket created (public, 2MB limit)", bucket?.public === true && Number(bucket.file_size_limit) === 2097152);

// ============================================================================
// Phase 2: leagues, RLS, membership ops, match locks, notifications, storage
// ============================================================================

const D = "44444444-4444-4444-4444-444444444444";
await db.query(`insert into auth.users (id, raw_user_meta_data) values ($1, $2)`, [
  D, { username: "outsider", display_name: "Outsider" },
]);

const asUser = async (uid) => {
  await db.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);`);
};
const asAnon = async () => {
  await db.exec(`reset role; set role anon; select set_config('request.jwt.claim.sub', '', false);`);
};
const mustFail = async (label, fn) => {
  let blocked = false;
  try {
    const res = await fn();
    if (res && typeof res.affectedRows === "number" && res.affectedRows === 0) blocked = true;
  } catch {
    blocked = true;
  }
  check(label, blocked);
};

// Buckets created
const logoBucket = await one(`select * from storage.buckets where id = 'league-logos'`);
check("league-logos bucket created (public, 2MB limit)", logoBucket?.public === true && Number(logoBucket.file_size_limit) === 2097152);
const shotBucket = await one(`select * from storage.buckets where id = 'match-screenshots'`);
check("match-screenshots bucket created (private, 5MB limit)", shotBucket?.public === false && Number(shotBucket.file_size_limit) === 5242880);

// User A creates a league
await asUser(A);
const leagueId = (await one(`select public.create_league('Sunday Super League', 'Friends weekend cup') as id`)).id;
check("create_league returns uuid", typeof leagueId === "string" && leagueId.length === 36);

const createdLeague = await one(`select * from public.leagues where id = $1`, [leagueId]);
check("invite code is 8 unambiguous chars", /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/.test(createdLeague?.invite_code));
const ownerRow = await one(`select * from public.league_members where league_id = $1 and user_id = $2`, [leagueId, A]);
check("creator becomes owner", ownerRow?.role === "owner");

// Invite preview as anon leaks no member data
await asAnon();
const preview = await one(`select * from public.get_league_invite_preview($1)`, [createdLeague.invite_code]);
check(
  "invite preview returns only safe public fields",
  preview?.id === leagueId &&
    preview?.name === "Sunday Super League" &&
    Number(preview?.member_count) === 1 &&
    preview?.is_archived === false &&
    Object.keys(preview).sort().join(",") === "id,is_archived,logo_url,member_count,name",
  Object.keys(preview ?? {}).join(","),
);
const badPreview = await one(`select * from public.get_league_invite_preview('ZZZZZZZZ')`);
check("invalid invite preview returns nothing", badPreview === undefined);

// Non-member D sees nothing
await asUser(D);
check("non-member cannot see league", (await db.query(`select id from public.leagues where id = $1`, [leagueId])).rows.length === 0);
check("non-member cannot see league_members", (await db.query(`select id from public.league_members where league_id = $1`, [leagueId])).rows.length === 0);
await mustFail("non-member cannot join with invalid code", () =>
  db.query(`select public.join_league_by_code('BADCODE1')`),
);

// B and C join by code; joining twice is idempotent
await asUser(B);
const joinedB1 = (await one(`select public.join_league_by_code($1) as id`, [createdLeague.invite_code.toLowerCase()])).id;
const joinedB2 = (await one(`select public.join_league_by_code($1) as id`, [createdLeague.invite_code])).id;
check("join_league_by_code is idempotent", joinedB1 === leagueId && joinedB2 === leagueId);

await asUser(C);
await db.query(`select public.join_league_by_code($1)`, [createdLeague.invite_code]);
const memberCount = Number((await one(`select count(*) c from public.league_members where league_id = $1`, [leagueId])).c);
check("B and C joined as players (3 members)", memberCount === 3, `count=${memberCount}`);

// Player B cannot update league settings or change roles
await asUser(B);
await mustFail("player cannot update league settings", () =>
  db.query(`update public.leagues set name = 'Hacked Name' where id = $1`, [leagueId]),
);
await mustFail("player cannot regenerate invite code", () =>
  db.query(`select public.regenerate_invite_code($1)`, [leagueId]),
);
await mustFail("player cannot change member roles", () =>
  db.query(`select public.set_member_role($1, $2, 'admin')`, [leagueId, C]),
);

// Only owner can change roles
await asUser(A);
await db.query(`select public.set_member_role($1, $2, 'admin')`, [leagueId, B]);
check("owner can promote player to admin", (await one(`select role from public.league_members where league_id = $1 and user_id = $2`, [leagueId, B])).role === "admin");
await mustFail("owner cannot change own role directly", () =>
  db.query(`select public.set_member_role($1, $2, 'admin')`, [leagueId, A]),
);

// Admin B can update settings, cannot change roles, cannot remove owner or another admin
await asUser(B);
const updLeague = await db.query(`update public.leagues set description = 'Updated by admin' where id = $1`, [leagueId]);
check("admin can update active league settings", updLeague.affectedRows === 1);
await mustFail("admin cannot change member roles", () =>
  db.query(`select public.set_member_role($1, $2, 'admin')`, [leagueId, C]),
);
await mustFail("admin cannot remove owner", () =>
  db.query(`select public.remove_member($1, $2)`, [leagueId, A]),
);

// Make C admin as well so we can verify admin cannot remove another admin
await asUser(A);
await db.query(`select public.set_member_role($1, $2, 'admin')`, [leagueId, C]);
await asUser(B);
await mustFail("admin cannot remove another admin", () =>
  db.query(`select public.remove_member($1, $2)`, [leagueId, C]),
);

// Demote C back to player, then admin B can remove player C
await asUser(A);
await db.query(`select public.set_member_role($1, $2, 'player')`, [leagueId, C]);
await asUser(B);
await db.query(`select public.remove_member($1, $2)`, [leagueId, C]);
check("admin can remove player", (await one(`select * from public.league_members where league_id = $1 and user_id = $2`, [leagueId, C])) === undefined);

// Regenerate invite code invalidates old code
const oldCode = createdLeague.invite_code;
const newCode = (await one(`select public.regenerate_invite_code($1) as code`, [leagueId])).code;
check("manager can regenerate invite code", newCode !== oldCode && /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/.test(newCode));
await asUser(C);
await mustFail("old invite code no longer works", () => db.query(`select public.join_league_by_code($1)`, [oldCode]));

// Leave league & transfer ownership
await asUser(A);
await mustFail("owner cannot leave before transferring ownership", () =>
  db.query(`select public.leave_league($1)`, [leagueId]),
);
await db.query(`select public.transfer_ownership($1, $2)`, [leagueId, B]);
const newOwner = await one(`select role from public.league_members where league_id = $1 and user_id = $2`, [leagueId, B]);
const oldOwner = await one(`select role from public.league_members where league_id = $1 and user_id = $2`, [leagueId, A]);
check("transfer_ownership swaps owner and demotes old owner to admin", newOwner?.role === "owner" && oldOwner?.role === "admin");

// Storage rules for league-logos: B (owner) can upload, C (non-member) cannot; transfer back or add C as player to test player rejection
await asUser(C);
await db.query(`select public.join_league_by_code($1)`, [newCode]);
await mustFail("player cannot upload league logo", () =>
  db.query(`insert into storage.objects (bucket_id, name) values ('league-logos', '${leagueId}/logo-1.png')`),
);
await asUser(D);
await mustFail("non-member cannot upload league logo", () =>
  db.query(`insert into storage.objects (bucket_id, name) values ('league-logos', '${leagueId}/logo-2.png')`),
);
await asUser(B);
let logoUploadOk = true;
try {
  await db.query(`insert into storage.objects (bucket_id, name) values ('league-logos', '${leagueId}/logo-3.png')`);
} catch {
  logoUploadOk = false;
}
check("manager can upload league logo under <league_id>/", logoUploadOk);

// Archived league: rejects joins and updates, only owner can archive/unarchive
await asUser(A);
await mustFail("admin cannot archive league", () => db.query(`select public.archive_league($1)`, [leagueId]));
await asUser(B);
await db.query(`select public.archive_league($1)`, [leagueId]);
check("owner can archive league", (await one(`select is_archived from public.leagues where id = $1`, [leagueId])).is_archived === true);

await asUser(D);
await mustFail("non-member cannot join archived league", () =>
  db.query(`select public.join_league_by_code($1)`, [newCode]),
);
await asUser(B);
await mustFail("archived league cannot be updated directly", () =>
  db.query(`update public.leagues set name = 'Archived Edit' where id = $1`, [leagueId]),
);
await mustFail("archived league blocks logo upload", () =>
  db.query(`insert into storage.objects (bucket_id, name) values ('league-logos', '${leagueId}/logo-4.png')`),
);
await db.query(`select public.unarchive_league($1)`, [leagueId]);
check("owner can unarchive league", (await one(`select is_archived from public.leagues where id = $1`, [leagueId])).is_archived === false);

// Player C can leave active league
await asUser(C);
await db.query(`select public.leave_league($1)`, [leagueId]);
check("player can leave league", (await one(`select * from public.league_members where league_id = $1 and user_id = $2`, [leagueId, C])) === undefined);

// Seed a season + match + notifications as postgres to verify client protections
await db.exec(`reset role;`);
const seasonId = (await one(`insert into public.seasons (league_id, name, number, status) values ($1, 'Season 1', 1, 'active') returning id`, [leagueId])).id;
const matchId = (await one(`insert into public.matches (league_id, season_id, player_a_id, player_b_id, created_by) values ($1, $2, $3, $4, $3) returning id`, [leagueId, seasonId, A, B])).id;
const notifA = (await one(`insert into public.notifications (user_id, type, league_id) values ($1, 'league_joined', $2) returning id`, [A, leagueId])).id;
const notifB = (await one(`insert into public.notifications (user_id, type, league_id) values ($1, 'league_joined', $2) returning id`, [B, leagueId])).id;

await asUser(B);
await mustFail("client cannot insert into match_results", () =>
  db.query(`insert into public.match_results (league_id, match_id, score_a, score_b, confirmed_by) values ($1, $2, 2, 1, $3)`, [leagueId, matchId, B]),
);
await mustFail("client cannot update matches.status directly", () =>
  db.query(`update public.matches set status = 'confirmed' where id = $1`, [matchId]),
);
await mustFail("client cannot insert into achievements", () =>
  db.query(`insert into public.achievements (user_id, league_id, season_id, kind) values ($1, $2, $3, 'champion')`, [B, leagueId, seasonId]),
);

// Notifications isolation
const visibleNotifsB = (await db.query(`select id from public.notifications`)).rows;
check("user sees only own notifications", visibleNotifsB.length === 1 && visibleNotifsB[0].id === notifB);
await mustFail("user cannot mark someone else's notification read", () =>
  db.query(`update public.notifications set read_at = now() where id = $1`, [notifA]),
);
const markOwn = await db.query(`update public.notifications set read_at = now() where id = $1`, [notifB]);
check("user can mark own notification read", markOwn.affectedRows === 1);

// ============================================================================
// Phase 3: season lifecycle & participant management
// ============================================================================

// Ensure A and B are both members of leagueId (B is owner, A is admin, C left earlier; rejoin C as player)
await asUser(C);
await db.query(`select public.join_league_by_code($1)`, [newCode]);

// Player C cannot create a season or modify season participants
await asUser(C);
await mustFail("player cannot create a season", () =>
  db.query(`select public.create_season($1, 'Player Draft', null)`, [leagueId]),
);

// Non-member D cannot see seasons or season_participants
await asUser(D);
check("non-member cannot see seasons", (await db.query(`select id from public.seasons where league_id = $1`, [leagueId])).rows.length === 0);

// Admin A creates Season 2 (Season 1 was seeded earlier as active)
await asUser(A);
const s2Id = (await one(`select public.create_season($1, 'Spring Cup', $2::uuid[]) as id`, [leagueId, `{${A},${B}}`])).id;
const s2Row = await one(`select * from public.seasons where id = $1`, [s2Id]);
check("create_season auto-increments number and starts as draft", s2Row?.number === 2 && s2Row?.status === "draft");

// Reject non-league member D as season participant
await mustFail("cannot enroll non-league member into season", () =>
  db.query(`select public.set_season_participants($1, $2::uuid[])`, [s2Id, `{${A},${D}}`]),
);

// Cannot start s2 while Season 1 is still active
await mustFail("cannot start second active season in same league", () =>
  db.query(`select public.start_season($1)`, [s2Id]),
);

// Complete Season 1 (only participant or valid participant allowed as champion)
await db.query(`select public.set_season_participants($1, $2::uuid[])`, [seasonId, `{${A},${B}}`]);
await mustFail("cannot remove participant who already has matches in season", () =>
  db.query(`select public.set_season_participants($1, $2::uuid[])`, [seasonId, `{${A}}`]),
);
await mustFail("cannot set non-participant as champion", () =>
  db.query(`select public.complete_season($1, $2)`, [seasonId, C]),
);
await db.query(`select public.complete_season($1, $2)`, [seasonId, B]);
const s1Done = await one(`select status, champion_id from public.seasons where id = $1`, [seasonId]);
check("complete_season records status and champion", s1Done?.status === "completed" && s1Done?.champion_id === B);

// Completed season participants are locked
await mustFail("cannot modify participants on completed season", () =>
  db.query(`select public.set_season_participants($1, $2::uuid[])`, [seasonId, `{${A},${B},${C}}`]),
);

// Needs >= 2 participants to start a draft season
await db.query(`select public.set_season_participants($1, $2::uuid[])`, [s2Id, `{${A}}`]);
await mustFail("cannot start season with fewer than 2 participants", () =>
  db.query(`select public.start_season($1)`, [s2Id]),
);

// Add A, B, C and start Season 2
await db.query(`select public.set_season_participants($1, $2::uuid[])`, [s2Id, `{${A},${B},${C}}`]);
await db.query(`select public.start_season($1)`, [s2Id]);
const s2Started = await one(`select status, started_at from public.seasons where id = $1`, [s2Id]);
check("start_season activates draft season", s2Started?.status === "active" && s2Started?.started_at !== null);

// Rename & archive Season 2
await db.query(`select public.update_season_name($1, 'Spring Cup Finale')`, [s2Id]);
check("manager can rename active season", (await one(`select name from public.seasons where id = $1`, [s2Id])).name === "Spring Cup Finale");
await db.query(`select public.archive_season($1)`, [s2Id]);
check("manager can archive season", (await one(`select status from public.seasons where id = $1`, [s2Id])).status === "archived");

// Player C cannot start/complete/archive seasons
const s3Id = (await one(`select public.create_season($1, 'Summer Cup', $2::uuid[]) as id`, [leagueId, `{${A},${B}}`])).id;
await asUser(C);
await mustFail("player cannot start season", () => db.query(`select public.start_season($1)`, [s3Id]));
await mustFail("player cannot archive season", () => db.query(`select public.archive_season($1)`, [s3Id]));

// Archived league blocks season creation & mutations
await asUser(B);
await db.query(`select public.archive_league($1)`, [leagueId]);
await mustFail("archived league blocks create_season", () =>
  db.query(`select public.create_season($1, 'Locked Season', null)`, [leagueId]),
);
await mustFail("archived league blocks start_season", () =>
  db.query(`select public.start_season($1)`, [s3Id]),
);

console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
