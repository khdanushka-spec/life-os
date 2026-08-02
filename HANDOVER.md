# Handover — 2026-08-02 21:30

## Goal

Dhanu is having Claude iteratively rebuild/extend **AURA OS**, her personal life-management app, through a mix of (a) a planned premium UI/UX redesign (Apple/Linear/Arc/Raycast/Notion/Vercel-tier — dark theme, real accent color, motion, command palette) rolled out module-by-module, and (b) a continuous stream of ad-hoc feature requests and bug reports she sends as screenshots while actually using the app day to day. There's no fixed backlog — work this session has been driven entirely by what she screenshots next. Treat this as the ongoing mode of working with her, not a one-off task list to clear.

## State

**Everything described below is committed, pushed, deployed to `aura.dkns.ai`, and confirmed working by Dhanu** ("Yes everything working now", 2026-08-02) — except the very last commit (this handover rewrite), which is committed locally but not yet pushed/deployed as of writing.

**Redesign progress**: Phase 1 (design tokens, App Shell, Home) is done. All 9 module hero/stats rows now use a shared colored `StatCard` component (see Key decisions). The **Tasks page full redesign is not started** — was next in line before an extended Finance feature arc took over the rest of the session (see Next steps #1).

**Finance module** got a large amount of new functionality this session, all real and working:
- **Foreign Accounts** tab (`/finance/foreign`) — accounts/investments in any non-AUD currency, auto-converted to AUD via a daily-refreshed FX API, rolled into net worth everywhere it's computed.
- **Real auto-pay** — a `RecurringPayment` can nominate a `FinancialAccount`; when due, `processDueRecurringPayments()` actually posts the transaction and adjusts the balance (checked lazily on Finance page loads, no cron).
- **Account edit** (name/balance), **low-balance alerts** (projects 3 days ahead, warns below $200), **real account-to-account transfers** (paired signed transactions, proper reversal on delete).
- A **currency-blind balance bug** (raw foreign-currency amounts summed into AUD totals — produced a real ~$11.4M cash-flow glitch) was found and fixed across all the places it existed.

**Health module** gained three new detail pages (`/health/hydration`, `/health/sleep`, `/health/wellness`), each reachable by clicking their `StatCard` on the Health dashboard.

**Aura Brain** (the AI chat) can now `addTask`/`deleteTask` from natural language, not just answer questions read-only.

**Performance**: site-wide auth-check deduplication, Vercel function region moved to `icn1` (co-located with the Seoul DB, was `iad1`), Home/Journal query parallelization, and TipTap/ProseMirror (~880KB) lazy-loaded out of Journal/Task-detail/Vault-detail's initial bundle.

## Key decisions

- **Design tokens cascade, not per-page rewrites.** The single biggest early finding was that every color in the app was pure grayscale (zero OKLCH chroma) — fixing that once in `globals.css` gave ~150 components an accent color without touching per-module code. `StatCard` (`src/components/stat-card.tsx`) is the same idea applied to stat rows: one shared component (icon chip, tinted background wash, animated count-up, optional `href` to make the whole card a link) that all 9 modules' hero rows now import, replacing 7 near-duplicate copies.
- **Foreign Accounts was built LKR-only first, then generalized** once Dhanu asked to rename it "Foreign Accounts" — a rename-only change would have been misleading since the feature was hardcoded to one currency. The underlying conversion logic (`src/lib/fx.ts`, `computeNetWorth`) was written currency-generic from the start specifically so this generalization was cheap.
- **Transfers use signed amounts, not a direction flag.** A transfer creates two `Transaction` rows (one per account, linked via `transferAccountId`) — the source row stores a *negative* amount, the destination a positive one. Reversing a transfer on delete is then just "subtract whatever was stored," no separate direction field needed.
- **No cron infrastructure exists in this app.** Auto-pay and the daily net-worth snapshot both use a "catch up lazily on page load" pattern (same one already established for AI-narrative caching) rather than a scheduled job — correct-by-end-of-day for a personal app checked daily, not midnight-precise. A real Vercel Cron would need a `CRON_SECRET`-protected route handler; not built since it's unverifiable without waiting for a scheduled fire.
- **This project has no `prisma/migrations` directory.** Schema changes are applied with `npx prisma format` → `validate` → `db push` → `generate`, directly against the single production database (no dev/staging split). This is the established convention here, not a shortcut — keep using it.
- **Real-money mutations are verified against the live database, not just `tsc`/`eslint`/`build`.** For anything that touches an account balance (auto-pay, transfers, account edit), a throwaway `tsx` script — created in the repo root, run once, deleted — creates clearly-named (`TEST-DELETE-ME`) rows via a real Prisma client against production, exercises the exact logic, asserts the resulting numbers, then deletes every trace. This is the only real verification available (no local login — see Gotchas) and should keep being used for this class of change.

## Files touched (cumulative, this session)

Broad strokes — see `git log --oneline` for the full commit-by-commit breakdown if more detail is needed on a specific change:

- `src/app/globals.css`, `src/lib/motion.ts`, `src/components/ui/{card,button,skeleton}.tsx`, `src/components/circular-progress.tsx`, `src/app/layout.tsx` — design system foundation.
- `src/components/app-shell/*` — sidebar/topbar redesign, command palette, "Your Life, Organized." tagline.
- `src/components/stat-card.tsx` (new, shared) + all 9 modules' `*-stats-row.tsx`/hero files — colored stat cards.
- `src/server/db-user.ts`, `vercel.json`, `src/app/(app)/home/page.tsx`, `src/app/(app)/journal/page.tsx` — perf fixes (auth caching, region, query parallelization).
- `src/lib/ai/chat-tools.ts` (new), `src/app/api/chat/route.ts` — Aura Brain add/delete-task tools.
- `src/lib/fx.ts` (new), `src/lib/finance.ts`, `src/app/(app)/finance/**`, `src/server/actions/finance.ts`, `src/server/recurring-automation.ts` (new), `src/components/finance/**`, `prisma/schema.prisma` (`FinancialAccount.currency` pre-existing; added `RecurringPayment.accountId`, `Transaction.transferAccountId`) — the whole Finance arc.
- `src/lib/health.ts`, `src/components/health/{hydration,sleep,wellness}-*.tsx` (new), `src/app/(app)/health/{hydration,sleep,wellness}/page.tsx` (new) — Health detail pages.

## Gotchas / constraints learned

- **`git push` cannot work from this session's tools on this machine — only `git fetch`/read operations can.** This machine has two GitHub accounts (`dhanu-af` and `khdanushka-spec`); `aura-os`/`life-os` belongs to `khdanushka-spec`, but this session's tool environment's credential (via `gh` CLI) is stuck on `dhanu-af`, and does not share credential state with Dhanu's own interactive terminal even though both show the same filesystem paths. **Standing workflow, assume permanent**: commit locally → tell Dhanu "please run `git push origin main`" in her own terminal → wait for confirmation → `git fetch origin main` to verify → deploy. Don't waste a turn re-attempting `git push` from these tools first.
- **`vercel deploy` can fail silently if the shell's cwd has reset to the user's home directory** (a broader cwd-reset quirk in this environment that also occasionally hits `tsc`/`prisma`). Symptom: instead of deploying, it prompts `? You are deploying your home directory. Do you want to continue? (y/N)` and hangs/aborts — looks like nothing happened rather than an error, so it's easy to wrongly assume the deploy succeeded. This already caused one real incident: a crash fix sat undeployed while Dhanu kept seeing the old bug and reasonably assumed something was still broken. **Run `pwd` immediately before every `vercel deploy` and confirm it prints the `aura-os` path, not the bare home path.**
- **Never pass a bare component reference as a prop from a Server Component into a Client Component** (e.g. `icon={ListChecks}` into a `"use client"` component expecting `icon: ComponentType`) — functions aren't RSC-serializable, and this fails at runtime only, with `tsc`/`eslint`/`next build` all silent about it. This exact bug has caused **three separate production crashes this session** (`EmptyState` on Home; `StatCard` on Tasks/Journal; `StatCard` again on the new Health hydration/sleep detail pages) despite being documented after the first occurrence — before shipping any new page that renders `<StatCard icon={SomeIcon} .../>` or similar, check that the file itself has `"use client"`, or move the icon-rendering into a small client wrapper that takes plain data props.
- **Base UI's `<Select.Value>` (`@base-ui/react/select`, this project's dropdown primitive) does not auto-resolve a label from `<Select.Item>` children the way Radix does.** Confirmed by reading the actual source (`resolveSelectedLabel` in `internals/resolveValueLabel.js`): without an `items` prop on `<Select.Root>` or a children render-function on `<Select.Value>`, it displays the raw `value` as text. This is why Dhanu saw a raw account UUID in a dropdown. Fix: `<SelectValue>{accounts.find(a => a.id === value)?.name}</SelectValue>`. Fixed in the 3 Selects touched this session (`transaction-form.tsx`, `recurring-form.tsx`, `recurring-list.tsx`); **~12 more instances elsewhere in the app still have this bug** — see Next steps.
- **This app has no local dev-login path** (real Supabase email/password auth, no seed test user). Every UI change this whole session was verified via `tsc`/`eslint`/`next build` plus, for anything real-money-related, direct database scripting (see Key decisions) — never by clicking through the actual rendered page before deploying. This is the root cause behind more than one bug shipping unnoticed. Worth asking Dhanu directly whether a local seed user/test account can be set up so this stops recurring every session.
- **Vercel MCP tools (`get_runtime_errors`, `get_runtime_logs`) return 403 in this environment** (team-scope token issue) — use `npx vercel logs <url-or-domain> --level error --since <window> --json` instead, it works and includes full error stacks/digests that the production error page itself omits.
- Tailwind v4's `@theme` block registers `@keyframes`-backed animations directly (`--animate-<name>: <name> <duration> <timing> <iteration>` + a top-level `@keyframes <name> {}`) — no arbitrary-value syntax needed.
- `useId()`-scoped SVG gradient IDs are required for any gradient-stroked SVG component that might render multiple instances on one page — a hardcoded `id` collides and every instance renders whichever def painted last.
- ESLint's `react-hooks/set-state-in-effect` is enforced strictly here. External-store reads on mount → `useSyncExternalStore`, not `useState`+`useEffect`. State reset from a changed prop → the "adjust state during render" pattern. State reset from a local event → do it directly in the handler, no effect.

