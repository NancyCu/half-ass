# Project Task Rules

## Start Every Task

- Confirm the working directory is `/Users/michaelnguyen/Half_Ass_Training`.
- Run `git status --short --branch` before editing when this folder is a git repository.
- Create a new branch before making changes when git is initialized:
  `git switch -c codex/<short-task-name>`.
- Do not revert user changes unless explicitly asked.
- Do not commit `node_modules/`, `dist/`, local exports, browser screenshots, or private imported progress JSON files.

## Product Boundaries

- This app is a phone-first 15-week 80/20 half marathon training dashboard.
- The Dashboard must keep today’s workout, target BPM, target pace, steps, easy-day HR warning, notes, flags, and weekly progress immediately visible.
- The Plan screen must remain large-card based. Do not make a tiny calendar grid the home screen.
- Progress is local-only in `localStorage`; there is no backend, auth, payment, or cloud sync.
- Race-date alignment belongs in Settings and should stay simple.

## Code Rules

- Framework: Vite + React + TypeScript.
- Primary data lives in:
  - `src/data/trainingPlan.ts`
  - `src/data/zones.ts`
  - `src/data/workoutLibrary.ts`
- Local persistence lives in:
  - `src/hooks/useProgress.ts`
  - `src/hooks/useSettings.ts`
- Date and workout derivation helpers live in:
  - `src/utils/dates.ts`
  - `src/utils/workouts.ts`
- Keep screens in `src/pages/` and reusable UI in `src/components/`.
- Prefer updating shared data/types over duplicating workout constants inside pages.

## Required Verification

```bash
npm run lint
npm run build
```

For UI changes, also run the app and check at least Dashboard, Plan, Settings, and the workout detail sheet on a mobile-width viewport.

## Required Handoff

- Summarize changed files.
- State verification results.
- Mention anything not verified.
- Provide commit/merge/push commands when requested.
