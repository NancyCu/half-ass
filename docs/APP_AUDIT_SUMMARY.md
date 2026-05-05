# App Audit Summary

## Purpose

This app is a mobile-first 15-week 80/20 half marathon training PWA. It prioritizes today’s workout, effort targets, pace targets, Garmin copy support, and simple local progress tracking.

## Runtime Shape

- Frontend: Vite, React, TypeScript, plain CSS.
- Backend: none.
- Database: none.
- Auth: none.
- Deployment: static build output in `dist/`.
- Local/dev commands:
  - `npm run dev`
  - `npm run lint`
  - `npm run build`
  - `npm run preview`

## Main Screens

- Dashboard: today’s workout, targets, steps, Garmin helpers, notes, flags, weekly count.
- Plan: full plan, 4-week block view, and current-week view using large cards.
- Zones: updated HR/pace zones and black-hole warning.
- Workout Library: definitions, targets, and common mistakes.
- Progress: completed/skipped/modified workouts, notes, current week, percentages, longest run, last workout.
- Settings: Week 1 start date, race alignment, theme, import/export, reset.

## Data Contracts

- `Workout` in `src/data/trainingPlan.ts` includes `name`, `week`, `day`, `duration`, optional `miles`, `type`, `targetBpm`, `targetPace`, `zone`, `steps`, and `notes`.
- `WorkoutLibraryEntry` in `src/data/workoutLibrary.ts` controls type color, definition, BPM, pace, and mistake-to-avoid copy.
- `Zone` in `src/data/zones.ts` controls zone cards and target helper text.
- Progress storage key: `half_ass_training_progress_v1`.
- Settings storage key: `half_ass_training_settings_v1`.
- PWA files: `public/manifest.webmanifest`, `public/sw.js`, `public/pwa-icon.svg`.

## Core Workflows

- Open the app and see today’s workout from the configured Week 1 start.
- Mark a workout complete, skipped, or modified.
- Add/edit notes and pain/fatigue flags.
- Tap workout cards to open the detail sheet.
- Copy workout details for Garmin Connect.
- Open Garmin Connect workouts in a new tab.
- Switch between dark neon and print-friendly light themes.
- Export/import local progress JSON.
- Align Week 1 to a race date.

## Current Limitations

- Data is local to the browser and device.
- Garmin integration is manual copy/open, not an API sync.
- The service worker uses a simple app-shell cache.
- No automated tests are present beyond lint/build verification.

## High-Risk Surfaces

- Date math in `src/utils/dates.ts` and `src/utils/workouts.ts`.
- Training data completeness in `src/data/trainingPlan.ts`.
- LocalStorage migration/compatibility in `src/hooks/useProgress.ts` and `src/hooks/useSettings.ts`.
- Mobile layout and bottom navigation safe-area behavior in `src/index.css`.
- PWA installability files under `public/`.
