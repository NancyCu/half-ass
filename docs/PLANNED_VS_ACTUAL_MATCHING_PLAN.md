# Planned vs Actual Matching Plan

This is a design plan only. Do not implement Phase 5 or Phase 6 from this document until a later task explicitly asks for it.

## Architecture Recommendation

Half_Ass_Training should remain the owner of planned workouts, schedule state, and workout completion/progress. StrideSync should remain the source of actual run data from Strava, Garmin, Firebase, and any future activity providers. GarminVault should remain a Garmin import/export helper that can inspect local Garmin data and produce Garmin activity contract JSON.

Do not redesign this as StrideSync taking over training-plan completion. StrideSync can provide actual run summaries, but Half_Ass_Training should decide how those runs map to the plan and should write only to its own progress state.

## Role Split

### StrideSync

- Owns actual activity data from Strava, Garmin imports, Firebase/Firestore, and manual StrideSync run workflows.
- Provides read-only actual run summaries to Half_Ass_Training in later phases.
- Does not own Half_Ass_Training planned workout completion.
- Does not mark Half_Ass_Training workouts complete.

### Half_Ass_Training

- Owns the static training plan in `src/data/trainingPlan.ts`.
- Owns planned workout date logic through `src/utils/workouts.ts`.
- Owns local progress state in `src/hooks/useProgress.ts`.
- Owns user confirmation, manual overrides, review queues, and completion status updates.

### GarminVault

- Owns local Garmin export inspection and Garmin activity contract generation.
- Feeds Garmin-derived activities toward the larger running system through JSON contracts.
- Should not write directly to StrideSync Firebase or Half_Ass_Training progress.

## Recommended Phase 5 Scope

Phase 5 should move actual run summaries from StrideSync into Half_Ass_Training safely, without automatic completion.

Recommended scope:

- Define a StrideSync actual-run-summary export contract.
- Prefer read-only manual export/import first.
- Add a Half_Ass_Training actual-run-summary import preview.
- Validate shape, dates, distance, duration, source, and provider activity IDs.
- Store nothing at first, or store only preview-local component state.
- Do not write to Firebase or Firestore from Half_Ass_Training.
- Do not let Half_Ass_Training read Firebase directly yet.
- Do not mark any planned workout complete automatically.
- Do not mutate `ProgressState` until the user confirms in Phase 6.

The safest first implementation is a StrideSync export JSON that the user can copy/download and paste into Half_Ass_Training for preview.

## Recommended Phase 6 Scope

Phase 6 should add the Half_Ass_Training matching engine and user-confirmed completion.

Recommended scope:

- Compare imported actual run summaries against planned workouts derived from `trainingPlan` and `week1Start`.
- Produce match suggestions with confidence, reasons, and warnings.
- Ask the user to confirm suggested matches.
- Update Half_Ass_Training `ProgressState` only after user confirmation.
- Support `completed`, `partial`, `skipped`, `missed`, `needs_review`, and `manually_completed`.
- Preserve manual overrides so future matching does not undo the user's decision.

## Data Transfer Options

### Option A: Manual JSON Export And Import

StrideSync exports read-only actual run summary JSON. Half_Ass_Training imports or pastes it into a preview screen.

Pros:
- Lowest risk.
- No cross-app auth problem.
- No Firestore access from Half_Ass_Training.
- Easy to verify with fixtures and manual smoke tests.

Cons:
- Manual step.
- Data can become stale until re-exported.

Recommendation: use this first.

### Option B: Safe StrideSync API Or Export Endpoint

Half_Ass_Training reads from a StrideSync read-only endpoint later.

Pros:
- Less manual.
- Can keep data fresher.
- StrideSync remains the provider of actual runs.

Cons:
- Requires authentication, CORS, API hardening, and rate-limit thinking.
- Needs careful athlete/user scoping.
- Still should not write Firestore from Half_Ass_Training.

Recommendation: consider after Option A proves the contract and UX.

### Option C: Direct Firebase Read From Half_Ass_Training

Half_Ass_Training reads StrideSync Firestore data directly.

Pros:
- Could avoid a StrideSync API layer.

Cons:
- Highest security and coupling risk.
- Requires careful auth, rules, user scoping, and data-model boundaries.
- Makes Half_Ass_Training aware of StrideSync internals.

Recommendation: defer until auth/rules/security are intentionally designed. Do not use this for Phase 5.

## Data Model Proposal

### Actual Run Summary From StrideSync

