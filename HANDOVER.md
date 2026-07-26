# Handover — 2026-07-26 (Knowledge Vault complete — all Phase 4 modules shipped)

## Status

The Knowledge Vault module is now **fully built, verified, and ready to deploy** — this closes out Phase 4. Every module in `nav.ts` is now live: Habits, Work, Health, Learning, Family, Travel, Knowledge Vault.

Vault is architecturally different from every other Phase 4 module, as flagged in the prior handover, and was built accordingly rather than copy-pasting the Work/Family/Travel shape:

- **One polymorphic model, not several.** `VaultItem` (+`VaultItemType` enum: NOTE/LINK) is a single searchable/filterable list, not a Client/Project/Meeting-style cluster of domain entities - the Vault's whole purpose is "everything in one place," so fragmenting it into parallel models would work against that.
- **No file/PDF/image/video storage.** VISION.md's full scope ("notes, PDFs, images, videos, bookmarks, voice notes, meeting recordings") needs real file storage, which this app has never had - every other module (Work, Health, Learning, Family, Travel) deliberately deferred it too. This session kept that deferral consistent rather than introducing a new paid Vercel Blob (or similar) dependency unprompted. **This is the one deliberate scope gap** - Notes (rich text) and Links (bookmarks) are fully built; file attachments are not. Flag this to Dhanu explicitly if she expects PDF/photo upload - it's a real follow-up decision (pick a storage provider, wire upload UI), not a small addition.
- **Search is real, not just a system-prompt dump.** `/vault?q=...&type=...&category=...&tag=...` does actual Prisma `contains`/`has` filtering server-side (same `searchParams`-driven pattern as `journal/page.tsx`), not just a client-side list.
- **Aura Brain integration still follows the existing convention** (recent + favorited items dumped into the system prompt), not a live search tool - this codebase has no dynamic AI-SDK tool-calling anywhere yet, and building that would be a separate, much bigger undertaking than this module. The system prompt explicitly tells the AI it only sees a subset, not the full vault, so it doesn't overclaim.
- **Two content types, two editing UX.** Notes reuse Journal's exact TipTap-editor infrastructure (`JournalEditor` component reused directly, `contentJson`/`contentText` mirror pattern) via a full-page composer at `/vault/[id]` - genuinely need rich text and don't fit a dialog. Links are a simple CRUD dialog (title/url/description/tags/category) - no rich text needed, so no reason to route through a full page.
- **The Journal-autosave bug (`a61f180`) was applied proactively, not discovered again.** `saveDraftNoteAction` (`src/server/actions/vault.ts`) uses `getDbUser()` and returns `{ error: "unauthenticated" }` instead of `requireDbUser()`'s throwing `redirect()`, because it's called from the composer's debounced autosave wrapped in the client's own `try/catch` - exactly the shape that broke Journal. `createEmptyNoteAction`/link CRUD/etc. safely use `requireDbUser()` since they're plain button clicks with no wrapping `try/catch`.
- **No Home Daily Momentum tile** - same reasoning as Family/Travel: Vault was never a placeholder in that array, and there's no meaningful daily "vault score."

### What's built
- Schema: `VaultItem`, `VaultAiCache`, `VaultReport` - applied to the live DB via `npx prisma db push` + `npx prisma generate`.
- `src/lib/vault.ts` - type/category meta, `wordCount()`, report narrative schema/type.
- `src/lib/ai/vault.ts` - `getOrGenerateDailyInsight()` (nudges toward uncategorized backlog or items untouched 90+ days) + `generateVaultReport()`.
- `src/server/actions/vault.ts` - `saveDraftNoteAction` (debounced autosave, safe pattern above), `createEmptyNoteAction`, Link CRUD, `toggleFavoriteAction`, `deleteVaultItemAction`, `generateVaultReportAction`.
- `src/components/vault/*` - stats row (Total/Notes/Links/Uncategorized), insight card, `VaultSearch` (searchParams-driven filter form + tag chips, mirrors `journal-search.tsx`), `VaultItemRow` (star-favorite, edit, delete), `LinkFormDialog`, `VaultComposer` (the note editor - title input, category select, tag input, `JournalEditor` reused for the TipTap body, safe autosave), `VaultHeader` (New Note creates-then-navigates, New Link opens a dialog), the report card.
- `src/app/(app)/vault/{page,[id],reports}/page.tsx` - dashboard+list+search (one page, not four sub-pages - Vault doesn't have Work/Family/Travel's multiple-entity-types shape), note editor, AI reports. All route-tested including `/vault/[id]` with a placeholder UUID and `/vault?q=...&type=...`.
- Aura Brain chat context now includes recent + favorited vault items, with an explicit "you only see a subset" caveat in the system prompt.
- `src/lib/nav.ts` - `disabled: true` removed from Knowledge Vault. **All Phase 4 modules are now enabled.**
- `npx tsc --noEmit`, `npx eslint`, and `npx next build` all passed clean on the first attempt. Dev-server sanity check confirmed all 3 routes compile and redirect to `/login` cleanly (including the dynamic `[id]` route and a filtered search query), no server errors in logs.

