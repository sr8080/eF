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

console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