```ts
type StrideSyncActualRunSummaryExportV1 = {
  exportVersion: 1
  generatedAt: string
  sourceApp: 'StrideSync'
  athleteId?: string
  athleteLabel?: string
  runs: ActualRunSummary[]
}

type ActualRunSummary = {
  id: string
  source: 'strava' | 'garmin' | 'manual'
  providerActivityId?: string
  startTime: string
  localDate: string
  name?: string
  activityType: 'run' | 'walk' | 'trail_run' | 'hike' | 'ride' | 'workout' | 'other'
  distanceMiles?: number
  distanceMeters?: number
  durationMinutes?: number
  durationSeconds?: number
  avgHeartRate?: number
  maxHeartRate?: number
  avgPace?: string
  paceSecondsPerMile?: number
  calories?: number
}
```

### Planned Workout Shape In Half_Ass_Training

The existing source is `Workout` in `src/data/trainingPlan.ts`.

Important fields:

- `id`
- `week`
- `day`
- `dayName`
- `name`
- `duration`
- `miles`
- `type`
- `targetBpm`
- `targetPace`
- `zone`
- `steps`
- `notes`
- derived planned date from `workoutISO(workout, week1Start)` in `src/utils/workouts.ts`

### Match Suggestion Shape

```ts
type WorkoutMatchSuggestion = {
  id: string
  plannedWorkoutId: string
  actualRunId: string
  plannedDate: string
  actualLocalDate: string
  confidence: number
  statusSuggestion: 'completed' | 'partial' | 'needs_review'
  reasons: string[]
  warnings: string[]
  matchedBy: Array<'date' | 'type' | 'distance' | 'duration' | 'intensity'>
}
```

### Completion Progress Update Shape

The current `WorkoutProgress` in `src/hooks/useProgress.ts` supports `status`, `note`, `flags`, and `updatedAt`. Phase 6 will likely need an expanded type:

```ts
type WorkoutStatus =
  | 'completed'
  | 'partial'
  | 'skipped'
  | 'missed'
  | 'needs_review'
  | 'manually_completed'

type WorkoutProgress = {
  status?: WorkoutStatus
  note?: string
  flags?: PainFlag[]
  updatedAt?: string
  actualRunId?: string
  actualRunSource?: 'strava' | 'garmin' | 'manual'
  matchSuggestionId?: string
  matchConfirmedAt?: string
  matchOverriddenAt?: string
  manualOverride?: boolean
}
```

### Manual Confirmation And Override Fields

- `actualRunId`: stable run reference from StrideSync export.
- `matchConfirmedAt`: when the user accepted a match.
- `manualOverride`: prevents future auto-suggestions from overwriting the user's choice.
- `matchOverriddenAt`: when the user rejected or changed a suggestion.
- `note`: keeps user-visible context such as "Matched to StrideSync run from May 12."
- `flags`: keeps current pain/tired/HR annotations.

## Matching Rules

### Date

- Primary candidate: actual run `localDate` equals planned workout date from `workoutISO(workout, week1Start)`.
- Early/late candidate: actual run is within one day of planned date.
- Wider windows should go to `needs_review`, not automatic completion.

### Type

- Planned run types should prefer actual `run` or `trail_run`.
- Planned recovery/foundation/tempo/interval/long workouts should prefer actual run types, not walks.
- Planned walk or cross-training should allow `walk`, `hike`, `ride`, or `workout` only when the plan explicitly permits it.
- Rest days should not be marked complete from actual runs by default.

### Duration

- Parse planned `duration` such as `30 min`.
- Compare against actual `durationMinutes` or `durationSeconds`.
- Strong match: within roughly 15 percent.
- Partial candidate: 50 to 85 percent of planned duration.
- Needs review: very short warmup/cooldown-like runs.

### Distance

- Use planned `miles` when present.
- Compare against actual `distanceMiles`, or convert `distanceMeters`.
- Strong match: within roughly 15 percent.
- Partial candidate: 50 to 85 percent of planned distance.
- Needs review: actual distance far above planned distance or multiple runs on same day.

### Intensity

- Use planned `zone`, `targetBpm`, and `targetPace` when available.
- Use actual `avgHeartRate`, `avgPace`, or `paceSecondsPerMile` only as supporting evidence.
- Do not block completion solely because HR/pace is missing.

### Multiple Runs In One Day

- If one run clearly matches the planned workout, suggest it.
- If multiple runs are close, send all candidates to review.
- Do not merge multiple actual runs into one completion until a later explicitly designed phase.

