# Handover — 2026-07-26 (Family module complete)

## Status

The Family module (Phase 4 life-area, same quality bar as Habits/Work/Health/Learning) is now **fully built, verified, and ready to deploy**.

Family is structurally different from Health/Learning — there's no natural daily check-in for family the way there is for health or study. It's modeled after **Work** instead: people (`FamilyMember`, like `Client`) + events (`FamilyEvent`, like `Meeting`) + a lightweight per-person log (`GiftIdea`, unique to this module) + documents (`FamilyDocument`, like `WorkDocument`).

- Schema: `FamilyMember` (name, relationship freeform text, birthday `@db.Date`, photoUrl, notes, archived), `FamilyEvent` (+`FamilyEventType` enum: ANNIVERSARY/HOLIDAY/GATHERING/OTHER — deliberately no BIRTHDAY variant, birthdays are derived from `FamilyMember.birthday` instead of duplicated), `GiftIdea` (+`GiftIdeaStatus` enum: IDEA/PURCHASED/GIVEN, required `memberId`, price as Decimal), `FamilyDocument`, `FamilyAiCache`, `FamilyReport` — all added to `prisma/schema.prisma`, applied to the live DB via `npx prisma db push`, client regenerated via `npx prisma generate`.
- `src/lib/family.ts` — relationship presets, event/gift-status meta constants, `daysUntilAnnualDate()` (computes days until the next occurrence of a recurring UTC month/day — birthdays/anniversaries don't have a meaningful year), `splitEventsByTime()` (mirrors Work's `splitMeetingsByTime`), report narrative schema/type. **No momentum-score function** — see decision below.
- `src/lib/ai/family.ts` — `getOrGenerateDailyInsight()` (surfaces birthdays/events in the next 14 days plus any gift ideas still stuck at IDEA status for those people) + `generateFamilyReport()`, mirrors `src/lib/ai/work.ts`.
- `src/server/actions/family.ts` — Member CRUD + archive (mirrors Work's Client archive pattern, not hard-delete-by-default), Event CRUD, GiftIdea CRUD, Document CRUD, `generateFamilyReportAction`.
- `src/components/family/*` — dashboard components (stats row: members/upcoming-birthdays/upcoming-events/open-gift-ideas, insight card, upcoming-birthdays list, upcoming-events list, gift-ideas quick list, members quick list) + all 4 CRUD form dialogs/rows/headers + the report card. Member form has a relationship preset dropdown with an "Other" custom-text fallback, same pattern as Health's workout-type picker.
- `src/app/(app)/family/{page,members,events,gifts,documents,reports}/page.tsx` — dashboard + 5 sub-pages, all built and route-tested.
- Aura Brain chat context (`src/app/api/chat/route.ts`) now includes a Family section (upcoming birthdays next 30 days, upcoming events next 30 days, open gift ideas).
- `src/lib/nav.ts` — `disabled: true` removed from the Family entry.
- **Deliberately NOT wired into Home's Daily Momentum** — see decision below.
- `npx tsc --noEmit`, `npx eslint` (all touched files), and `npx next build` all passed clean on the first attempt — the Health/Learning gotchas (Date.now() purity, Prisma-enum-as-value in client bundles) were avoided proactively again. Dev-server sanity check confirmed all 6 new routes compile and redirect to `/login` cleanly (no server errors in logs).

## Key decision: no Family tile in Home's Daily Momentum

Every other Phase 4 module (Habits, Work, Health, Learning) got wired into Home's `momentum` array because they were **already sitting there as mock placeholder values** before their real module existed — that array was pre-planned to include them. `Family` (and `Travel`) were never in that array. Forcing a synthetic "family score" (e.g. gift-shopping completion rate) would be gimmicky rather than meaningful — Family isn't a daily-behavior domain the way Habits/Health/Learning/Tasks are, and "AI narrates, math computes" only works when the math means something. Family gets full parity everywhere else (dashboard, CRUD, AI insight, reports, Aura Brain) — just not a momentum tile. If Dhanu wants one anyway after seeing it live, that's a scope addition to make then, not a gap now.

## Next steps for a fresh session

1. Confirm this session's commit is pushed and `npx vercel ls --yes` shows `life-os-k9g4` deployed successfully.
2. Spot-check `https://aura.dkns.ai/family`, `/family/members`, `/family/events`, `/family/gifts`, `/family/documents`, `/family/reports` — they'll redirect to `/login` (expected/only verifiable signal without real credentials).
3. No Family work is outstanding. VISION.md's "photos" and "shared reminders" bullets were deliberately deferred (photos = file storage, not built anywhere yet, same as every other module; shared reminders would just duplicate the existing Tasks module) — a scope revision to make later if Dhanu wants it, not a gap now.
4. Phase 4 modules remaining per `nav.ts`: **Travel, Knowledge Vault**. Ask Dhanu which is next, or default to Travel (next in `nav.ts` order) if she doesn't respond (her `AskUserQuestion` widget consistently goes unanswered — state the recommendation and proceed).
5. Knowledge Vault is architecturally different from every module built so far (it's VISION.md's "second brain" — notes/PDFs/images/bookmarks, AI-searchable) rather than another people/events/logs module — expect it to need a different schema shape (likely a single polymorphic `VaultItem` model) and probably real file storage (Vercel Blob or similar), which every module so far has deliberately deferred. Plan for that before starting it, don't just copy the Work/Family shape.
6. Travel (VISION.md: "trips, flights, hotels, packing, countries, wishlist, travel memories") is a closer fit to the established Work/Family shape (Trip as the core entity, like Client/FamilyMember; segments/bookings as repeatable logs) — should be a more straightforward build than Vault when picked up.

## Key decisions (carried forward from prior handovers, still relevant)

- Each Phase 4 module follows one of two shapes: a daily-check-in + repeatable-logs shape (Health, Learning) for domains with a natural daily behavior, or a people/events/logs shape (Work, Family) for domains that are event- and relationship-driven instead. Pick whichever actually fits — don't force a daily check-in onto a domain that doesn't have one (see the Daily Momentum decision above).
- File attachments are consistently deferred everywhere (Work's documents, Health's medical records, Learning's certificates, Family's documents) to a future Knowledge Vault phase — nothing in the app has file upload infra yet.
- Score-computation functions (`computeWellnessScore`, `computeLearningScore`, Finance's `computeHealthScore`) are deliberately named to avoid cross-domain confusion even when they'd otherwise collide semantically. Family has no such function — see decision above.

## Gotchas / constraints learned (carried forward, still relevant — applied proactively this session, no new ones found)

- This sandbox can reach the production Postgres DB directly — `npx prisma db push` works in ~15s, then `npx prisma generate` to regenerate the client (db push doesn't auto-generate on its own here).
- Only one Vercel project (`life-os-k9g4`) should exist for this repo — sanity-check `npx vercel ls --yes` if a deploy seems stuck.
- Dialog-style form components must only mount their stateful body while `open` is true (`{open && <FormBody .../>}`), not reset state via `useEffect` — every dialog in Habits/Work/Health/Learning/Family follows this.
- Zod schemas using `.optional().transform(...)` need `z.input<typeof schema>` (not `z.infer`) for server action parameter types.
- Prisma enum types must be imported with `import type` in client components — a bare value import drags the whole generated Prisma client into the browser bundle and breaks the Turbopack build with a `node:module` chunking error. Use `import type` for the TS type, string literals (e.g. `"IDEA"`) for default values.
- The `react-hooks/purity` ESLint rule flags `Date.now()` called directly in an async Server Component's top-level body as impure. Fix: compute `const now = new Date()` once, derive offsets via `.getTime() ± ms`. Calling it inside a separate non-component helper function does not trigger this rule.
- Any server action invoked directly from client code on a timer/debounce (not a `<form action>`) must NOT be wrapped in the client's own `try/catch` around a `requireDbUser()`-based action, or an expired-session redirect gets silently swallowed (this bit Journal's autosave, fixed in commit `a61f180`). Not relevant to Family - none of its actions run on a debounce.
- Recurring annual dates (birthdays, anniversaries) stored as `@db.Date` need month/day extracted with `getUTCMonth()`/`getUTCDate()` (not local-time getters) to match how the date was parsed/stored (`new Date("YYYY-MM-DD")` → UTC midnight), consistent with `MedicalRecord.followUpDate`'s existing display convention (`toLocaleDateString(..., { timeZone: "UTC" })`).

## Open questions

None blocking.
