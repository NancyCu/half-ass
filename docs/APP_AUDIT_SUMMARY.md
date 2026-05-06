# App Audit Summary

## Purpose

Half_Ass_Training is a mobile-first 15-week 80/20 half marathon training PWA. It answers what workout is planned today, how hard it should be, what HR/pace zone to target, and how the user is progressing through the plan.

It should act as the training plan/calendar layer in the broader running system, not the main activity database.

## Runtime Shape

- Frontend: Vite, React 19, TypeScript, plain CSS, lucide-react.
- Backend: none.
- Database: none.
- Auth: none.
- Deployment: static build output in `dist/`, with Firebase static hosting config present.
- Local/dev commands:
  - `npm run dev`
  - `npm run lint`
  - `npm run build`
  - `npm run preview`

## Main Routes / Screens / APIs

There are no backend API routes.

Screens are controlled by `src/App.tsx` and `src/components/BottomNav.tsx`:

- Dashboard: `src/pages/Dashboard.tsx`
- Calendar: `src/pages/Calendar.tsx`
- Zones: `src/pages/Zones.tsx`
- Workout Library: `src/pages/WorkoutLibrary.tsx`
- Progress: `src/pages/Progress.tsx`
- Settings: `src/pages/Settings.tsx`

Important components:

- Today workout card: `src/components/TodayWorkoutCard.tsx`
- Week cards: `src/components/WeekCard.tsx`
- Workout cards: `src/components/WorkoutCard.tsx`
- Workout detail sheet: `src/components/WorkoutDetailSheet.tsx`
- Garmin copy/open helper: `src/components/GarminCopyButton.tsx`
- Progress summary: `src/components/ProgressSummary.tsx`
- Theme toggle: `src/components/ThemeToggle.tsx`
- Zone display: `src/components/ZoneCard.tsx`, `src/components/ZoneChips.tsx`

## Data Contracts

- `Workout` in `src/data/trainingPlan.ts`:
  - `id`
  - `week`
  - `day`
  - `dayName`
  - `name`
  - `duration`
  - optional `miles`
  - `type`
  - `targetBpm`
  - `targetPace`
  - `zone`
  - `steps`
  - `notes`
  - `phase`
  - optional `weekLabel`
- `WeekPlan` in `src/data/trainingPlan.ts`.
- `WorkoutType` and `WorkoutLibraryEntry` in `src/data/workoutLibrary.ts`.
- `Zone` and `zoneTargets` in `src/data/zones.ts`.
- `WorkoutProgress`, `ManualRunEntry`, and `ProgressState` in `src/hooks/useProgress.ts`.
- `SettingsState` and `ThemeMode` in `src/hooks/useSettings.ts`.

Storage keys:

- `half_ass_training_progress_v1`
- `half_ass_training_settings_v1`

PWA/static files:

- `index.html`
- `public/manifest.webmanifest`
- `public/sw.js`
- `public/pwa-icon.svg`
- `public/icons.svg`

## Core Workflows

- Open the Dashboard and see today’s planned workout from the configured Week 1 start.
- View the 15-week plan by calendar/month, current week, 4-week block, or roadmap-style views.
- Open a workout detail sheet from Dashboard, Calendar, or Progress.
- Mark workouts completed, skipped, or modified.
- Add/edit workout notes.
- Toggle pain/fatigue flags.
- Add manual run entries from Dashboard.
- Copy workout details for Garmin Connect.
- Open Garmin Connect workouts in a new tab.
- Review zones and workout-library definitions.
- Adjust Week 1 start date or align it from race date in Settings.
- Switch dark/print theme.
- Export/import local progress JSON.
- Reset settings and progress with confirmation.

## Current Limitations

- Data is local to the browser/device.
- No backend, auth, cloud sync, or StrideSync connection.
- Garmin integration is manual copy/open only.
- Planned workouts are not linked to real Strava/Garmin activities yet.
- No automated tests beyond lint/build.
- Service worker is simple app-shell behavior.

## High-Risk Surfaces

- `src/data/trainingPlan.ts`: canonical workout names, numbering, phases, weeks, steps, and target values.
- `src/data/workoutLibrary.ts` and `src/data/zones.ts`: workout definitions and target helpers.
- `src/hooks/useProgress.ts`: localStorage schema, progress import/export, manual runs.
- `src/hooks/useSettings.ts`: Week 1 start, race alignment, theme persistence.
- `src/utils/dates.ts` and `src/utils/workouts.ts`: date math, today workout selection, copy text.
- `src/pages/Dashboard.tsx` and `src/pages/Calendar.tsx`: primary planning surfaces.
- `src/components/WorkoutDetailSheet.tsx`: status, notes, flags, segments, Garmin helper.
- `src/index.css`: mobile layout, bottom nav safe areas, print theme.
- `public/` PWA assets.
