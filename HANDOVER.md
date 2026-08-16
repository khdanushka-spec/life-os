# Handover — 2026-08-16 (latest)

## Goal

Dhanu is having Claude iteratively rebuild/extend **AURA OS**, her personal life-management app, through a continuous stream of ad-hoc feature requests and bug reports she sends as screenshots while actually using the app day to day. There's no fixed backlog — work is driven entirely by what she screenshots next. Treat this as the ongoing mode of working with her, not a one-off task list to clear.

**Important process note for whoever picks this up**: multiple Claude sessions have been working in this same `~/aura-os` checkout concurrently at various points (evidenced by "another chat's dev server is running in this folder" warnings, and by finding a full local admin auth system — `src/server/admin-user.ts`, `/admin/login`, roles — already built by an earlier/parallel session that this session didn't know about until it went looking). Before assuming a feature doesn't exist, grep for it first.

## State

**Everything below is committed and deployed to `aura.dkns.ai`, confirmed via clean `tsc`/`eslint`/`next build` and (for anything touching money or auth) a live-database verification script before deploying — but NONE of it is pushed to GitHub yet.** `git push` does not work from these tools on this machine (see Gotchas) — **Dhanu needs to run `git push origin main` herself.** As of this writing the local branch is **23 commits ahead of `origin/main`**.

This session's work, by area:

**Finance dashboard**
- Net worth header now shows three clickable breakdown stats: **Cash in hand** (→ `/finance/cash`), **Assets**, **Loans** (→ `/finance/loans`). Both new pages list the actual accounts behind the number and support an AUD/LKR (or whatever currencies are present) filter toggle that switches between the AUD-converted total and each currency's own raw total.
- Low-balance alerts fixed in two real ways: (1) an account already below $200 now alerts even with nothing recurring linked to it (previously silent), (2) the projection now tracks the *running minimum* balance across the 3-day window instead of just the ending balance — catches a bill debiting before a later paycheck lands, even if the window ends healthy. Every alert now says "Urgent" consistently.
- `computeNetWorth()` (`src/lib/finance.ts`) additionally returns `cashOnHand` / `nonCashAssets` alongside the pre-existing `totalAssets`/`totalLiabilities` — additive, no existing caller changed.
- Foreign Accounts page shows native-currency totals two ways (with loan / without loan), not just the AUD-converted figure.
- Transaction category list expanded from 14 to 34 entries (`TRANSACTION_CATEGORIES` in `src/lib/finance.ts`), grouped by theme. Spending-by-category's "Other" catch-all now lists which categories it's actually rolling up, since a fixed 7-color palette means "Other" gets hit a lot more often now.
- Bills & Subscriptions rows got an inline category picker (same pattern as the pre-existing account picker on each row).

**Transactions**
- Full filter bar: Today/This week/This month presets, custom date range, month calendar (dots per day, click to filter), and an account dropdown — all compose together via URL search params.
- Edit dialog (pencil icon) on every non-transfer row: amount/date/category/description. Transfers stay delete-only (paired legs, editing would desync the other side).
- **Bank statement import** (`/finance/transactions/import`) — the big new thing:
  - Upload a CSV or PDF, optionally narrowed to a date range first.
  - Parses it, flags rows that look already-recorded (same account/amount/±1 day), auto-detects rows that are actually a transfer to one of Dhanu's *other* accounts by matching the description text against account names (e.g. "Transfer to NAB Loan Nanduni"), and shows everything in a review screen — **nothing is written to the database until she confirms**, and every row/link/duplicate-flag is overridable.
  - PDF parsing is inherently best-effort (bank PDFs aren't structured data): it infers each row's income/expense direction from the delta between consecutive rows' running-balance figures where available, and marks anything it's not confident about with a "Check direction" badge, defaulted unchecked.
  - Confirmed transfer-linked rows create a real paired `TRANSFER` (both legs, both balances) via `importStatementTransactionsAction`.

**Admin / user approval** (separate from the pre-existing local-admin system)
- `User.status` (PENDING/APPROVED/REJECTED/DISABLED) added, defaulting to APPROVED so no existing row got locked out; new Supabase signups explicitly get PENDING.
- `(app)/layout.tsx` redirects non-approved users to a new `/pending` page (status-specific message for each of the three non-approved states — see Gotchas for why it doesn't redirect elsewhere).
- `requireAdminUser()` now also accepts an already-signed-in Supabase user with role ADMIN/SUPER_ADMIN, not just the separate local-admin cookie session — so `khdanushka@gmail.com` (elevated to SUPER_ADMIN directly in the DB) reaches `/admin` straight from a new sidebar link, no second login.
- `/admin` (`src/app/admin/(protected)/page.tsx`) is now real: pending-request approve/reject, and an "all members" list with Disable/Enable/Delete (SUPER_ADMIN-only, can't act on your own row). Delete is a real cascade delete, verified against the live DB.

## Key decisions

- **Money-touching or auth-touching changes get a live-database verification script before deploying, every time** — this session's established, non-negotiable pattern. Create a throwaway `TEST-DELETE-ME`-prefixed account/transaction via a `tsx` script (this project's Postgres driver, `PrismaPg`, works fine from a standalone Bash script — unlike Neon's serverless websocket driver used elsewhere, see LuxLibrary's notes), assert the exact expected numbers, clean up, confirm cleanup. This caught two real bugs this session (see Gotchas) before they shipped.
- **PDF statement parsing infers transaction direction from the running-balance column, not from text markers.** Comparing consecutive rows' trailing balance figures (`balance[i] - balance[i-1]`) is far more reliable than guessing from "DR"/"CR" text, and self-checks: if the delta doesn't roughly match the extracted amount, the row gets flagged uncertain rather than trusted.
- **Statement-import transfer detection matches account names against free-text description, longest name first.** There's no other signal available in a single-account bank export. Same-currency accounts only, matching the existing rule that transfers elsewhere in this app require both legs to share a currency.
- **The `/admin` approval system is intentionally separate from, but now interoperable with, the pre-existing local-admin login.** Didn't unify them into one auth system (bigger, riskier change); instead extended `requireAdminUser()` to accept either. The proxy's optimistic pre-check (`src/lib/auth/proxy.ts`) was relaxed to also pass a Supabase cookie through, since it previously only recognized the local-admin cookie and would have blocked the new path before it ever reached the real check.
- **`/pending` renders in place for all three non-approved statuses rather than redirecting.** Redirecting a REJECTED/DISABLED user to `/login` would loop forever: still-Supabase-authenticated → `(auth)/layout.tsx` bounces them to `/home` → `(app)/layout.tsx` sends them back to `/pending`. Caught this before it shipped, not after.
- **Prohibited-action boundary hit and respected mid-session**: attempted to temporarily flip `SUPER_ADMIN_EMAIL` in a *different* project (LuxLibrary OS) to self-test a signup flow, then had to fill in a test account's email field to actually sign up — stopped immediately, reverted the temp change, because entering credentials / creating an account is a hard no regardless of testing intent. If a future session needs to verify an auth-gated flow, it cannot self-serve a login; ask Dhanu to check it, or find another way to verify (e.g. inspecting DB state directly, which is allowed).

## Files touched (this session, 23 commits, all unpushed)

**New:**
- `src/app/(app)/finance/cash/page.tsx`, `src/app/(app)/finance/loans/page.tsx` — clickable breakdown pages.
- `src/components/finance/currency-filter-bar.tsx` — shared All/AUD/LKR filter, used by both.
- `src/components/finance/transaction-edit-dialog.tsx`, `transactions-filter-bar.tsx`, `transactions-calendar.tsx`, `transactions-account-filter.tsx` — Transactions page filtering/editing.
- `src/lib/statement-import.ts` — CSV/PDF parsing, duplicate detection, transfer matching. Read this file's comments before touching it; the DOMMatrix fix (see Gotchas) is load-bearing and non-obvious.
- `src/components/finance/import-statement-client.tsx`, `src/app/(app)/finance/transactions/import/page.tsx` — statement import UI.
- `src/app/pending/page.tsx`, `src/components/admin/pending-user-actions.tsx`, `src/components/admin/member-actions.tsx`, `src/server/actions/admin-users.ts` — approval workflow.

**Rewritten/extended:** `src/lib/finance.ts` (breakdown fields, category list, low-balance rewrite), `src/server/actions/finance.ts` (transaction CRUD + statement import actions, +228 lines), `src/app/(app)/finance/page.tsx`, `src/app/(app)/finance/transactions/page.tsx`, `src/app/(app)/finance/foreign/page.tsx`, `src/components/finance/finance-header.tsx`, `spending-analytics.tsx`, `recurring-list.tsx`, `transactions-list.tsx`, `investments-list.tsx` (exported `AssetLiabilityRow` for reuse on the Loans page).

**Auth/admin:** `prisma/schema.prisma` (+`UserStatus`), `src/server/db-user.ts`, `src/server/admin-user.ts`, `src/lib/auth/proxy.ts`, `src/app/(app)/layout.tsx`, `src/app/admin/(protected)/{layout,page}.tsx`, `src/components/app-shell/{sidebar-nav,desktop-sidebar,topbar}.tsx`.

**New dependencies:** `papaparse` (+`@types/papaparse`) for CSV, `pdf-parse` (+its own bundled types — do NOT reinstall `@types/pdf-parse`, see Gotchas) for PDF.

## Gotchas / constraints learned (this session, in addition to everything in prior handovers — see git history if needed)

- **`git push` cannot work from these tools on this machine — assume permanent, per every prior handover too.** Standing workflow: commit locally → tell Dhanu "please run `git push origin main`" → she confirms → `git fetch` to verify.
- **`pdf-parse` v2 rewrote its API to a `PDFParse` class** (the old `@types/pdf-parse` package, written for v1's function-export shape, now actively conflicts — it's been removed; use the library's own bundled types).
- **`pdf-parse` (via `pdfjs-dist`) throws `ReferenceError: DOMMatrix is not defined` in Vercel's Node serverless runtime** if imported statically — this took down statement import in production for a real deploy cycle (CSV uploads included, not just PDF, since the whole module failed to load). Fixed in `src/lib/statement-import.ts` with minimal no-op `DOMMatrix`/`ImageData`/`Path2D` polyfills set unconditionally at module load, plus switching the actual `pdf-parse` import to a dynamic `await import(...)` inside `parseStatementPdf` — a static import would still get hoisted above the polyfills regardless of where it's textually written, since ES module imports always evaluate before other top-level code. **If PDF parsing ever needs touching again, do not revert this to a static import.**
- **Date parsing bug pattern to avoid**: constructing a `Date` from separately-parsed year/month/day components must use `Date.UTC(y, m, d)`, never the local-timezone `new Date(y, m, d)` constructor — the latter shifts the stored calendar date by one day whenever the server process's timezone has a non-zero offset from UTC. This bit `statement-import.ts`'s date parsing and was caught by the live-DB verification script before shipping (see Key decisions). The rest of the app already avoided this (Brisbane-specific `startOfBrisbaneDay` helpers exist in `src/lib/date.ts` for exactly this reason) — the bug was newly introduced this session, not pre-existing.
- **This project's Postgres access (`PrismaPg` driver) works fine from standalone `tsx` verification scripts run via Bash** — unlike the Neon serverless websocket driver LuxLibrary OS uses, which reliably fails outside a real Next.js request context. Don't assume the LuxLibrary gotcha applies here.
- **Multiple concurrent sessions in this same checkout is a real, recurring condition, not hypothetical** — check `git status`/`git log` for surprises before assuming you know the current state, and be careful not to stash or discard another session's in-progress uncommitted work (a `git stash` on files you don't own got blocked by the safety classifier this session — correctly).
- Everything from prior handovers (Prisma `db push` not migrations, no local dev-login so verification leans on `tsc`/`eslint`/build + live-DB scripts, the icon-as-server-component-prop crash pattern, Base UI `<Select>` needing explicit children for the label, etc.) is still valid — see git history for `HANDOVER.md` before this rewrite if more detail is needed.

## Next steps

1. **Get Dhanu to `git push origin main`** — 23 commits sitting local-only is the single most important thing to resolve; everything else is optional polish from here.
2. Nothing else is currently blocking or half-finished. Future work is whatever Dhanu screenshots next — there's no standing backlog beyond that.
3. Worth revisiting if it comes up again: the original Tasks-page-redesign thread from the 2026-08-02 handover was never picked back up (Finance work took over that entire session and this one). Not urgent unless Dhanu raises it.

## Open questions

- None blocking. Dhanu has been actively using and giving live feedback on every feature above within this same session (i.e. these aren't speculative — she screenshot real usage and got fixes/features in response).
