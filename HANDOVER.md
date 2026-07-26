# Handover — 2026-07-27 (Premium design system overhaul — Phase 1 of the redesign)

## Status

Phase 4 (all 7 life-area modules) shipped in the prior session. This session started a **separate, explicitly-scoped effort**: Dhanu asked for a full premium UI/UX redesign (Apple/Linear/Arc/Raycast/Notion/Vercel-tier), across the entire app, with a very detailed spec (dark near-black theme, real accent color, typography scale, motion everywhere, command palette, etc.) and an explicit instruction to work module-by-module rather than a shallow all-at-once pass.

A plan was written and approved (`C:\Users\dnand\.claude\plans\fluttering-exploring-grove.md` — read it for the full reasoning) scoping **this session** to three things that cascade to 100% of the app automatically:

1. **Design system foundation** — new color palette, typography scale, motion primitives, core primitive polish.
2. **App Shell** — Sidebar + Topbar, visible on every single page.
3. **Home dashboard** — the flagship page Dhanu gave live screenshot feedback on.

All 9 other module pages (Tasks first, then Habits/Journal/Finance/Work/Health/Learning/Family/Travel/Vault) are **explicitly deferred to follow-up sessions**, one at a time, so each can inherit a finished design language instead of a half-applied one. This is a deliberate scope boundary Dhanu approved, not something dropped — see the plan file for the full "why."

## What's built this session

### Design system (`src/app/globals.css`)
The single biggest finding: every color in this app was **pure grayscale** (zero OKLCH chroma) before this session — no accent color anywhere, on any module, which is the real reason it read as generic. Fixed at the token level so it cascades everywhere without touching per-module code:
- Dark-first palette: near-black background, layered card/popover surfaces, soft blue `--primary`/`--ring`/`--sidebar-primary` (was 0-chroma gray), new `--success`/`--warning` semantic tokens (`--destructive` already existed), a real sequential `--chart-1..5` palette. Light mode got the same treatment (also was pure grayscale) so it's not neglected, just not the flagship.
- `--radius` bumped 0.625rem → 0.75rem (cascades through the existing `--radius-sm/md/lg/xl` scale — no component changes needed).
- New `--shadow-card`/`--shadow-card-hover`/`--shadow-glow-primary` CSS vars, tuned differently per light/dark mode (dark mode needs inset highlights + black shadows, not classic drop shadows, since a shadow reads as nothing against near-black).
- New `@layer utilities`: `.text-display/.text-heading/.text-subheading/.text-caption/.text-metric` — opt-in classes, no new component, so later module passes can adopt incrementally.
- New `--animate-shimmer` keyframe for the Skeleton sweep.
- **Verified live in the browser via computed styles** (not just "should work"): confirmed `--background`/`--card`/`--primary`/`--border` compute to the intended near-black/layered/blue/subtle values in dark mode, confirmed the light-mode equivalents too, confirmed the Sign-in button's `border-radius: 12px` and `transition-duration: 0.15s` match the new tokens exactly.

### Motion (`src/lib/motion.ts` — new)
`EASE_OUT`, `DURATION_FAST/BASE/SLOW` (150/200/250ms), `fadeInUp`, `fadeIn`, `staggerContainer`, `hoverLift` — shared Framer Motion variants so this pass and every future one imports one consistent system instead of hand-rolled numbers (Framer Motion was already a dependency, already used ad hoc in several modules' stat rows — this formalizes it).

### New shared components
- `src/components/empty-state.tsx` — icon + title + description + primary/secondary CTA + help text, per Dhanu's "never show 'Nothing here'" spec. Used in Home this session (Today's Focus / Smart Timeline empty states); every other module's empty states are a later-session adoption target, not touched yet.

