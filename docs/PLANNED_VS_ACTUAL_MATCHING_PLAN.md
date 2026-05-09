# Planned vs Actual Matching Plan

This is a design plan only. Do not implement Phase 5 or Phase 6 from this document until a later task explicitly asks for it.

## Architecture Recommendation

Half_Ass_Training should remain the owner of planned workouts, schedule state, and workout completion/progress. StrideSync should remain the source of actual run data from Strava, Garmin, Firebase, and any future activity providers. GarminVault should remain a Garmin import/export helper that can inspect local Garmin data and produce Garmin activity contract JSON.

Do not redesign this as StrideSync taking over training-plan completion. StrideSync can provide actual run summaries, but Half_Ass_Training should decide how those runs map to the plan and should write only to its own progress state.

Important architecture update: Half_Ass_Training may remain both a standalone training schedule app and the reference implementation for a future StrideSync Training tab/module. StrideSync is likely the final unified daily-use app, but the training system should still be treated as one domain model with two possible shells during migration:

- Standalone Half_Ass_Training shell.
- Embedded StrideSync Training tab shell.

The goal is to avoid maintaining two divergent copies of the same training logic. During migration, keep Half_Ass_Training standalone and working, use it as the reference implementation, and build the StrideSync Training tab carefully from the same data model and behavior. Long term, either retire the standalone app once StrideSync fully replaces it, or extract shared `training-core` / `training-ui` modules so both shells use the same plan data, progress logic, matching logic, and UI components.

## Long-Term Destination

- StrideSync remains production-sensitive and owns actual run data.
- Half_Ass_Training remains the reference owner of training schedule behavior while migration is underway.
- StrideSync can gain a hidden, then user-facing, Training tab that uses the same training model and behavior.
- GarminVault stays separate longer as the local Garmin file-processing and Garmin export/import utility.
- The final decision can happen later:
  - retire standalone Half_Ass_Training after the StrideSync Training tab fully replaces it, or
  - extract shared training modules so both apps keep working from one implementation.

## Dual-Shell Strategy

There should be one training system with two possible shells:

- Half_Ass_Training shell: standalone app for schedule, progress, and matching reference behavior.
- StrideSync Training tab shell: embedded module for daily use beside actual StrideSync run data.

Shared behavior should be designed around a training-core boundary:

- plan data
- date calculations
- progress status model
- planned-vs-actual matching
- manual override semantics
- review queue semantics

Shared UI can be considered later as a training-ui boundary:

- Today workout card
- calendar badges
- match panel
- workout comparison
- review queue

Do not copy all routes, state, and components blindly into StrideSync. Each migration step should identify what belongs in shared training logic, what is shell-specific, and what must remain untouched in StrideSync.

## Near-Term Safety

- Keep Half_Ass_Training separate and usable during migration.
- Use export/import contracts and preview flows as scaffolding.
- Build StrideSync Training tab behind a hidden route/tab before exposing it.
- Do not merge everything in one step.
- Do not create a monorepo, shared package, or fourth app unless explicitly requested later.
- Do not write training progress to Firestore until UI, matching, and manual confirmation are proven.
- Do not duplicate training logic in two apps without a plan to retire one copy or extract shared modules.

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

Phase 5 should establish StrideSync as a safe actual-run provider and begin a careful Training tab migration path, without automatic completion.

Recommended scope:

- Treat Phase 5A StrideSync actual-run-summary export contract as complete.
- Prefer read-only manual export/import first.
- Add a hidden StrideSync Training tab shell before moving user-facing training behavior.
- Migrate static plan data and UI in small reviewed pieces.
- Keep Half_Ass_Training standalone and use it as the reference implementation.
- Add a Half_Ass_Training or StrideSync actual-run-summary import/preview only when the phase explicitly asks for it.
- Validate shape, dates, distance, duration, source, and provider activity IDs.
- Store nothing at first, or store only preview-local state.
- Do not write training progress to Firebase or Firestore yet.
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
  activities: ActualRunSummary[]
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
- Avoid dependency conflicts when moving Half_Ass_Training UI into StrideSync.
- Avoid duplicated date logic between apps.
- Avoid duplicate progress records when local StrideSync training state is later migrated to Firestore.
- Avoid accidentally changing production StrideSync run data while building training features.
- Avoid UI clutter in StrideSync; start hidden and promote gradually.
- Avoid maintaining two divergent versions of the same training experience.

