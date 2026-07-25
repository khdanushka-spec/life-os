# Handover — 2026-07-26

## Goal

Build **AURA OS** — an AI-powered personal life OS — per the vision doc at `docs/VISION.md`. Repo: `khdanushka-spec/life-os` on GitHub, deployed to Vercel project `life-os-k9g4` (team `dkns`, slug **`dkns`** not `dkns1` — see gotchas), live at both `https://life-os-k9g4.vercel.app` and the custom domain `https://aura.dkns.ai`. The user (Dhanu) is a non-engineer-style product owner — explain things plainly, don't assume she'll dig into code herself. She gives large, detailed feature specs and expects a working, deployed result, not just code.

Working through a phase plan (see `README.md` "Phase plan"). Phases 0–3 are done. Phase 4 (life areas) has been the focus across sessions: **Habits, Journal, Finance, and Tasks are all built, redesigned to a premium standard, and deployed.** Health, Learning, Family, Travel remain.

## State

Everything below is committed and pushed to `main`; latest commit is `ca20f3a` (plus an uncommitted Aura Brain rename staged for the next commit — see Next Steps). Habits/Journal/Finance/Tasks builds themselves (commits `ab98013` through `644c9ce`) are unchanged from prior sessions — see history for the full feature list per module. **This whole session was production stabilization, not new features**, working through a chain of issues the user reported live in production one at a time:

1. **`228cb2a`** — Hardened every page-load AI call (Tasks/Journal/Finance) to fail soft on a try/catch instead of crashing the whole page on a transient AI-provider failure. Real hardening, but turned out not to be the actual crash the user hit.
2. **`883ebaf`** — Home's "Smart Timeline" card was fully mocked; made it real (buckets today's actual tasks against the live clock) and added a ticking Brisbane clock + fixed the "today" boundary to use Brisbane time instead of the server's UTC clock.
3. **`5356180`** — **The actual crash**: the account-menu's email label (`DropdownMenuLabel`) was used outside a required `DropdownMenuGroup` wrapper, so Base UI threw `MenuGroupContext is missing` (error #31) the moment *anyone* opened that menu, on *any* authenticated page (it's shared in the Topbar) — that's why it looked like a Home/Tasks-specific bug at first. Fixed, plus a related `nativeButton` warning on Sign Out.
4. **Production AI was turned off, then back on.** User first chose to remove `ANTHROPIC_API_KEY` from Vercel after noticing API charges (fails soft to no-narration everywhere, per "AI narrates, math computes" — computed numbers never depend on AI). Then reconsidered after seeing Aura Brain's "No AI provider available" message and asked to re-add it — she added the real key herself via `vercel env add` (I never have access to the actual key value, only ever saw it masked). Redeployed both times so the change took effect (`vercel deploy --prod` — env var changes don't apply retroactively). **Current state: production AI is ON, using the hosted Anthropic key.**
5. **`d3f66aa`** — Added a "Change password" option to the account menu. This resolved an earlier ambiguous report ("all users get access password change option") — turned out to mean she wanted the feature added, not that it was a bug. New `changePasswordAction` (Supabase session-based `updateUser`, no re-entering the current password) + a dialog wired into `UserMenu`.
6. **`ca20f3a`** — User asked to audit date/time correctness across "all modules." Root cause was systemic: the server (Vercel) runs UTC but the app is Brisbane-based (UTC+10), so every "today" computed via `new Date().toISOString().slice(0,10)` or local date components lagged Brisbane's actual calendar day by up to 10 hours (roughly Brisbane 00:00–10:00). Fixed in 24 files across Habits/Tasks/Journal/Finance — see Key Decisions for the two Brisbane helpers this all runs through now. **Deliberately deferred**: week/month-level boundaries (`startOfWeek`/`startOfMonth`) have the same theoretical issue but a much narrower (~once-a-month) risk window — not fixed this pass.
7. **Uncommitted as of this handover**: renamed "AI Brain" → "Aura Brain" everywhere it's user-facing (nav item, page title, chat placeholder, system prompt, alert copy) per the user's request. The provider badge next to the title (shows "Claude"/"Ollama (...)"/"GPT-4o" — which model is actually active) was left as-is; only the feature's own name changed. Typecheck/lint/build all pass; not yet committed.

## Key decisions

- **"AI narrates, math computes"** — every score/metric is plain deterministic arithmetic; the AI layer only narrates. This is why toggling production AI on/off only ever affects narration text, never the actual numbers/charts.
- **Two distinct Brisbane-time helpers in `lib/date.ts`, not interchangeable:**
  - `startOfBrisbaneDay(date)` — the actual *instant* of Brisbane midnight. Use for range-filtering real `DateTime` columns (`dueDate >= x && dueDate < y`, `completedAt`, `createdAt`).
  - `brisbaneToday(date)` / `brisbaneDateKey(date)` — a value/string whose *UTC* calendar-day components equal Brisbane's calendar date. Use for `@db.Date` columns (`HabitLog.date`, the AI-cache `date` columns, `*Report.periodStart`) and for "which day did this timestamp happen on" bucketing (streaks, heatmaps, calendar dots). Mixing these two up is the exact bug that was just fixed in 24 places — `startOfBrisbaneDay()` is ~10h off from what a `@db.Date` write needs.