### Core primitive polish (cascades to all ~150 components automatically)
- `Card` — hover lift (-translate-y-0.5) + shadow transition using the new elevation tokens, subtle border. Same `data-slot`/`data-size` API.
- `Button` — added a `loading` prop (spinner via existing `Loader2` convention, auto-disables), press-scale animation. Same variants/sizes/`cva` structure.
- `Skeleton` — shimmer sweep instead of flat pulse.
- `CircularProgress` — gradient stroke (unique `useId()`-scoped `<linearGradient>` per instance so multiple rings on one page don't collide), Framer Motion entrance animation respecting `useReducedMotion()`, default size bumped 64→72px. Same props.
- `src/app/layout.tsx` — `next-themes` `defaultTheme` changed `"system"` → `"dark"` (kept `enableSystem` + the existing toggle).

### App Shell
- **Sidebar** (`desktop-sidebar.tsx` + `sidebar-nav.tsx`) — animated active-state indicator (Framer Motion `layoutId` sliding pill, replacing a flat class swap), hover glow, purely-presentational section grouping ("Overview" vs "Life Areas" — `src/lib/nav.ts` itself untouched, still the single source of truth), collapsible icon-only rail. Collapse state persisted via **`useSyncExternalStore`**, not `useState`+`useEffect` — this project's ESLint config has a strict `react-hooks/set-state-in-effect` rule (from the react-compiler lint rules) that flags direct `setState` calls in a bare effect body, and reading `localStorage` on mount is exactly the "sync with an external store" case `useSyncExternalStore` exists for. Avoids both the lint error and a hydration-mismatch bug a naive lazy-`useState`-initializer approach would have caused.
- **Topbar** (`topbar.tsx`) — restyled (blur, subtle border), plus a new **command palette** (`src/components/app-shell/command-palette.tsx`): `⌘K`/`Ctrl+K` global shortcut + a topbar search-styled button, hand-rolled on the existing `Dialog`+`Input` primitives rather than adding the `cmdk` package — deliberately no new dependency for something the existing primitives already cover. Filters `navItems` client-side, arrow-key navigable. Also hit the same `set-state-in-effect` lint rule twice (resetting `selected` when `query` changes, resetting state when the dialog opens) — fixed with the React-documented "adjust state during render" pattern (comparing against a tracked previous-prop value, not an effect) for the first, and keeping only the genuinely-external-system part (imperative DOM focus) inside an actual effect for the second.

### Home dashboard (`src/app/(app)/home/page.tsx` + `src/components/home/*` — new)
All existing Prisma queries/computed percentages in `getDashboardData()` are unchanged — this was a presentation upgrade, with two small, deliberate, honest data additions layered on top (not scope creep — both use data the function was already 90% of the way to having):
- **Real weather, finally.** `getBrisbaneWeather()` (`src/lib/weather.ts`) already existed and was already used by Journal's header — Home was hardcoding `"22°C, partly cloudy"` this whole time. Wired it in; this is a bug fix, not a new feature.
- **Habits trend indicator.** One extra cheap query (yesterday's habit logs, same shape as today's) powers a real ↑/↓ badge on the Habits momentum ring. Deliberately did **not** add trend badges to the other five metrics (Tasks/Work/Health/Learning/Finance) — none of them have an equally cheap, honest "yesterday" baseline without either re-deriving a multi-query rolling window or comparing against a differently-shaped period (Finance is monthly, Work is a point-in-time average). Per the plan: omit rather than fabricate a number.
- **Real daily-summary sentence.** The hero's AI-badge blurb used to be 100% fabricated copy ("You have 3 things that need attention... one clear 90-minute block...") unrelated to any real data on a page otherwise full of real queries. Replaced with `buildDailySummary()` in `home-hero.tsx`, a small pure function templating real `tasksDueToday`/`tasksOverdue`/`tasksCompletedToday` numbers (now exposed from `getDashboardData`) into a sentence. Not a new AI call — no model invoked, same "no new AI/DB/dependency" boundary as the rest of this session — just truthful instead of fake.
- New components: `home-hero.tsx` (gradient hero, live clock, weather, mini stat strip, the summary sentence above), `momentum-rings.tsx` (staggered entrance via `staggerContainer`, trend badge slot), `ai-suggestions-card.tsx` (glowing AI badge treatment, same static `suggestions` array as before — no new AI model this pass, per the plan's explicit non-goal).
- Today's Focus / Smart Timeline cards now use `EmptyState` instead of a bare muted sentence when there's nothing to show.

## Verification

- `npx tsc --noEmit`, `npx eslint` on every touched file — clean, including catching and properly fixing 3 real `react-hooks/set-state-in-effect` violations (not suppressed — actually restructured per the React-documented patterns, see above).
- `npx next build` — **all 49 routes across every module compiled successfully**, which is the strongest evidence the shared Card/Button/Skeleton/theme changes didn't break anything downstream (they're additive/backward-compatible - no prop removed, no API changed).
- Dev-server check: no console errors, no server errors, no horizontal overflow at tablet (768px) or desktop (1440px) widths, both dark and light mode token sets verified via computed-style inspection in the actual running browser (see the design-system section above for the specific values checked).
- **Could not get an authenticated screenshot of Home/Sidebar/Topbar** - this sandbox has never had live login credentials (a known, already-documented limitation from every module built in the prior session too - see prior handovers). Verification therefore leaned harder than usual on the build passing for all 49 routes plus direct computed-style inspection of what IS reachable (the `/login` page, which uses the same global theme/Button/Card primitives). **A fresh session with real credentials, or Dhanu herself, should be the first to actually see Home/Sidebar/Topbar rendered** - recommend prioritizing a real screenshot/live check before starting the next module pass, to catch anything a computed-style check can't (actual visual balance, spacing feel, whether the glow/gradient effects read as tasteful rather than gimmicky).

## Next steps for a fresh session

1. **Get real eyes on it first.** Deploy (this session ends without pushing/deploying - see below) and have Dhanu look at `/home` live, or get real login credentials into this sandbox, before starting the next module. The plan was built on a strong, detailed brief, but no one (including me) has actually seen the rendered result yet.
2. Read `C:\Users\dnand\.claude\plans\fluttering-exploring-grove.md` for the full context/reasoning before continuing - it explains why Tasks is next and why the other 9 modules wait.
3. **Tasks page next** - Dhanu gave it the most detailed spec of any module (smart filters sidebar, priority colors/status chips, right-rail AI assistant/focus timer/analytics). Read the current `src/app/(app)/tasks/page.tsx` and `src/components/tasks/*` before starting; a lot of this may already partially exist (task-sidebar.tsx, right-sidebar.tsx, focus-timer.tsx already exist per earlier exploration this session) and need restyling more than rebuilding - check before assuming a rebuild is needed.
4. Then Habits, Journal, Finance, Work, Health, Learning, Family, Travel, Vault, one at a time, each adopting the now-established typography utilities (`.text-display` etc.), `EmptyState`, and `src/lib/motion.ts` variants rather than reinventing them.
5. This session did **not** commit/push/deploy - check `git status` first thing. All changes are local, verified, but not yet in git history.

## Key decisions (new this session)

- A design-token-level pass (colors/typography/spacing/shadows) plus the App Shell plus one flagship page gives 100% of the app a visual lift while producing a small number of fully-realized screens, rather than a shallow pass across all eleven modules that ships something half-finished everywhere. This is the core strategic bet of the whole redesign effort - stated explicitly in the approved plan, worth re-reading before continuing.
- No new npm dependencies were added for this phase (command palette hand-rolled on existing `Dialog`, not `cmdk`) and no new AI calls/database tables. Both were explicit boundaries in the approved plan.

## Gotchas / constraints learned (new this session, on top of everything carried forward from Phase 4's handovers)

- This project's ESLint config enforces `react-hooks/set-state-in-effect` strictly - any direct `setState()` call in a bare `useEffect` body is an error, not a warning. Fixes, by scenario:
  - Reading an external browser store (localStorage) on mount → `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)`, not `useState` + `useEffect`. Also sidesteps a hydration-mismatch that a naive lazy-initializer read of `localStorage` would cause (the initializer would run fresh on both server and client, producing different values since `window` doesn't exist server-side).
  - Resetting state when a *prop* changes (not a local event) → the React-documented "adjust state during render" pattern: track the previous prop value in state, compare during render, call `setState` conditionally in the render body itself (not in an effect) when it differs.
  - Resetting state in response to a *local* event (e.g. an `<input onChange>`) → just do it directly in that event handler; don't use an effect keyed off the resulting state value at all.
  - Effects should only remain for genuine external-system synchronization (event listeners, imperative DOM calls like `.focus()`) - never for anything that's really just derived/adjusted React state.
- Tailwind v4's `@theme` block can register custom `@keyframes`-backed animations via `--animate-<name>: <name> <duration> <timing> <iteration>;` plus a matching `@keyframes <name> {}` elsewhere in the CSS file - then use it as a plain utility class (`animate-shimmer`), no arbitrary-value syntax needed.
- `useId()`-scoped SVG `<linearGradient id={...}>` is necessary whenever a gradient-stroked SVG component (like `CircularProgress`) might render multiple instances on one page - a hardcoded gradient `id` would collide and all instances would reference whichever gradient def rendered last.

## Open questions

None blocking, but see "Get real eyes on it first" above - this is the one thing worth doing before writing more module-redesign code on top of an unverified-by-human-eyes foundation.
