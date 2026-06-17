# Calisthenics Tracker - Worklog

Project: Application de suivi sportif orientée calisthénie
Stack: Next.js 16, TypeScript, Tailwind 4, shadcn/ui, Prisma (SQLite), Recharts, Zustand, TanStack Query

## Architecture Overview

### Database Schema (Prisma)
- `Exercise`: name, category, muscleGroup, isStatic (hold vs reps), description
- `ExerciseVariant`: exerciseId, name (Full/Straddle/Tuck/...), difficultyLevel (progression order), description
- `Workout`: date, durationMin, notes, perceivedExertion
- `WorkoutEntry`: workoutId, exerciseId, variantId, notes
- `WorkoutSet`: workoutEntryId, setNumber, reps, holdSeconds, weight, rpe

### Views (single-page app with tab navigation on `/`)
1. **Dashboard** — KPIs, top exercises, chart of 1-2 selected exercises progression, recent workouts
2. **Exercises** — manage exercises + variants (CRUD), progression tree view
3. **New Workout** — log a workout: pick exercises/variants, add sets (reps or hold time, weight, RPE)
4. **History** — past workouts list with detail expand, edit/delete
5. **Stats** — deeper analytics: volume by category, frequency, PRs, streaks

### API Routes
- `/api/exercises` (GET list, POST create)
- `/api/exercises/[id]` (PATCH, DELETE)
- `/api/exercises/[id]/variants` (POST)
- `/api/variants/[id]` (PATCH, DELETE)
- `/api/workouts` (GET list, POST create)
- `/api/workouts/[id]` (GET, PATCH, DELETE)
- `/api/stats/overview` (dashboard KPIs)
- `/api/stats/exercise-progress` (chart data for an exercise/variant over time)
- `/api/stats/top-exercises` (top exercises by volume/frequency)

---
Task ID: 4-b
Agent: fullstack-developer (Exercises view)
Task: Build the Exercises management view component

Work Log:
- Read worklog.md and inspected existing infrastructure (types.ts, calc.ts, use-data.ts, common.tsx, app-shell.tsx, prisma schema, API routes for exercises + variants, shadcn UI primitives).
- Created /home/z/my-project/src/components/app/views/exercises-view.tsx exporting ExercisesView — a single-file "use client" component (~700 lines) with three sub-components: ExerciseCard, ExerciseFormDialog (create/edit), VariantFormDialog (create/edit).
- Toolbar: search Input (filters by name + muscleGroup, case-insensitive), category filter chip toggles (colored via CATEGORY_META hex when active, min-h-10 touch targets), "Add Exercise" Button opening the create dialog.
- Main list wrapped in ScrollArea (max-h-[calc(100vh-220px)]); exercises grouped by CATEGORIES with SectionHeading (emoji + label + count) and responsive grid (grid-cols-1 md:grid-cols-2 xl:grid-cols-3).
- Exercise card: bold name, colored category badge (inline style backgroundColor), Hold/Reps badge with icon, muted muscle group + equipment, line-clamped description, left border in category color. Body shows progression tree as ordered list of variants sorted by difficultyLevel asc: rank circle with vertical connector line, name, difficultyStars in amber, target value chip with metricUnit, hover edit/delete icon buttons (always visible on mobile, hover on desktop via md:opacity-0 md:group-hover:opacity-100). Footer: variant count + "Add Variant" ghost button + overflow DropdownMenu (Edit / Delete).
- Create/Edit exercise Dialog with shared form (name, category Select, muscleGroup, isStatic Switch with isometric-hold description, equipment, description Textarea). Prefills on edit via useEffect. Calls useCreateExercise / useUpdateExercise.
- Delete exercise AlertDialog warning that exercise + variants + related workout entries will be removed (cascade). Calls useDeleteExercise.
- Add/Edit variant Dialog with name, difficultyLevel number input, targetValue number input (unit label via metricUnit), live difficultyStars preview, description. Calls useAddVariant / useUpdateVariant.
- Delete variant AlertDialog explaining variantId on workout entries is set to null (SetNull). Calls useDeleteVariant.
- Empty state via EmptyState + Dumbbell icon with context-aware message + Add Exercise CTA when no filters are active.
- Fixed TS error: variant create payload now uses `undefined` (not `null`) for optional fields to satisfy useAddVariant's typed body; variant update uses null to clear fields (Record<string, unknown>).
- Verified: `npx tsc --noEmit` reports 0 errors in src/ (only pre-existing errors in unrelated examples/ and skills/ dirs). `npx eslint` on the file exits 0. dev.log shows no compile errors.