### Rest Days

- Rest workouts should stay incomplete unless the user manually marks them complete/skipped.
- If an actual run appears on a rest day, show it as context but do not mark rest complete.

### Missed Workouts

- A planned workout with no actual run after a grace period can be suggested as `missed`.
- The user must confirm `missed`, `skipped`, or rescheduled.

### Partial Workouts

- Suggest `partial` when the actual run is plausibly connected but materially short or different.
- Preserve notes explaining distance/duration variance.

## Completion Statuses

- `completed`: user confirmed the actual run satisfies the planned workout.
- `partial`: user confirmed the actual run partially satisfies the planned workout.
- `skipped`: user intentionally skipped the workout.
- `missed`: workout date passed and no suitable actual run was completed.
- `needs_review`: matching engine found ambiguity or risk.
- `manually_completed`: user completed the workout without linking a StrideSync actual run.

## User Confirmation Behavior

- Show the suggested matching run on the Today Workout card.
- Ask: "Mark today's workout complete?"
- Provide actions:
  - `Mark Complete`
  - `Mark Partial`
  - `Not This Run`
  - `Review/Edit`
  - `Manual Complete`
- If the user selects `Not This Run`, preserve that rejection against future matching for the same actual run/planned workout pair.
- If the user manually completes a workout, do not replace it with an automatic suggestion later.
- If existing progress exists for a workout, show the suggestion as read-only context unless the user chooses to edit.

## Half_Ass_Training UI Proposal

### Today Workout Card

- Show possible StrideSync match below the planned workout details.
- Include actual run distance, duration, source, date, and confidence.
- Use a conservative "needs review" tone for ambiguous matches.

Likely files:
- `src/pages/Dashboard.tsx`
- `src/components/TodayWorkoutCard.tsx`
- `src/components/WorkoutCard.tsx`

### Possible StrideSync Match Panel

- New component that receives planned workout, actual run candidates, and match suggestions.
- Provides confirm/reject/review actions.

Likely file:
- `src/components/StrideSyncMatchPanel.tsx`

### Training Calendar Completion Badges

- Calendar days should show completion state and review warnings.
- Rest-day actual activity should show context without marking rest complete.

Likely files:
- `src/pages/Calendar.tsx`
- `src/components/WeekCard.tsx`

### Review Queue

- A list of ambiguous matches, missed workouts, and rejected suggestions.
- The user can resolve each row manually.

Likely new file:
- `src/pages/ReviewQueue.tsx`

### Workout Detail Comparison View

- Show planned vs actual side by side.
- Include distance, duration, type, zone/HR/pace, and notes.

Likely files:
- `src/components/WorkoutDetailSheet.tsx`
- `src/components/WorkoutActualComparison.tsx`

## Safety Concerns

- Do not overwrite existing `progress.workouts[workout.id]` accidentally.
- Preserve manual overrides and user-entered notes.
- Do not mark rest days complete from actual run data.
- Do not confuse warmups, cooldowns, walks, or short shakeouts with planned workouts.
- Avoid duplicate actual run imports by keying on `source`, `providerActivityId`, `id`, and `startTime`.
- Keep StrideSync run data read-only in Half_Ass_Training.
- Preserve current localStorage progress behavior unless a later phase explicitly designs a migration.
- Validate imported JSON before any persistence.
- Keep all matching suggestions reversible.

## Implementation Phases

### Phase 5A: StrideSync Actual Run Summary Export Contract

Design and add a read-only StrideSync export contract for actual run summaries.

No Firestore writes. No Half_Ass_Training writes. No matching yet.

### Phase 5B: Half_Ass_Training Manual Import Preview

Add a paste/upload preview for StrideSync actual run summary JSON.

No localStorage writes yet. No progress mutation yet.

### Phase 5C: Half_Ass_Training Read-Only Match Preview

Run the matching engine in preview mode only.

Show suggested matches, warnings, and confidence. Do not update `ProgressState`.

### Phase 6A: User-Confirmed Completion

Allow the user to confirm a match and update Half_Ass_Training progress.

Progress updates stay inside `src/hooks/useProgress.ts`.

### Phase 6B: Review Queue And Manual Override

Add review queue UI and persist manual override metadata.

Protect manual decisions from future auto-matching.

### Phase 6C: Optional Direct Read/API Integration Later

Consider a StrideSync read-only API/export endpoint after manual JSON is proven.