## Implementation Phases

### Phase 5A: StrideSync Actual Run Summary Export Contract

Complete. StrideSync added and committed a read-only actual-run summary export contract and pure mapper.

Completed branch/commit:

- StrideSync branch: `codex/phase-5a-actual-run-summary-export`
- Commit: `2a8463b Add actual run summary export contract`

No Firestore writes. No Half_Ass_Training writes. No matching yet.

### Phase 5B: StrideSync Hidden Training Tab Shell

Add a hidden Training tab/module shell inside StrideSync.

No copied training logic yet beyond a placeholder shell. No Firestore progress writes. No dashboard or Strava sync changes.

### Phase 5C: Migrate Static Training Plan Data Into StrideSync

Move or copy the static plan data behind the hidden StrideSync Training tab in a reviewed, behavior-preserving way.

Half_Ass_Training remains the reference implementation. Any copied plan data must match `src/data/trainingPlan.ts`.

### Phase 5D: Migrate Training UI Components Carefully

Move the core Training UI patterns into StrideSync behind the hidden Training tab.

Review component dependencies, styling assumptions, icons, local state, and route expectations before copying anything.

### Phase 5E: Local-Only Progress/Completion State Inside StrideSync

Add local-only StrideSync Training progress state after the hidden UI is stable.

This is not Firestore-backed yet. It should preserve Half_Ass_Training semantics and prepare for later migration.

### Phase 6A: Planned-vs-Actual Match Preview Using StrideSync Runs

Add a paste/upload preview for StrideSync actual run summary JSON.

No localStorage writes yet. No progress mutation yet.

Run the matching engine in preview mode only.

Show suggested matches, warnings, and confidence beside planned workouts. Do not update progress yet.

### Phase 6B: User-Confirmed Completion

Allow the user to confirm a match and update training progress in the active shell.

Manual confirmation should happen before any Firestore-backed progress is added.

### Phase 7: Firestore-Backed Training Progress

After local-only progress and matching are proven, design Firestore-backed training progress for StrideSync.

This phase must include auth, rules, user scoping, migrations, duplicate protection, and rollback thinking.

### Phase 8A: Decide Whether To Retire Standalone Half_Ass_Training

Once StrideSync Training fully covers the standalone app's core workflows, decide whether the standalone app should be retired.

Retirement should happen only after real use confirms parity.

### Phase 8B: Extract Shared Training Modules If Keeping Both

If both shells should remain active, extract shared training-core/training-ui modules so the two apps use one implementation.

Do not keep two divergent copies of plan data, progress logic, matching logic, or UI components.

### Later: Review Queue And Manual Override

Add review queue UI and persist manual override metadata.

Protect manual decisions from future auto-matching.

### Later: Optional Direct Read/API Integration

Consider a StrideSync read-only API/export endpoint after manual JSON is proven.

Do not use direct Firebase reads until auth, rules, and user scoping are designed.

### Later: Optional Progress Export Back Out

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
- production run data persistence.
- Strava sync request paths.
- visible navigation unless a hidden Training tab phase explicitly asks for it.

### GarminVault

- Garmin FIT decoding internals.
- bulk FIT decode paths.
- local Garmin summary parser behavior unless the phase explicitly asks for Garmin data changes.

## What Should Not Happen

- No full app merge in one step.
- No direct copy-paste of all routes/state without review.
- No Firestore training progress writes until UI and matching are proven.
- No breaking current StrideSync dashboard behavior.
- No changing Strava sync as part of Training tab migration.
- No changing `RunActivity` persistence as part of Training tab migration.
- No duplicated training logic that drifts between apps.
- No monorepo/shared package conversion unless explicitly requested later.
- No automatic app connection until contract previews and local-only behavior are proven.

## Success Criteria

- The Training module works inside StrideSync without breaking existing StrideSync dashboard/activity workflows.
- Standalone Half_Ass_Training still works during migration.
- Planned workouts can be shown beside actual StrideSync runs.
- The user can confirm completion, partial completion, skip, missed, or manual completion.
- Existing StrideSync activity data remains untouched.
- The final architecture decision can be made later:
  - retire standalone Half_Ass_Training, or
  - extract shared `training-core` / `training-ui` modules and keep both shells.

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
