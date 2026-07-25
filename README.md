# AURA OS

Your life. Beautifully organized. Intelligently guided.

Full product vision: [docs/VISION.md](docs/VISION.md).

**Phase 0 and Phase 1 are done**: the stack is wired up, and there's working email/password auth, a protected app shell, and a Home Dashboard with mock data. Live at [life-os-k9g4.vercel.app](https://life-os-k9g4.vercel.app).

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
   - `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` — for AI features (not yet used by any code)
2. Install dependencies: `npm install`
3. Push the schema to your database: `npx prisma db push`
4. Run the dev server: `npm run dev`

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
- **Phase 2** — First real life-area module end-to-end (data model + CRUD UI + AI awareness) — likely Tasks/Projects, since most other areas depend on it existing. Also: replace Home Dashboard mock data with real data once Tasks exist.
- **Phase 3** — AI Brain: chat interface backed by the AI SDK, retrieval over stored data, natural-language search.
- **Phase 4** — Remaining life areas (Health, Finance, Learning, Family, Travel, Journal) one at a time, each following the same data model + UI + AI pattern.
- **Phase 5** — Knowledge Vault (file storage, OCR, search indexing), Smart Automation rules engine.
- **Phase 6** — PWA/offline support, mobile polish (widgets, quick actions, camera scanning), desktop polish (keyboard shortcuts, multi-window).

Each phase should ship fully functional before the next starts.
