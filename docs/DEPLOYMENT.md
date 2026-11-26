# Setup & Deployment

Everything here runs on free tiers: **Supabase Free** (database, auth, storage) and
**Vercel Hobby** (hosting).

## 1. Create the Supabase project

1. Create a project at <https://supabase.com/dashboard>. Pick the region closest to your players.
2. **Project Settings → API**: copy the **Project URL** and the **publishable key**
   (older projects call it the *anon* key). Do **not** copy the service-role/secret key
   into this app. It isn't needed and must never reach the browser.

## 2. Run the migrations

Apply every file in `supabase/migrations/` **in filename order**.

**Option A: SQL editor (no tools needed).** Open *SQL Editor → New query*, paste
the file contents, run. Repeat for each file.

**Option B: Supabase CLI.**

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

The profiles migration also creates the **`avatars`** storage bucket and its policies,
so there is no manual bucket setup in Phase 1. Later phases add `league-logos` and the
private `match-screenshots` bucket the same way.

After migrating, optionally regenerate TypeScript types:

```bash
npx supabase gen types typescript --project-id <ref> --schema public > src/types/database.ts
```

## 3. Configure Auth

**Authentication → URL Configuration**

| Setting       | Value                                                                     |
| ------------- | ------------------------------------------------------------------------- |
| Site URL      | `https://<your-app>.vercel.app` (use `http://localhost:3000` until deployed) |
| Redirect URLs | `http://localhost:3000/**` and `https://<your-app>.vercel.app/**`            |

**Authentication → Providers → Email**: keep *Confirm email* on for production.
For quick local testing you can turn it off, and registration will then sign users in
immediately.

**Email templates (recommended).** The default links use PKCE (`/auth/callback`),
which only works if the link is opened in the **same browser** that requested it.
Friends often sign up on a laptop and tap the email on their phone, so switch the
templates to the token-hash flow handled by `/auth/confirm`:

- *Confirm signup*:
  `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/dashboard">Confirm your email</a>`
- *Reset password*:
  `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password">Reset your password</a>`

**SMTP note:** Supabase's built-in email sender is rate-limited (a handful per hour)
and intended for testing. For a real group, add free SMTP under *Project Settings →
Auth → SMTP* (e.g. Resend or Brevo free tiers).

## 4. Run locally

```bash
cp .env.example .env.local     # then fill in the values
npm install
npm run dev                    # http://localhost:3000
```

Quality checks:

```bash
npm run check    # typecheck + lint + database policy tests (offline, PGlite)
npm run build    # production build
```

## 5. Deploy to Vercel

1. Push the repository to GitHub (`.env.local` is git-ignored, so keep it that way).
2. In Vercel: **Add New → Project → Import** the repo. The framework is auto-detected.
3. Add the environment variables below for **Production** (and Preview if you use it).
4. Deploy, then put the production URL into Supabase *Site URL* and *Redirect URLs*
   (step 3) and into `NEXT_PUBLIC_SITE_URL`, and redeploy.

## 6. Production environment checklist

| Variable                               | Where it's used      | Notes                                                  |
| -------------------------------------- | -------------------- | ------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`             | browser + server     | Project URL                                            |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | browser + server     | Publishable/anon key. Safe to expose, since RLS protects data |
| `NEXT_PUBLIC_SITE_URL`                 | auth emails, invites | Your Vercel URL, no trailing slash                     |
| `AI_VISION_PROVIDER` / `AI_VISION_API_KEY` | server only (Phase 5) | Optional. The app works fully without them         |

Never set `SUPABASE_SERVICE_ROLE_KEY` with a `NEXT_PUBLIC_` prefix. Phase 1 does not
use it at all.
