# eFootball League Hub

Private eFootball leagues for groups of friends: fixtures, opponent-verified results,
live standings and player stats. Mobile-first, free to host.

**Stack:** Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS 4 ·
shadcn/ui · Supabase (Postgres + RLS, Auth, Storage) · Zod + React Hook Form · Vercel.

## Quick start

```bash
cp .env.example .env.local   # add your Supabase URL + publishable key
npm install
npm run dev
```

Before the app works you need a Supabase project with the migrations applied. See
**[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for the full walkthrough (project, migrations,
auth URLs, email templates, Vercel).

## Scripts

| Command           | What it does                                                   |
| ----------------- | -------------------------------------------------------------- |
| `npm run dev`     | Dev server on http://localhost:3000                            |
| `npm run build`   | Production build                                               |
| `npm run check`   | Typecheck + lint + database policy tests                       |
| `npm run test:db` | Applies all migrations to in-memory Postgres and tests RLS     |

## Docs

- [Architecture, folder structure, data model, design direction](docs/ARCHITECTURE.md)
- [Setup & deployment](docs/DEPLOYMENT.md)

## Build status

| Phase | Scope                                                       | Status |
| ----- | ----------------------------------------------------------- | ------ |
| 1     | Project setup, design system, landing page, authentication | ✅ Done |
| 2     | Schema, RLS, league creation & joining                      | ✅ Done |
| 3     | Player & season management                                  | ✅ Done |
| 4     | Matches & fixture generation                                | Next   |
| 5     | Result submission, screenshots, verification                |        |
| 6     | Standings & statistics                                      |        |
| 7     | Dashboard, notifications, match history                     |        |
| 8     | Testing, security review, deployment                        |        |