Stage Summary:
- Artifact: src/components/app/views/exercises-view.tsx — full CRUD ExercisesView component ready to be wired into AppShell view switching.
- Reuses all shared infra (types, calc helpers, use-data hooks, common UI, shadcn primitives). Dark-mode semantic classes only, tabular-nums on all numeric displays, touch targets >=40px on primary chips/buttons, responsive grid, ScrollArea for long lists.
- Not yet imported by page.tsx (AppShell still renders placeholder) — wiring is a separate task.
- TypeScript + ESLint clean for this file.

---
Task ID: 4-c
Agent: fullstack-developer (New Workout view)
Task: Build the New Workout logging view component

Work Log:
- Read worklog.md and inspected shared infrastructure (types, calc, use-data hooks, store, common UI, shadcn primitives) to align with conventions.
- Created /home/z/my-project/src/components/app/views/new-workout-view.tsx — a "use client" component exporting NewWorkoutView.
- Implemented header Card with title/date/duration/exertion Slider/bodyweight/notes in a 2-col responsive grid; Slider uses emerald→amber→red accent classes and a matching colored Badge (1–10).
- Built an exercise picker using CommandDialog grouped by category (emoji heading + Static badge) that appends a new DraftEntry (with one empty set) and closes on pick.
- Implemented EntryCard with: exercise name + category badge (inline CATEGORY_META hex) + variant Select (Standard/None first, variants sorted by difficultyLevel) + Trash remove; notes Input; a sets table on desktop (Set#/Reps-or-Hold/Weight/RPE/Trash) and stacked 3-col cards on mobile; Add Set button; per-entry summary (sets/volume/best).
- Sticky bottom-4 save bar (backdrop blur, border) shows entries/sets/total-volume totals + Save Workout button with spinner; on save validates (≥1 entry, ≥1 set each, metric present per set), calls useCreateWorkout, resets draft, and routes to history via useAppStore.getState().setView("history").
- Used crypto.randomUUID() for stable row keys; kept all draft state in local useState; reused metricUnit/setMetric/fmtCompact from @/lib/calc and EmptyState/SectionHeading from @/components/app/common.
- Ran bunx tsc --noEmit and bunx eslint; fixed a type mismatch where setMetric expected Prisma's nullable reps/holdSeconds by adding a draftMetric adapter. Both checks now pass cleanly for the new file.

Stage Summary:
- New file: /home/z/my-project/src/components/app/views/new-workout-view.tsx (NewWorkoutView, ~940 lines incl. formatting).
- Reuses shared types (ExerciseWithVariants, CATEGORY_META), calc helpers (metricUnit, setMetric via draftMetric adapter, fmtCompact), data hooks (useExercises, useCreateWorkout, NewWorkoutPayload), store (useAppStore.setView), and common UI (EmptyState, SectionHeading) — no infrastructure duplicated.
- Type-check and lint pass for the new file; pre-existing errors in examples/ and skills/ dirs are unrelated.
- File is NOT yet wired into src/app/page.tsx (still shows a placeholder loader); a subsequent integration task should render NewWorkoutView when useAppStore.view === "new-workout".

---
Task ID: 4-e
Agent: fullstack-developer (Stats view)
Task: Build the Stats analytics view component

Work Log:
- Read worklog.md, types.ts, calc.ts, use-data.ts, common.tsx, chart.tsx, table.tsx, card.tsx, badge.tsx, globals.css and the /api/stats/overview + /api/stats/top-exercises routes to align with project conventions.
- Created `/home/z/my-project/src/components/app/views/stats-view.tsx` exporting a `"use client"` `StatsView` component, reusing shared infra (no redefinitions): `useOverview` / `useTopExercises` / `useWorkouts`, `StatCard` / `StatCardSkeleton` / `SectionHeading` / `EmptyState`, shadcn `Card` / `Table` / `Badge` / `Skeleton`, Recharts primitives, and the `ChartContainer` / `ChartTooltip` wrapper.
- Implemented all 7 sections:
  1. Consistency strip: 4 StatCards (Current Streak success, Longest Streak, This Week, Avg Exertion warning /10) with StatCardSkeleton fallback.
  2. Volume by Category BarChart (last 30d) with per-bar category colors from `CATEGORY_META[cat].color` via `<Cell>`.
  3. Category Distribution donut PieChart (sessions per category) with absolute-positioned center label showing total sessions.
  4. Workout Frequency BarChart (count per day, `--chart-1` color via ChartConfig).
  5. Activity Heatmap: 6×5 grid (30 days) of rounded squares with emerald intensity tiers (bg-muted/40, /40, /70, full) plus Less→More legend, `title` tooltips with date + volume + count, horizontal scroll on mobile.
  6. Personal Records table sorted by bestValue desc, category-tinted Badge + left border per row, Best Set with `fmtCompact` + `metricUnit(isStatic)`, Top Variant with `difficultyStars(3)` + name, Last Performed via `relativeFromNow`. Wrapped in `overflow-x-auto` for mobile.
  7. Volume Trend bonus LineChart derived from `useWorkouts()` per-workout volume, oldest→newest, using `--chart-2`.
- Added ChartConfig per chart for proper CSS var injection (`--color-count`, `--color-volume`), used semantic Tailwind classes only (no hardcoded white/black, no primary indigo/blue), `tabular-nums` on numeric cells, 2-col `lg:grid-cols-2` chart grid with single-column mobile fallback, loading Skeletons for every async section, EmptyState for zero-data states.
- Verified: `bunx tsc --noEmit` shows 0 errors in `src/components/app/views/stats-view.tsx` (the 4 reported errors are all in unrelated `examples/` and `skills/` template files). `bunx eslint src/components/app/views/stats-view.tsx` passes with no output. dev.log shows no compile errors.

Stage Summary:
- Artifact: `/home/z/my-project/src/components/app/views/stats-view.tsx` — single self-contained `"use client"` `StatsView` component, ready to be imported by `page.tsx` (or wired into the AppShell view router) for the Stats tab.
- Reuses all shared infra per spec; no duplicate definitions of types / hooks / common UI.
- All 7 analytics sections implemented (including the optional Volume Trend line chart), with skeletons + empty states, dark-mode-friendly semantic styling, and responsive 2-col chart grid.
- Clean tsc + eslint; dev.log shows no errors.

---
Task ID: 4-d
Agent: fullstack-developer (History view)
Task: Build the History view component

Work Log:
- Read worklog.md and inspected shared infra (types, calc, use-data hooks, store, common UI, shadcn primitives, prisma schema, /api/workouts routes) to align field names and conventions.
- Created `/home/z/my-project/src/components/app/views/history-view.tsx` — a `"use client"` `HistoryView` component.
- Implemented toolbar: search Input (title or exercise name, case-insensitive), newest/oldest Select toggle, and `{showing}/{total}` count with `tabular-nums`.
- Grouped workouts by month using `date-fns format(date, "MMMM yyyy")` with sticky headers (`sticky top-16 z-10 bg-background/95 backdrop-blur py-2`) + Separator.
- Built `WorkoutCard`: clickable summary button (date block w/ day + weekday, title or "Untitled session", relative-from-now hint, chips for duration / RPE (color-coded emerald/amber/red) / entry count / sets / volume via `fmtCompact`) + a chevron Button (toggles expand) + an overflow DropdownMenu (Edit / Delete).
- Expanded view animated with framer-motion `<motion.div>` + `<AnimatePresence>` (height auto, opacity). Shows notes block, full date, BW, and per-entry detail: exercise name + category Badge (inline `CATEGORY_META[cat].color` hex) + variant label with `difficultyStars` + a `tabular-nums` sets table (Set # | reps-or-hold with unit | kg | RPE) + per-entry totals (sets, volume, best set).
- Edit Dialog: form for title, date (date input), durationMin, perceivedExertion (1-10 Slider with live color-coded value), bodyweightKg, notes. Submits via `useUpdateWorkout({ id, body })`; only workout metadata is editable (no sets/entries).
- Delete AlertDialog ("Delete this workout?" / "This cannot be undone.") calling `useDeleteWorkout(id)`; destructive styling via `buttonVariants({ variant: "destructive" })`.
- Empty states: full EmptyState (History icon, "No workouts yet", "Log your first session to start tracking your progression.", CTA → `useAppStore.getState().setView("new-workout")`) when there are zero workouts; lighter EmptyState (Search icon, "No matches") when filters return nothing.
- Adhered to design rules: dark-mode-friendly semantic tokens, no hardcoded white/black, `tabular-nums` everywhere, chips wrap on 360px screens, sticky headers at `top-16` to sit below the `h-16` app header.

Stage Summary:
- Single file produced: `/home/z/my-project/src/components/app/views/history-view.tsx` exporting `HistoryView`.
- Reuses shared infra (types, calc helpers, data hooks, store, common UI, shadcn primitives, framer-motion, date-fns) — no duplication.
- Type-check clean: `bunx tsc --noEmit` reports no errors under `src/`; `bunx eslint src/components/app/views/history-view.tsx` passes with no warnings.
- Not wired into `page.tsx` yet (out of scope for this task); integration is left for the view-router task.

---
Task ID: 4-a
Agent: fullstack-developer (Dashboard view)
Task: Build the Dashboard view component

Work Log:
- Read prior worklog and inspected shared infrastructure: types.ts, calc.ts, use-data.ts, common.tsx, chart.tsx, store.ts, app-shell.tsx, globals.css, and the API routes for progress/top-exercises/workouts.
- Created directory `src/components/app/views/` and wrote `dashboard-view.tsx` as a single `"use client"` React component named `DashboardView` plus several internal sub-components (`KpiGrid`, `ProgressTracker`, `TopExercises`, `RecentWorkouts`, `ActivityStrip`, `VolumeByCategory`, plus small helpers `FadeIn`, `LabeledSelect`, `useExercisesMap`, `activityColorClass`).
- Implemented the 6 required sections: 4-card KPI grid (StatCard + StatCardSkeleton), Progress Tracker card with two exercise selects + per-exercise variant selects + Recharts LineChart (1 or 2 overlaid series using `--chart-1`/`--chart-2`), Top Exercises horizontal scroll of compact cards, Recent Workouts list (clicking a row calls `useAppStore.getState().setView("history")`), 30-day Activity strip with emerald intensity scale, and Volume-by-Category donut chart with center total label + legend list.
- Reused all required imports exactly as specified (CATEGORY_META, fmtCompact/fmtDate/metricUnit/difficultyStars/relativeFromNow, all data hooks, ChartContainer/ChartTooltipContent, Recharts primitives, framer-motion FadeIn wrapper, lucide icons).
- Followed dark-mode-first semantic Tailwind rules (bg-card/bg-muted/border-border/text-muted-foreground, no hardcoded colors except the CATEGORY_META hex strings passed inline for badges and Pie cells).
- Ran `bunx tsc --noEmit` — zero TypeScript errors in the new file (only pre-existing noise in `examples/` and `skills/` directories).
- Ran `bunx eslint` on the file — initially flagged 3 `react-hooks/set-state-in-effect` errors (effect-based default exercise + variant reset) plus one React-Compiler memoization warning. Refactored to a derived-state pattern (`effectiveEx1Id`, `effectiveEx{1,2}VariantId` validated against the current exercise's variants) and cleared the variant on exercise change inside the `onValueChange` handler. Removed the `useMemo` over `slices` for `chartConfig`. Re-ran eslint: clean.
- Final state: file passes both `tsc --noEmit` and `eslint` with no errors or warnings.

Stage Summary:
- Created: `/home/z/my-project/src/components/app/views/dashboard-view.tsx` (~830 lines, one default export `DashboardView`, fully self-contained, no new shared deps).
- The Dashboard is ready to be mounted into `AppShell` by a future task (page.tsx still renders the loading stub — wiring is intentionally left to a separate sub-agent per task scope).
- All six required sections implemented using the shared infrastructure verbatim (no redefinitions of types, hooks, or helpers).
- Compilation: clean. TypeScript: 0 errors. ESLint: 0 errors / 0 warnings.
- Dev log shows no errors related to the new file (it is not yet imported by page.tsx, so Turbopack does not recompile it — expected behavior).

---
Task ID: 5 + 6
Agent: main orchestrator
Task: Wire up view router in page.tsx, fix integration issues, end-to-end verification with Agent Browser

Work Log:
- Wired `src/app/page.tsx` to render the 5 views via a `ViewRouter` switch driven by the Zustand `useAppStore` view state, wrapped in `<AppShell>` + `<React.Suspense>`.
- Confirmed all 5 view files export named components (DashboardView, ExercisesView, NewWorkoutView, HistoryView, StatsView).
- Verified dev server compiles cleanly (HTTP 200, no TS/runtime errors).
- Agent Browser golden-path verification:
  1. Dashboard renders with real KPIs (7 workouts, streak, 760 volume), Progress Tracker chart, Top Exercises (Planche/Advanced Tuck), Recent Workouts, Activity strip, Volume-by-category donut.
  2. Exercises view shows grouped catalogue with progression trees, category chips, search, Add Exercise dialog (created "Ring Muscle-up" → 201).
  3. New Workout view: session form (date/bw/RPE slider/notes) + searchable exercise picker + sets table (reps for dynamic, hold for static) + sticky save bar. Logged a 15-rep Push-up set → POST 201 → auto-navigated to History.
  4. History view: workouts grouped by month (sticky headers), expandable cards with full set detail, edit/delete actions. New workout appeared at top.
  5. Stats view: consistency strip (streak/longest/week/avg exertion 7.3), Volume by Category bar chart, Category donut, Frequency chart, Activity heatmap, Personal Records table.
  6. Dashboard re-verified after save: 8 workouts, 3 this week, 775 volume, 45 sets — all incremented correctly.
- Mobile (390px) verified: desktop nav → scrollable pill bar, "Log Workout" CTA hidden, content stacks single-column.
- Sticky footer confirmed: `min-h-screen flex flex-col` + `mt-auto` pattern; footer sits at bottom on short pages, pushed down naturally on long pages.
- Final lint: 0 errors, 0 warnings.

Stage Summary:
- All 5 views integrated and verified end-to-end via Agent Browser.
- Golden path (log workout → see it in history → see updated dashboard stats) works with real data flow through REST API + Prisma + TanStack Query cache invalidation.
- Responsive (mobile-first) + sticky footer + dark-mode default all confirmed.
- Production-ready: clean lint, clean compile, no runtime errors.
