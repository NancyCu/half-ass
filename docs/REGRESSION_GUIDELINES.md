# Regression Guidelines

## Non-Negotiables

- Dashboard must answer the today-workout question within the first viewport on phone-sized screens.
- Planned workout names and numbering must come from `src/data/trainingPlan.ts`, not display-only suffixes.
- Easy foundation, recovery, and long-run days must preserve easy-effort/HR-warning behavior.
- Calendar/plan views must stay readable and card-based on mobile.
- Workout detail sheet must keep status, notes, flags, target HR, target pace, zones, segments, and Garmin helpers.
- Progress must use `localStorage`; do not replace it with fake state.
- Modified and completed workout states must stay separate: opening Modify alone must not write progress, no-op modified records must be ignored, and calendar green dots/counters must mean completed only.
- Settings must preserve Week 1 start, race-date alignment, theme, import/export, and reset workflows.
- Do not add backend/cloud sync or direct StrideSync writes without explicit approval.

## Integration Project Context

This work is not a new standalone app, not a monorepo conversion yet, and not a rewrite or merger of the three apps. It is an integration/connection project between three existing apps:

- StrideSync: main running data brain and Firebase/Strava source of truth.
- GarminVault: Garmin FIT/local Garmin export inspection and future Garmin activity export tool.
- Half_Ass_Training: training schedule/planned workout layer.

For now, the goal is only to create safe shared data contracts and later export/import preview flows.

Guardrails:

- Do not create a new app inside `/Users/michaelnguyen/RunningApps`.
- Do not turn `/Users/michaelnguyen/RunningApps` into a Git repo.
- Do not convert the apps into a monorepo unless explicitly requested later.
- Do not merge the apps together.
- Do not make GarminVault or Half_Ass_Training write directly to StrideSync Firebase.
- Do not connect databases during contract-only phases.
- Do not change existing runtime behavior unless a later phase explicitly asks for it.
- Prefer versioned JSON contracts first.
- Prefer StrideSync preview/validation before any Firestore writes.
- Treat StrideSync as production-sensitive.

## Required Checks Before Finishing

```bash
npm run lint
npm run build
```

For UI changes, run the app when possible:

```bash
npm run dev
```

## Feature-Specific Checklists

When changing training data, review:

- `src/data/trainingPlan.ts`
- `src/data/workoutLibrary.ts`
- `src/data/zones.ts`
- `src/pages/Dashboard.tsx`
- `src/pages/Calendar.tsx`
- `src/components/WorkoutCard.tsx`
- `src/components/TodayWorkoutCard.tsx`

When changing progress, review:

- `src/hooks/useProgress.ts`
- `src/lib/workoutProgress.ts`
- `src/pages/Dashboard.tsx`
- `src/pages/Progress.tsx`
- `src/components/WorkoutDetailSheet.tsx`
- Settings import/export behavior

When changing settings/date alignment, review:

- `src/hooks/useSettings.ts`
- `src/pages/Settings.tsx`
- `src/utils/dates.ts`
- `src/utils/workouts.ts`
- Today workout and calendar labels

When changing Garmin helper text/copy, review:

- `src/components/GarminCopyButton.tsx`
- `src/utils/workouts.ts`
- `src/components/WorkoutDetailSheet.tsx`
- `src/components/TodayWorkoutCard.tsx`

When changing PWA behavior, review:

- `index.html`
- `public/manifest.webmanifest`
- `public/sw.js`
- `public/pwa-icon.svg`
- `src/main.tsx`

When changing future StrideSync integration contracts, review:

- `src/data/trainingPlan.ts`
- `src/hooks/useProgress.ts`
- `src/hooks/useSettings.ts`
- Proposed shared planned-workout export types
- `RUN_APP_INTEGRATION_PLAN.md` at the workspace root

## UI Regression Rules

- Preserve all six bottom-nav screens.
- Keep empty/loading/error states, confirmation prompts, import/export, and reset actions.
- Check mobile layout first.
- Keep large touch targets and readable text.
- Keep bottom navigation safe-area behavior.
- In print theme, avoid heavy filled backgrounds and rely on borders/accent stripes.
- Do not replace real workout/progress data with placeholders.

## Git Rules

- Branch first.
- Stage only task files.
- Do not include unrelated dirty files.
- Do not commit `node_modules/`, `dist/`, `test-results/`, `output/`, screenshots, or private progress exports.