Do not use direct Firebase reads until auth, rules, and user scoping are designed.

### Phase 6D: Optional Progress Export Back Out

Optionally export Half_Ass_Training progress as JSON for backup or reporting.

Do not make StrideSync the progress owner.

## Exact Files Likely Involved In Half_Ass_Training

- `src/data/trainingPlan.ts`
- `src/hooks/useProgress.ts`
- `src/hooks/useSettings.ts`
- `src/utils/workouts.ts`
- `src/shared/run-system-types.ts`
- `src/lib/trainingPlanExport.ts`
- `src/pages/Dashboard.tsx`
- `src/pages/Calendar.tsx`
- `src/pages/Progress.tsx`
- `src/pages/Settings.tsx`
- `src/components/TodayWorkoutCard.tsx`
- `src/components/WorkoutCard.tsx`
- `src/components/WeekCard.tsx`
- `src/components/WorkoutDetailSheet.tsx`
- new `src/lib/actualRunImport.ts`
- new `src/lib/workoutMatching.ts`
- new `src/components/StrideSyncMatchPanel.tsx`
- new `src/components/WorkoutActualComparison.tsx`

## Exact Files Likely Involved In StrideSync Later

- `src/shared/run-system-types.ts`
- `types.ts`
- `App.tsx`
- `services/firebase.ts` only for existing read paths or exported run shaping, not new writes
- `utils/activityUtils.ts`
- `utils/activityMerge.ts`
- `components/ImportPreview.tsx` as a reference pattern for safe preview UI
- new `utils/actualRunSummaryExport.ts`
- new developer-only export script if manual JSON export is first
- docs explaining StrideSync as actual-run provider

## Files That Should Not Be Touched Without Explicit Approval

### Half_Ass_Training

- `src/data/trainingPlan.ts` unless the task is intentionally changing plan content.
- localStorage migration behavior in `src/hooks/useProgress.ts` and `src/hooks/useSettings.ts` until a migration is designed.
- build/deploy config.
- existing route setup unless adding a specific preview/review screen is requested.

### StrideSync

- Strava sync internals.
- `RunActivity` persistence save/update/delete paths.
- Firestore rules.
- Firebase config.
- deploy config.
- activity merge/deletion suppression behavior.
- dashboard and detail behavior unrelated to actual-run summary export.

### GarminVault

- Garmin FIT decoding internals.
- bulk FIT decode paths.
- local Garmin summary parser behavior unless the phase explicitly asks for Garmin data changes.

## Verification Plan

### Phase 5A Verification

- StrideSync: `npm run task:verify`
- Export sample actual-run JSON.
- Validate exported JSON with a pure parser test.
- `git diff --check`
- Confirm no Firebase/Firestore writes were added.

### Phase 5B Verification

- Half_Ass_Training: `npm run lint`
- Half_Ass_Training: `npm run build`
- Parser/preview tests for valid and invalid StrideSync export JSON.
- `git diff --check`
- Confirm no localStorage progress writes occur during preview.

### Phase 5C Verification

- Unit tests for match confidence:
  - exact date/distance/duration match
  - early/late workout
  - multiple runs in one day
  - rest day with actual run
  - missing actual run
  - partial workout
- Half_Ass_Training: `npm run lint`
- Half_Ass_Training: `npm run build`
- `git diff --check`

### Phase 6A Verification

- Unit tests for confirmed progress updates.
- Manual test: confirm one match, reload, ensure progress persists.
- Manual test: existing completed workout is not overwritten.
- Half_Ass_Training: `npm run lint`
- Half_Ass_Training: `npm run build`
- `git diff --check`

### Phase 6B Verification

- Unit tests for rejected matches and manual override persistence.
- Manual test: reject a suggested run, reload, ensure it stays rejected.
- Manual test: mark manually complete, re-import actual runs, ensure manual completion remains.
- Half_Ass_Training: `npm run lint`
- Half_Ass_Training: `npm run build`
- `git diff --check`

### Phase 6C Verification

- Read-only API/auth tests if an endpoint is added.
- Confirm no Firestore writes from Half_Ass_Training.
- Confirm user/athlete scoping.
- StrideSync: `npm run task:verify`
- Half_Ass_Training: `npm run lint && npm run build`
- `git diff --check`

### Phase 6D Verification

- Export/import round-trip tests for progress JSON.
- Manual backup/restore smoke test.
- Half_Ass_Training: `npm run lint`
- Half_Ass_Training: `npm run build`
- `git diff --check`
