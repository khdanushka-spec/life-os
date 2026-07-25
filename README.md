# AURA OS

Your life. Beautifully organized. Intelligently guided.

Full product vision: [docs/VISION.md](docs/VISION.md).

**Phases 0–2 are done**, plus a Super Admin auth module (Phase 3.0): the stack is wired up, there's working email/password auth for regular users, a Tasks module, a protected app shell, a Home Dashboard, and a separate local-auth admin panel. Live at [life-os-k9g4.vercel.app](https://life-os-k9g4.vercel.app).

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4 + shadcn/ui (`base-nova` style, neutral base color)
- Framer Motion
- Prisma 7 → PostgreSQL (via Supabase)
- Supabase Auth (`@supabase/ssr`)
- Vercel AI SDK (`ai`) with Anthropic + OpenAI providers

### Note on Next 16

The vision doc specifies Next.js 15; 16.2.11 was the current stable release when this was scaffolded, so that's what got installed. Two conventions changed from 15 that matter going forward:

- `middleware.ts` is now `proxy.ts` (functionally identical, just renamed). See [src/proxy.ts](src/proxy.ts).
- Prisma 7 requires a `prisma.config.ts` at the repo root instead of config in `package.json`, and generates the client to `src/generated/prisma` (gitignored) instead of `node_modules`.

## Getting started

1. Copy `.env.example` to `.env.local` and fill in:
   - `DATABASE_URL` — Supabase transaction pooler connection string (Settings → Database → Connection string), used by the running app
   - `DIRECT_URL` — Supabase session pooler connection string (same page, port 5432), used by `prisma db push` / `migrate`
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` — Supabase project settings → API
   - `SUPER_ADMIN_USERNAME` / `SUPER_ADMIN_PASSWORD` — for the seed script (see [Authentication](#authentication) below)
   - `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` — for AI features (not yet used by any code)
2. Install dependencies: `npm install`
3. Push the schema to your database: `npx prisma db push`
4. Create the first Super Admin: `npx prisma db seed`
5. Run the dev server: `npm run dev`

## Authentication

There are **two separate, deliberately decoupled auth systems**:

### Regular users — Supabase Auth

Email/password via `@supabase/ssr`. Routes: `/login`, `/signup`, protected app under `(app)` (Home, Tasks, ...). Session lives in Supabase's own cookies; `src/lib/supabase/proxy.ts` refreshes it on every request, and each protected layout calls `supabase.auth.getUser()` for the authoritative check. `requireDbUser()` ([src/server/db-user.ts](src/server/db-user.ts)) lazily upserts a row in our own `User` table keyed by the Supabase UID, since Supabase doesn't create one for us.

### Super Admin / future admins — local username+password auth

Fully independent of Supabase, for accounts that shouldn't depend on a third-party identity provider. Routes: `/admin/login` (public), `/admin` (protected, in an `(protected)` route group so the login page itself isn't wrapped by the auth check).

- **Password hashing**: Argon2id via `@node-rs/argon2` ([src/lib/auth/password.ts](src/lib/auth/password.ts)), OWASP-recommended parameters.
- **Sessions**: DB-backed, not JWT ([src/lib/auth/session.ts](src/lib/auth/session.ts)). A random token goes in an `httpOnly`/`secure`/`sameSite=lax` cookie; only its SHA-256 hash is stored in the `Session` table, so a leaked DB row can't be replayed as a cookie. 30-day sliding expiration.
- **Route protection**: `src/proxy.ts` does a cheap cookie-presence check on `/admin/*` and redirects to `/admin/login` if it's missing — this is optimistic only, matching the [Proxy docs'](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) guidance against slow work in Proxy. The authoritative check (does the session hash exist, is it expired, does the role qualify) happens in [`src/app/admin/(protected)/layout.tsx`](<src/app/admin/(protected)/layout.tsx>) via `requireAdminUser()`.
- **Roles**: `SUPER_ADMIN` > `ADMIN` > `USER` on the same `User` table used by Supabase users (`role` column, defaults to `USER`). `requireAdminUser(minRole)` checks rank, not exact match, so `SUPER_ADMIN` passes an `ADMIN`-gated route.
- **Bootstrapping**: `prisma/seed.ts` creates the first Super Admin from `SUPER_ADMIN_USERNAME` / `SUPER_ADMIN_PASSWORD` env vars if a user with that username doesn't already exist. It skips (doesn't error) if those vars aren't set, so it's safe in environments that haven't configured them yet.
- **Adding more providers later** (Email magic link, Google, Apple, Passkeys) for *regular* users: extend the Supabase side (Supabase supports all of these natively) — the admin module doesn't need to change, since it's a separate code path sharing only the `User`/role schema.

Local dev note: because the `User.email` field is now nullable (to support username-only admin accounts), anywhere that reads `dbUser.email` needs an `?? fallback` — see [src/app/(app)/home/page.tsx](<src/app/(app)/home/page.tsx>) for the pattern.

## Project structure

```
src/
  app/                 # Next.js App Router routes
  components/
    ui/                # shadcn/ui primitives
    features/          # feature-specific components (per life area)
  lib/
    supabase/          # Supabase browser/server clients + proxy session refresh
    prisma.ts          # Prisma client singleton
    utils.ts           # shadcn `cn()` helper
  server/              # server-only logic (actions, AI orchestration, etc.)
  hooks/               # shared React hooks
  types/               # shared TypeScript types
  generated/prisma/    # generated Prisma client (gitignored)
prisma/
  schema.prisma        # data model
docs/
  VISION.md            # full product vision doc
```

## Phase plan

- **Phase 0 (done)** — stack scaffold: Next.js, Tailwind, shadcn/ui, Prisma, Supabase auth wiring, AI SDK installed.
- **Phase 1 (done)** — Auth (login/signup/logout via Supabase), protected app shell (sidebar, mobile nav, user menu, dark/light mode), Home Dashboard with mock data (Morning Briefing, Today's Focus, Smart Timeline, Daily Momentum, AI Suggestions), loading/error states.
- **Phase 2 (done)** — Tasks module (data model + CRUD UI), Home Dashboard's Today's Focus wired to real task data.
- **Phase 3.0 (done)** — Super Admin authentication: local username/password auth, Argon2 hashing, DB-backed sessions, role-based authorization, seed script. See [Authentication](#authentication).
- **Phase 3 (in progress)** — AI Brain: chat interface backed by the AI SDK, retrieval over stored data, natural-language search.
- **Phase 4** — Remaining life areas (Health, Finance, Learning, Family, Travel, Journal) one at a time, each following the same data model + UI + AI pattern.
- **Phase 5** — Knowledge Vault (file storage, OCR, search indexing), Smart Automation rules engine.
- **Phase 6** — PWA/offline support, mobile polish (widgets, quick actions, camera scanning), desktop polish (keyboard shortcuts, multi-window).

Each phase should ship fully functional before the next starts.
