# Regression Guidelines

## Non-Negotiables

- Dashboard must answer the today-workout question within the first viewport on phone-sized screens.
- Easy foundation, recovery, and long-run days must show the “Stay under 143 bpm” warning.
- Plan must use readable cards, not tiny calendar tiles.
- Workout cards must show name, duration or miles, BPM target, pace target, main zone, and short steps.
- Do not replace progress with fake state; use `localStorage`.
- Do not remove Garmin copy/open helpers.
- Do not make race-date alignment a cluttered primary control.

## Required Checks Before Finishing

```bash
npm run lint
npm run build
```

## Feature-Specific Checklists

When changing training data, review:
- `src/data/trainingPlan.ts`
- `src/data/workoutLibrary.ts`
- `src/data/zones.ts`
- Dashboard card copy and Plan card copy

When changing progress, review:
- `src/hooks/useProgress.ts`
- `src/pages/Dashboard.tsx`
- `src/pages/Progress.tsx`
- `src/components/WorkoutDetailSheet.tsx`

When changing settings/date alignment, review:
- `src/hooks/useSettings.ts`
- `src/pages/Settings.tsx`
- `src/utils/dates.ts`
- `src/utils/workouts.ts`

When changing PWA behavior, review:
- `index.html`
- `public/manifest.webmanifest`
- `public/sw.js`
- `src/main.tsx`

## UI Regression Rules

- Preserve all six bottom-nav screens.
- Keep empty states, confirmation prompts, import/export, and reset actions working.
- Check mobile layout first.
- Keep large touch targets and readable text.
- In print theme, avoid heavy filled backgrounds and rely on borders/accent stripes.

## Git Rules

- Branch first when git is initialized.
- Stage only task files.
- Do not include unrelated dirty files.
- Do not commit `node_modules/`, `dist/`, or private progress exports.