## Next steps

1. **Sweep the remaining ~12 `<SelectValue />` instances with the raw-value display bug** (see Gotchas for the fix pattern): `account-form.tsx`, `budget-form.tsx`, `investment-form.tsx` in `finance/`, plus files under `health/`, `learning/`, `travel/`, and `tasks/task-board.tsx`/`task-detail-fields.tsx`/`task-toolbar.tsx`. Most read plausibly wrong (e.g. `"WEEKLY"` instead of `"Weekly"`) rather than obviously broken, so likely unnoticed rather than fine.
2. **Push and deploy this handover commit** — everything else is already live; this is just documentation.
3. **Start the Tasks page full redesign** (smart filters sidebar, priority colors/status chips, right-rail AI assistant/focus timer/analytics — Dhanu's most detailed spec of any module). Read `src/app/(app)/tasks/page.tsx` and `src/components/tasks/*` first; `task-sidebar.tsx`, `right-sidebar.tsx`, `focus-timer.tsx` already exist and likely need restyling more than rebuilding.
4. Then Habits, Journal, Finance, Work, Health, Learning, Family, Travel, Vault module pages one at a time for the same typography/motion treatment (hero/stats rows are done; lists, forms, and detail views aren't).
5. **Cross-currency transfers aren't supported** (the transfer form requires both accounts to share a currency) — fine for now, worth building properly (reusing `lib/fx.ts`) if Dhanu asks to transfer between an AUD and a Foreign account.
6. **Auto-pay has no true cron** (see Key decisions) — revisit if bills ever get missed because Dhanu didn't open the app that day.

## Open questions

- None blocking — Dhanu has confirmed the whole session's work is live and functioning. The items above are proactive follow-ups, not open problems.
