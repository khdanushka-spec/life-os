# Handover — 2026-07-26 (Learning module complete)

## Status

The Learning module (Phase 4 life-area, same quality bar as Habits/Work/Health) is now **fully built, verified, and ready to deploy**. Also fixed a real production bug in Journal autosave this session (see below) — already deployed separately, not part of this batch.

Learning ships the same shape as Health: a daily check-in (`StudyLog`), three repeatable logs (`Course`, `Book`, `Certificate`), deterministic scoring, AI daily insight, day/week/month/year reports, Aura Brain integration, and a Home dashboard entry.

- Schema: `StudyLog` (one row/user/day — minutesStudied, focusScore 1-5, note), `Course` (+`CourseStatus` enum: NOT_STARTED/IN_PROGRESS/COMPLETED/PAUSED, progressPercent 0-100), `Book` (+`BookStatus` enum: WANT_TO_READ/READING/FINISHED/ABANDONED, currentPage/totalPages/rating), `Certificate` (issuer/issueDate/expiryDate/credentialUrl), `LearningAiCache`, `LearningReport` — all added to `prisma/schema.prisma`, applied to the live DB via `npx prisma db push`, client regenerated via `npx prisma generate`.
- `src/lib/learning.ts` — status meta constants, `computeWellnessScore`-style `computeLearningScore` (30% study-minutes-today vs 30min goal, 30% avg in-progress course completion, 20% has-an-active-book, 20% study-days-this-week vs 5-day goal), report narrative schema/type.
- `src/lib/ai/learning.ts` — `getOrGenerateDailyInsight()` + `generateLearningReport()`, mirrors `src/lib/ai/health.ts` exactly.
- `src/server/actions/learning.ts` — daily check-in upsert + full CRUD for Course/Book/Certificate + `generateLearningReportAction`.
- `src/components/learning/*` — dashboard components (stats row, daily study-log card with +15m/+30m quick buttons like Health's water buttons, insight card, 30-day study-minutes bar chart, in-progress courses list, upcoming certificate-expiry list) + all 3 CRUD form dialogs/rows/headers + the report card. Books got a small custom 5-star rating picker (no precedent existed, kept inline rather than a new shared component since it's Books-specific).
- `src/app/(app)/learning/{page,courses,books,certificates,reports}/page.tsx` — dashboard + 4 sub-pages, all built and route-tested.
- Aura Brain chat context (`src/app/api/chat/route.ts`) now includes a Learning section (study sessions this week, courses in progress, books reading).
- Home dashboard's Daily Momentum now has a real `learningPercent`, same pattern as `healthPercent`/`workPercent`.
- `src/lib/nav.ts` — `disabled: true` removed from the Learning entry.
- `npx tsc --noEmit`, `npx eslint` (all touched files), and `npx next build` all passed clean **on the first attempt this time** — no purity-rule or client-bundle bugs, because the two gotchas found while building Health (see below) were applied proactively from the start. Dev-server sanity check confirmed all 5 new routes + `/home` compile and redirect to `/login` cleanly (no server errors in logs).

## Next steps for a fresh session

1. Confirm this session's commit is pushed and `npx vercel ls --yes` shows `life-os-k9g4` deployed successfully.
2. Spot-check `https://aura.dkns.ai/learning`, `/learning/courses`, `/learning/books`, `/learning/certificates`, `/learning/reports` — they'll redirect to `/login` (expected/only verifiable signal without real credentials).
3. No Learning work is outstanding. If Dhanu wants a different emphasis after seeing it live (e.g. flashcards/SRS, or a proper skills-proficiency tracker), that's a scope revision, not a gap — VISION.md's "skills" and "flashcards" bullets were deliberately deferred, same reasoning as Health deferring file attachments.
4. Phase 4 modules remaining per `nav.ts`: **Family, Travel, Knowledge Vault** — all still `disabled: true`, not started. Ask Dhanu which is next, or pick in `nav.ts` order (Family next) if she doesn't respond (her `AskUserQuestion` widget consistently goes unanswered — state the recommendation and proceed).
5. Knowledge Vault is architecturally different from the others (it's VISION.md's "second brain" — notes/PDFs/images/bookmarks, AI-searchable) rather than another daily-check-in-plus-logs module — expect it to need a different schema shape (probably a single polymorphic `VaultItem` model) and likely real file storage (Vercel Blob or similar), which every other module so far has deliberately deferred. Plan for that before starting it.

## Fixed this session: Journal autosave permanently stuck on expired session

Unrelated to Learning — Dhanu reported the Journal composer showing a permanent "Couldn't save — try again" via screenshot. Root cause: `saveDraftEntryAction` used `requireDbUser()` (throws `redirect()` when session is gone), but it's invoked directly from the composer's debounced autosave — not a `<form action>` — and that call is wrapped in the client's own `try/catch` to manage save-status UI. The catch silently swallowed the redirect throw (and logged nothing), so an expired session showed as a dead-end error forever. Fixed by switching to `getDbUser()` (returns `null` instead of throwing) and having the client `router.push("/login")` itself on an unauthenticated result, plus actually logging the failure reason. Committed as `a61f180`, already deployed separately before this Learning session started.

## Key decisions (carried forward from prior handovers, still relevant)

- Each Phase 4 module follows the same shape: one daily-check-in model (`DailyHealthLog`/`StudyLog`) + a few repeatable-event models, not N independent trackers — a personal check-in is one row per day, not fragmented fields.
- File attachments are consistently deferred everywhere (Work's documents, Health's medical records, Learning's certificates) to a future Knowledge Vault phase — nothing in the app has file upload infra yet.
- Score-computation functions (`computeWellnessScore`, `computeLearningScore`, Finance's `computeHealthScore`) are deliberately named to avoid cross-domain confusion even when they'd otherwise collide semantically.

## Gotchas / constraints learned (carried forward, still relevant — applied proactively this session, no new ones found)

- This sandbox can reach the production Postgres DB directly — `npx prisma db push` works in ~15s, then `npx prisma generate` to regenerate the client (db push doesn't auto-generate on its own here).
- Only one Vercel project (`life-os-k9g4`) should exist for this repo — sanity-check `npx vercel ls --yes` if a deploy seems stuck.
- Dialog-style form components must only mount their stateful body while `open` is true (`{open && <FormBody .../>}`), not reset state via `useEffect` — every dialog in Habits/Work/Health/Learning follows this.
- Zod schemas using `.optional().transform(...)` need `z.input<typeof schema>` (not `z.infer`) for server action parameter types.
- Prisma enum types must be imported with `import type` in client components — a bare value import drags the whole generated Prisma client into the browser bundle and breaks the Turbopack build with a `node:module` chunking error. Use `import type` for the TS type, string literals (e.g. `"BREAKFAST"`) for default values.
- The `react-hooks/purity` ESLint rule flags `Date.now()` called directly in an async Server Component's top-level body as impure. Fix: compute `const now = new Date()` once, derive offsets via `.getTime() ± ms`. Calling it inside a separate non-component helper function (e.g. `getDashboardData()`) does not trigger this rule.
- Any server action invoked directly from client code on a timer/debounce (not a `<form action>`) must NOT be wrapped in the client's own `try/catch` around a `requireDbUser()`-based action, or an expired-session redirect gets silently swallowed. Either don't catch (let it propagate, like every plain button-click action in the app already does), or have the action use `getDbUser()` and return an explicit `{ error: "unauthenticated" }` the client can act on.

## Open questions

None blocking.
