# Project Task Rules

Use this file before starting any Codex or agent task in Half_Ass_Training.

## Start Every Task

- Confirm the working directory is `/Users/michaelnguyen/RunningApps/Half_Ass_Training`.
- Run `git status --short --branch` before editing.
- Create a new branch before making changes:
  `git switch -c codex/<short-task-name>`.
- Do not revert user changes unless Michael explicitly asks.
- Identify private/generated files before staging. Do not commit `node_modules/`, `dist/`, `test-results/`, `output/`, local browser exports, screenshots, or private imported progress JSON files.

## Product Boundaries

- Half_Ass_Training is a mobile-first 15-week 80/20 half marathon training-plan PWA.
- It is the planned workout/calendar layer, not the main running data brain.
- It has no backend, database, auth, payment, Strava sync, or Garmin API integration.
- Progress and settings are local-only in `localStorage`.
- Do not connect it directly to StrideSync Firebase/Firestore yet.
- Critical workflows that must stay working:
  - Dashboard today workout.
  - Calendar/plan views.
  - Workout detail sheet.
  - Mark complete/skipped/modified.
  - Notes and pain/fatigue flags.
  - Garmin copy/open helpers.
  - Settings for Week 1 start, race alignment, theme, import/export, and reset.

## Code Rules

- Framework: Vite + React + TypeScript with plain CSS.
- App shell and screen routing live in `src/App.tsx`.
- Bottom navigation lives in `src/components/BottomNav.tsx`.
- Static plan data lives in `src/data/trainingPlan.ts`.
- Workout definitions live in `src/data/workoutLibrary.ts`.
- HR/pace zone data lives in `src/data/zones.ts`.
- Progress persistence lives in `src/hooks/useProgress.ts` under `half_ass_training_progress_v1`.
- Settings persistence lives in `src/hooks/useSettings.ts` under `half_ass_training_settings_v1`.
- Date and workout derivation helpers live in `src/utils/dates.ts` and `src/utils/workouts.ts`.
- Screens live in `src/pages/`; reusable UI lives in `src/components/`.
- Prefer updating canonical plan/library/zone data over duplicating workout constants inside pages.
- When creating future StrideSync integration, export planned workout JSON first. Do not save planned workouts directly to Firestore from this app.

## Required Verification

Run before finishing:

```bash
npm run lint
npm run build
```

For UI work, also run the app and check mobile-width Dashboard, Calendar, Settings, and the workout detail sheet when possible.

## Required Handoff

- Summarize changed files.
- State verification results.
- Mention anything not verified.
- Call out unrelated dirty files that were not touched.
- Provide commit/merge/push commands when Michael requests them.
