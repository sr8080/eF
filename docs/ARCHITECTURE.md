# eFootball League Hub — Architecture

## 1. System overview

```
 Browser (mobile-first UI)
   │  React Server Components + small client islands (forms, menus)
   ▼
 Next.js 16 on Vercel (App Router)
   ├─ proxy.ts ............ refreshes the Supabase session cookie on every request,
   │                        redirects unauthenticated users away from /app routes
   ├─ Server Components ... read data with the user's session (RLS applies)
   ├─ Server Actions ...... all mutations; Zod-validated on the server
   └─ Route Handlers ...... auth callback, (later) screenshot-AI extraction
   │
   ▼
 Supabase (free tier)
   ├─ Auth ............... email + password, password reset, email confirmation
   ├─ Postgres ........... tables + RLS + SECURITY DEFINER functions for
   │                       state transitions (submit / confirm / dispute / resolve)
   └─ Storage ............ avatars (public), league-logos (public),
                           match-screenshots (private, league-member-only policies)
```

### Principles

- **The database is the authority.** Every rule that matters (who can submit, who can
  confirm, roles, archive read-only locks) is enforced by RLS policies or Postgres
  functions. UI checks only improve the experience.
- **Non-recursive RLS via `SECURITY DEFINER` helpers.** Policies on `leagues`,
  `league_members` and league-scoped tables call `is_league_member(league_id)`,
  `league_role(league_id)`, `is_league_manager(league_id)` and
  `is_league_archived(league_id)` (`set search_path = ''`) so membership checks never
  recurse.
- **Atomic league, season & match operations.** League operations (`create_league`,
  `get_league_invite_preview` — anon-safe, leaks no member identities,
  `join_league_by_code`, `regenerate_invite_code`, `set_member_role`,
  `remove_member`, `leave_league`, `transfer_ownership`, `archive_league`,
  `unarchive_league`), season lifecycle operations (`create_season`,
  `update_season_name`, `set_season_participants`, `start_season`,
  `complete_season`, `archive_season`), and fixture scheduling operations
  (`create_match`, `generate_round_robin_fixtures`, `update_match_schedule`,
  `cancel_match`) execute in Postgres with authorization enforced inside SQL.
- **Mutations go through Server Actions** that validate with the same Zod schema the
  client form uses (`src/lib/validations/*`). One schema, two enforcement points.
- **Result lifecycle changes go through Postgres functions** (`submit_match_result`,
  `confirm_match_result`, `dispute_match_result`, `resolve_dispute`, added in Phase 5).
  They run in a single transaction, write the audit trail, and create notifications.
  Clients have no direct INSERT/UPDATE/DELETE access to `matches.status`,
  `match_results`, or `achievements`.
- **Standings are derived, never stored as truth.** A SQL view
  (`season_standings`) computes the table from `Confirmed` matches. Head-to-head
  tie-breaks are applied in TypeScript (`src/lib/standings.ts`) because they depend on
  the set of tied players.
- **AI is a pluggable suggestion.** `src/lib/ai/` defines a `ScreenshotExtractor`
  interface. With no key configured, the `none` provider returns `null` and the user
  types the score. Extracted values only pre-fill a form; nothing reaches standings
  without opponent confirmation.
- **Service-role key is never used in the browser.** It is not required at all in
  Phases 1–2; all data access uses the caller's session with RLS.

## 2. Folder structure

```
.
├─ docs/                      architecture, deployment, storage setup
├─ supabase/
│  ├─ migrations/             numbered SQL files (schema, RLS, functions, storage)
│  └─ seed.sql                optional dev-only sample data
├─ src/
│  ├─ app/
│  │  ├─ (marketing)/         public landing page
│  │  ├─ (auth)/              login, register, forgot/reset password
│  │  ├─ auth/                callback + confirm route handlers
│  │  ├─ join/               /join code entry + /join/[code] public invite preview
│  │  └─ (app)/               authenticated shell (sidebar + bottom nav)
│  │     ├─ dashboard/
│  │     ├─ leagues/
│  │     │  ├─ new/
│  │     │  └─ [leagueId]/    overview, seasons, fixtures, participants, settings,
│  │     │                    matches/[matchId] (standings, stats, gallery planned)
│  │     ├─ matches/          my matches across leagues
│  │     ├─ players/[userId]/ player profile, shared leagues, seasons, achievements
│  │     ├─ notifications/
│  │     └─ settings/         profile, avatar, password
│  ├─ components/
│  │  ├─ ui/                  shadcn/ui primitives
│  │  ├─ layout/              app shell, sidebar, bottom nav, page header
│  │  ├─ brand/               logo
│  │  └─ <feature>/           auth, settings, leagues, seasons, matches ... components
│  ├─ lib/
│  │  ├─ supabase/            server / browser / proxy clients
│  │  ├─ validations/         Zod schemas shared by forms and actions
│  │  ├─ actions/             server actions grouped by domain
│  │  ├─ leagues.ts           cached league data access helpers
│  │  ├─ seasons.ts           cached season & player profile data access helpers
│  │  ├─ matches.ts           cached match data access helpers & derived status
│  │  ├─ ai/                  screenshot extractor interface + providers
│  │  └─ utils.ts
│  ├─ types/database.ts       hand-maintained / generated Supabase types
│  └─ proxy.ts                session refresh + route protection
└─ .env.example
```

## 3. Database relationship overview

```
auth.users 1─1 profiles
profiles   1─* leagues (owner_id)                 8-char invite_code, is_archived, points_win/draw/loss
leagues    1─* league_members *─1 profiles        role: owner | admin | player (1 owner per league)
leagues    1─* seasons                            status: draft | active | completed | archived (≤ 1 active/league)
seasons    1─* season_participants *─1 profiles   unique (season_id, user_id)
seasons    1─* matches                            player_a_id <> player_b_id → profiles, round, scheduled_at
matches    1─* match_submissions                  every proposed score (audit trail: manual|screenshot_ai, submission|correction|admin_resolution)
matches    1─0..1 match_results                   the official, confirmed score
matches    1─* match_screenshots                  storage object paths + optional ai_extraction jsonb
matches    1─* result_disputes                    reason, status (open|resolved), resolved_by, resolution_note
profiles   1─* notifications                      users read and mark read_at on their own rows only
profiles   1─* achievements                       per league/season
```

Match status machine (enforced in Postgres functions):

```
scheduled ──submit──▶ awaiting_confirmation ──confirm──▶ confirmed
    │                        │                              │
    │                        └──dispute──▶ disputed ──admin resolve──▶ confirmed
    └──admin cancel──▶ cancelled                admin correction ─────┘ (audited)
```

`pending_result` is used for a scheduled match whose date has passed without a
submission (computed, so we never need a cron job on the free tier).

## 4. UI design direction

- **Mood:** esports match centre, not admin panel. Near-black navy canvas
  (`#070B14`), raised surfaces one step lighter, hairline borders instead of shadows.
- **Accent:** electric green (`#22F07A`) for primary actions, wins, live states;
  subtle blue (`#3B82F6`) for links and info; amber for pending; red for disputes/losses.
- **Type:** Geist Sans for UI, Geist Mono with tabular numbers for scores and tables.
  Scores are the hero element and use large mono numerals.
- **Density:** compact rows (44px tap targets), tables that collapse into stacked rows
  on phones, cards with 12–16px padding.
- **Navigation:** fixed bottom tab bar on mobile (Home, Leagues, Submit, Alerts, Me),
  collapsible sidebar from `md` up.
- **Motion:** 150–200ms colour/opacity transitions only; no bouncing or parallax.