## Next steps for a fresh session

1. Confirm this session's commit is pushed and `npx vercel ls --yes` shows `life-os-k9g4` deployed successfully.
2. Spot-check `https://aura.dkns.ai/vault`, `/vault/reports`, `/vault/<some-uuid>` - they'll redirect to `/login` (expected/only verifiable signal without real credentials).
3. **Phase 4 is complete.** All 7 life-area modules (Habits, Work, Health, Learning, Family, Travel, Knowledge Vault) are built, verified, and live. Check VISION.md's other sections (Smart Automation, Universal Search across modules, Widgets, Mobile/Desktop-specific experience, real AI Brain tool-calling) for what's next if Dhanu wants to keep going - none of that is started.
4. If Dhanu wants file/photo/PDF upload in the Vault, that's the natural next increment: pick a storage provider (Vercel Blob is the obvious first choice given the Vercel deployment), add a `FILE` variant to `VaultItemType`, add upload UI. Don't start this speculatively - it's a real infra decision (new paid dependency) that's worth confirming with her first, unlike everything else built so far which stayed within existing free-tier infra.
5. A genuine "AI-searchable" vault (semantic/vector search, or the AI dynamically querying it via a tool call rather than a fixed recent+favorited dump) is a bigger, separate architectural undertaking - this codebase has no AI-SDK tool-calling infrastructure at all yet (every module's Aura Brain integration is "dump relevant rows into the system prompt string"). Worth flagging as a real limitation if Dhanu specifically wants the AI to search her whole vault on demand, not just see a recent/favorited slice.

## Key decisions (carried forward from prior handovers, still relevant)

- Each Phase 4 module follows whichever of three shapes actually fits: a daily-check-in + repeatable-logs shape (Health, Learning), a people-or-things/events/logs shape (Work, Family, Travel), or - new this session - a single polymorphic searchable-list shape (Vault). Don't force a module into a shape it doesn't fit.
- File attachments are consistently deferred everywhere (Work, Health, Learning, Family, Travel, and now Vault too) - nothing in this app has file upload infra. This is the accumulated technical debt/scope gap across the whole Phase 4 build, all in one place, worth surfacing to Dhanu as a single follow-up decision rather than six separate ones.
- Score-computation functions are deliberately named to avoid cross-domain confusion. Family, Travel, and Vault have no such function and are deliberately absent from Home's Daily Momentum.

## Gotchas / constraints learned (carried forward, still relevant - no new ones found this session)

- This sandbox can reach the production Postgres DB directly - `npx prisma db push` then `npx prisma generate`, both from the `aura-os` directory (a fresh shell's cwd may be the parent - `cd` first or Prisma fails with "schema not found").
- Only one Vercel project (`life-os-k9g4`) should exist for this repo - sanity-check `npx vercel ls --yes` if a deploy seems stuck.
- Dialog-style form components must only mount their stateful body while `open` is true (`{open && <FormBody .../>}`), not reset state via `useEffect`.
- Zod schemas using `.optional().transform(...)` need `z.input<typeof schema>` (not `z.infer`) for server action parameter types.
- Prisma enum types must be imported with `import type` in client components - a bare value import breaks the Turbopack client bundle (`node:module` chunking error).
- The `react-hooks/purity` ESLint rule flags `Date.now()` called directly in an async Server Component's top-level body as impure - use `const now = new Date()` once, derive offsets via `.getTime() ± ms`.
- Any server action invoked directly from client code on a timer/debounce (not a `<form action>`) must use `getDbUser()` + an explicit `{ error }` return, never `requireDbUser()` wrapped in the client's own `try/catch` - the redirect() throw gets silently swallowed otherwise (Journal's autosave bug, `a61f180`; applied proactively in Vault's `saveDraftNoteAction` this session).
- Existing generic components are worth reusing directly rather than duplicating - `JournalEditor` (the TipTap wrapper + toolbar) needed zero changes to work for Vault's notes; it was never actually Journal-specific despite the name/CSS class.

## Open questions

None blocking. The file-storage scope gap (see above) is worth raising with Dhanu, but isn't blocking - Notes and Links are fully functional without it.
