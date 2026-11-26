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
  confirm, roles) is enforced by RLS policies or Postgres functions. UI checks only
  improve the experience.
- **Mutations go through Server Actions** that validate with the same Zod schema the
  client form uses (`src/lib/validations/*`). One schema, two enforcement points.
- **Result lifecycle changes go through Postgres functions** (`submit_match_result`,
  `confirm_match_result`, `dispute_match_result`, `resolve_dispute`). They run in a
  single transaction, write the audit trail, and create notifications. Clients have no
  direct UPDATE access to `matches.status` or official scores.
- **Standings are derived, never stored as truth.** A SQL view
  (`season_standings`) computes the table from `Confirmed` matches. Head-to-head
  tie-breaks are applied in TypeScript (`src/lib/standings.ts`) because they depend on
  the set of tied players.
- **AI is a pluggable suggestion.** `src/lib/ai/` defines a `ScreenshotExtractor`
  interface. With no key configured, the `none` provider returns `null` and the user
  types the score. Extracted values only pre-fill a form; nothing reaches standings
  without opponent confirmation.
- **Service-role key is never used in the browser.** It is only read in server-only
  modules (guarded with `import "server-only"`) and only where RLS cannot express the
  operation (e.g. none in Phase 1).

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
│  │  ├─ join/[code]/         public join-by-invite page (redirects to login if needed)
│  │  └─ (app)/               authenticated shell (sidebar + bottom nav)
│  │     ├─ dashboard/
│  │     ├─ leagues/
│  │     │  ├─ new/
│  │     │  └─ [leagueId]/    overview, participants, seasons, fixtures, standings,
│  │     │                    stats, gallery, settings, matches/[matchId]
│  │     ├─ matches/          my matches, submit result
│  │     ├─ players/[userId]/
│  │     ├─ notifications/
│  │     └─ settings/         profile, avatar, password
│  ├─ components/
│  │  ├─ ui/                  shadcn/ui primitives
│  │  ├─ layout/              app shell, sidebar, bottom nav, page header
│  │  ├─ brand/               logo
│  │  └─ <feature>/           league, match, standings ... feature components
│  ├─ lib/
│  │  ├─ supabase/            server / browser / proxy clients
│  │  ├─ validations/         Zod schemas shared by forms and actions
│  │  ├─ actions/             server actions grouped by domain
│  │  ├─ ai/                  screenshot extractor interface + providers
│  │  └─ utils.ts
│  ├─ types/database.ts       generated Supabase types
│  └─ proxy.ts                session refresh + route protection
└─ .env.example
```

## 3. Database relationship overview

```
auth.users 1─1 profiles
profiles   1─* leagues (owner_id)
leagues    1─* league_members *─1 profiles        role: owner | admin | player
leagues    1─* seasons                            status: draft | active | completed | archived
seasons    1─* season_participants *─1 profiles   unique (season_id, user_id)
seasons    1─* matches                            player_a_id, player_b_id → profiles
matches    1─* match_submissions                  every proposed score (audit trail)
matches    1─0..1 match_results                   the official, confirmed score
matches    1─* match_screenshots                  storage object paths
matches    1─* result_disputes                    reason, resolution, resolved_by
profiles   1─* notifications
profiles   1─* achievements (per league/season)
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