- **Production AI is a live toggle now, not a one-time decision** — the user has flipped it off then back on once already based on cost vs. usefulness. Don't assume either state is permanent; check `vercel env ls production` if it matters.
- Prior key decisions (Decimal-boundary handling, `dataviz` skill palettes, TipTap v3 API specifics, `ai` SDK's `Output.object` pattern, Prisma enum-migration friction, `Task.status` enum design, shared recurrence math) are unchanged from earlier sessions — still accurate.

## Files touched

Too many to list individually this session (see commits `228cb2a`, `883ebaf`, `5356180`, `d3f66aa`, `ca20f3a` — each has a detailed message). Worth knowing directly:
- `src/lib/date.ts` — the two Brisbane helpers everything else now depends on.
- `src/components/app-shell/user-menu.tsx`, `src/components/app-shell/change-password-dialog.tsx` (new), `src/server/actions/auth.ts` — account menu crash fix + password-change feature.
- Uncommitted: `src/lib/nav.ts`, `src/app/(app)/ai/page.tsx`, `src/components/ai/chat-panel.tsx`, `src/app/api/chat/route.ts`, `src/server/db-user.ts` (comment only) — Aura Brain rename.

## Gotchas / constraints learned

- **The Vercel MCP tools (`mcp__vercel__*`) are scoped to a different Vercel account/team than the one that owns this project** (`dkns1` vs this project's actual `dkns`) — every call 403'd/404'd. **Use the `vercel` CLI via Bash instead** (`npx vercel ls/logs/inspect/env`) — it's authenticated correctly and everything worked through it.
- **`vercel logs <url> --json --since <window>`** is the fastest way to find a real production error — grep for anything other than `"responseStatusCode":200`. Bot/crawler traffic hits every route unauthenticated and gets clean redirects; don't mistake that for a working authenticated session.
- **`vercel env pull` masks anything marked "Sensitive" as the literal string `[SENSITIVE]`** (`ANTHROPIC_API_KEY`, Supabase keys) — can never be recovered this way. `DATABASE_URL`/`DIRECT_URL` aren't marked Sensitive so they pull with real values, but a stale local `.env.local` copy can have a since-rotated password (`P1000` from Prisma) that says nothing about whether production's own copy still works.
- **Removing/adding a Vercel env var does not affect an already-deployed function** — only the next build. Always follow with `vercel deploy --prod` (or a new push) to make it take effect.
- **A Base UI "production error #N" is decodable at `https://base-ui.com/production-error?code=N`, but only in an actual browser** — `WebFetch` only sees the static loading skeleton, not the JS-rendered real message.
- **A background `vercel logs --follow` piped to a file via `&` inside a Bash call gets killed when that tool call's shell exits**, even with `run_in_background: true` — poll with repeated `--since` windows instead.
- **`AskUserQuestion` continues to go unanswered by this user** — when ignored, state the recommended option and move forward. She does answer as a normal follow-up chat message instead, just never the widget itself.
- Prior gotchas (Bash cwd resetting to `C:\Users\dnand`, the auto-mode classifier blocking direct DB-modifying commands, enum-removal migration conflicts, no working browser login for this app, Base UI `render`-prop-not-`asChild`) are all still accurate.

## Next steps

1. **Commit the Aura Brain rename** (see State #7) — it's finished and verified but sitting uncommitted as of this handover.
2. **Confirm with the user that `/home` and `/tasks` are clean** and that the date/time fixes actually resolved what she saw — the timing-dependent nature of the bug (only visible ~00:00–10:00 Brisbane) makes it hard to verify outside that window.
3. **Ask the user to verify Finance and Tasks end-to-end** (long carried-over) — neither has had full authenticated interactive testing.
4. **Ask which life area is next**: Health, Learning, Family, or Travel. No signal yet.
5. Consider a follow-up pass on week/month-level Brisbane-boundary correctness (see State #6's deferred scope) if it turns out to matter.
6. Lower priority, long-carried-over: delete the duplicate empty `life-os` Vercel project; Supabase custom SMTP; clean up unconfirmed mailinator test accounts.

## Open questions

- Which life area comes after Tasks.
- Whether the user wants Phase-2 deferred items (photos/attachments/OCR/voice/drag-and-drop calendar/CSV import/live FX/live investment prices) built as a follow-up, or considers current scope "done enough" per module.
- Whether production AI stays on now, or gets toggled off again if cost becomes a concern — treat this as a live setting to check, not a settled decision.
