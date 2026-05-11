# Half_Ass Auto-Complete Handoff Plan

This is a design plan only. Do not implement Half_Ass auto-complete until a later task explicitly asks for it.

## Recommendation

Use a URL handoff auto-accept setting first. Do not go straight to shared Firestore progress.

The fastest safe path is a Half_Ass receiver-side setting:

```text
Auto-accept trusted StrideSync handoffs
```

When this setting is off, the current confirmation flow remains unchanged. When it is on, Half_Ass may auto-complete only a narrow, trusted StrideSync URL handoff that already represents a StrideSync trusted match. Half_Ass should still write only to its own browser-local `localStorage` progress store.

Shared Firestore progress should wait until local auto-accept proves the matching contract, duplicate handling, stale-link behavior, and undo/clear UX. Firestore adds identity, security rules, cross-device reconciliation, and wrong-user risk before the local receiver behavior is proven.

## Current State

StrideSync currently creates Half_Ass handoff URLs from completed local Training matches:

```text
source=stridesync
action=completeWorkout
date=YYYY-MM-DD
workoutId=<planned workout id>
workoutName=<planned workout name>
runName=<display name>
runDistance=<miles>
runDuration=<minutes>
runSource=<provider/source>
```

Half_Ass currently reads `source=stridesync` plus `action=completeWorkout`, resolves the planned workout from `date` and `week1Start`, checks the resolved workout name against `workoutName`, shows a confirmation panel, and writes `completed` only after the user confirms.

## Current Half_Ass Storage Keys

Half_Ass settings:

```text
half_ass_training_settings_v1
```

Half_Ass progress for Mikey/default plan:

```text
half_ass_training_progress_v1
```

Half_Ass progress for Manny and any non-default plan:

```text
half_ass_training_progress_v1_<planId>
```

Phase 10B duplicate protection:

```text
halfass_stride_handoff_applied_v1
```

Phase 10C local automation history:

```text
halfass_stride_handoff_history_v1
```

The current progress payload contains:

```ts
{
  workouts: Record<string, {
    status?: 'completed' | 'skipped' | 'modified'
    note?: string
    flags?: Array<'Good' | 'Tired' | 'Hip tight' | 'Ankle tight' | 'HR too high'>
    updatedAt?: string
  }>
  manualRuns: Array<{
    id: string
    date: string
    name: string
    distanceMiles: number
    duration?: string
    durationMinutes?: number
    pace?: string
    averageHr?: number
    createdAt: string
  }>
}
```

Future auto-accept bookkeeping should either extend the relevant workout entry with optional handoff metadata, or use a separate local key such as:

```text
half_ass_training_handoffs_v1
```

Keeping duplicate receipts separate is cleaner if the first implementation wants to avoid changing the progress schema beyond setting `status`.

## Trusted URL Contract

The current URL is enough for manual confirmation. It is not enough for safe auto-accept because it has no stable run id, no generated timestamp, no trust marker, and no duplicate id.

For auto-accept, trust only this required set:

```text
source=stridesync
action=completeWorkout
date=YYYY-MM-DD
workoutId=<planned workout id>
workoutName=<planned workout name>
runId=<StrideSync activity id>
runSource=<provider/source>
matchStatus=likely_match
confidence=<0-100 number>
handoffGeneratedAt=<ISO timestamp>
handoffId=<stable id>
```

Optional display-only params:

```text
runName
runDistance
runDuration
```

Optional diagnostic params:

```text
autoCompleted=true
matchReason=<short reason>
```

Do not let display-only params decide completion. `runName`, `runDistance`, and `runDuration` can appear in the receipt, but they should not bypass date, workout, confidence, staleness, duplicate, or setting checks.

## Auto-Accept Rules

Half_Ass may auto-accept only when all of these are true:

- The local setting `Auto-accept trusted StrideSync handoffs` is on.
- `source` is exactly `stridesync`.
- `action` is exactly `completeWorkout`.
- `date` is a valid ISO date.
- `handoffGeneratedAt` is present, valid, and recent.
- `workoutId` and `workoutName` are present.
- `runId` and `runSource` are present.
- `matchStatus` is exactly `likely_match`.
- `confidence` is at least `80`.
- The URL workout resolves to exactly one Half_Ass planned workout for the active plan and `week1Start`.
- The resolved workout id matches `workoutId`, or a documented compatibility mapping handles known pre-plan id differences.
- The resolved workout name matches `workoutName` after normalization.
- The resolved date is the planned workout date.
- The workout does not already have `completed`, `skipped`, or `modified` status.
- `handoffId` has not already been consumed.

If any check fails, keep the current manual confirmation panel or show a non-mutating review/dismiss state. Do not auto-complete.

## Stale, Wrong, Complete, Or Ambiguous Handoffs

Stale handoff:

- Do not auto-complete.
- Show review/dismiss copy.
- Recommended stale window: 24 hours from `handoffGeneratedAt`. A later implementation can tune this to 48 hours if real phone handoff delays make 24 too strict.

Wrong date:

- Do not auto-complete.
- If a workout still resolves, show manual review only.
- If no workout resolves, show the existing unmatched handoff state.

Already complete:

- Do not write again.
- Show a receipt-style message that the workout is already complete.
- Clean URL params after the user dismisses.

Skipped or modified:

- Do not overwrite.
- Show manual review only, with copy that an existing local decision is being preserved.

Ambiguous:

- Do not auto-complete.
- Treat missing `runId`, missing confidence, low confidence, non-`likely_match`, multiple matching plan candidates, name mismatch, or date mismatch as ambiguous.

Wrong athlete/plan:

- Do not auto-complete.
- The active Half_Ass plan must match the planned workout and date. A future URL can include `planId`, but the receiver should still resolve locally and reject mismatch.

## Duplicate Protection

Add a stable `handoffId` to future StrideSync URLs. Recommended format:

```text
stridesync:<runSource>:<runId>:<date>:<workoutId>
```

Half_Ass should store consumed handoffs locally with the active plan id, workout id, run id, consumed timestamp, and decision:

```ts
{
  handoffs: Record<string, {
    planId: string
    workoutId: string
    runId: string
    date: string
    decision: 'auto_completed' | 'confirmed' | 'dismissed'
    consumedAt: string
  }>
}
```

Duplicate behavior:

- Same `handoffId` and workout already completed: no-op, show already-complete receipt.
- Same `handoffId` but workout status cleared later: show manual review instead of silently re-completing.
- Different `handoffId` for a completed workout: do not overwrite; show review only.
- Same `runId` trying to complete a different workout: reject auto-accept and show review.

## Undo And Clear

Undo should remain local and obvious:

- Existing `Undo Complete` and progress reset flows should clear `status`.
- If auto-accept metadata is stored on the workout entry, undo should clear that metadata too.
- If duplicate receipts are stored in `half_ass_training_handoffs_v1`, undo should either mark the consumed handoff as `cleared` or remove it and store a short-lived blocked receipt so browser refresh does not immediately re-accept the same URL.
- Clearing URL params should happen after successful auto-accept and after manual dismiss, using the same approach as the current handoff cleanup.

Recommended first implementation:

- After auto-accept, clean the URL immediately.
- Store enough receipt metadata to show what was accepted.
- Keep the normal workout-level undo behavior as the recovery path.
- Do not auto-accept the same `handoffId` again after undo unless the user manually confirms it.

## Fastest Safe Implementation Path

1. Extend the StrideSync handoff URL contract in docs and then code later with `runId`, `matchStatus`, `confidence`, `handoffGeneratedAt`, and `handoffId`.
2. Add a Half_Ass local setting defaulting off: `Auto-accept trusted StrideSync handoffs`.
3. Keep the current manual confirmation panel as the fallback for every rejected or incomplete auto-accept.
4. Add receiver validation helpers that produce explicit states: `autoAccept`, `manualReview`, `alreadyComplete`, `duplicate`, `stale`, `invalid`.
5. On successful auto-accept, set only the current active plan's local workout status to `completed`, record the consumed handoff, and clean URL params.
6. Add tests before broadening behavior.

## Tests To Add

Half_Ass unit tests:

- Parses the current manual handoff URL and preserves manual confirmation behavior when the setting is off.
- Auto-accepts only when all required trusted params are present and valid.
- Rejects stale `handoffGeneratedAt`.
- Rejects missing `runId`, missing `handoffId`, missing `matchStatus`, or confidence below 80.
- Rejects `possible_match`, `needs_review`, and unknown statuses.
- Rejects wrong `workoutName`, wrong `workoutId`, wrong date, and invalid date.
- Rejects already completed, skipped, or modified workouts.
- Prevents duplicate `handoffId` from writing twice.
- Prevents the same `runId` from completing a different workout.
- Cleans URL params after successful auto-accept and after dismiss.
- Preserves per-plan progress isolation for `half_ass_training_progress_v1` and `half_ass_training_progress_v1_<planId>`.

StrideSync unit tests:

- Handoff URL includes the required trusted params for confirmed trusted matches.
- Handoff URL omits private tokens and auth data.
- `handoffId` is stable for the same run/workout/date/source.
- Non-trusted matches do not advertise auto-accept eligibility.

## Phase 10C Notes

Phase 10C adds a local receipt trail for StrideSync handoff automation without changing the runtime contract between apps.

Storage:

```text
halfass_stride_handoff_history_v1
```

Each receipt is compact and browser-local. Entries may include:

- local receipt id and `handoffId` when supplied, otherwise the existing handoff identity
- planned workout date
- workout id or workout name
- StrideSync run name, distance, duration, and source
- accepted/recorded timestamp
- mode: `auto_accept` or `manual_confirm`
- status: `applied`, `dismissed`, `rejected`, `duplicate`, or `undone` if a safe undo event is available later
- rejection reason for rejected handoffs

Receipts must not store tokens, auth data, Strava credentials, Firebase identifiers, or anything sensitive. The history key is separate from:

```text
half_ass_training_settings_v1
halfass_stride_handoff_applied_v1
half_ass_training_progress_v1
half_ass_training_progress_v1_<planId>
```

The Settings screen shows a compact "StrideSync automation history" section near the auto-accept toggle so the user can review what automation did recently. The optional clear control removes only `halfass_stride_handoff_history_v1`; it does not clear workout progress, duplicate protection, or settings.

Phase 10C does not add Firestore/Firebase reads or writes, does not create shared Firestore progress, and does not require a StrideSync runtime change. StrideSync was not modified for this phase.

Integration smoke tests:

- Setting off: URL opens Half_Ass and asks for confirmation.
- Setting on with trusted URL: Half_Ass marks the workout complete locally and cleans the URL.
- Refreshing the same URL or reopening the same handoff does not duplicate or re-complete after undo.
- Wrong athlete/plan/date falls back to review and does not mutate progress.

## Non-Goals For The Next Implementation

- No Firebase or Firestore reads.
- No Firebase or Firestore writes.
- No shared backend progress.
- No direct localStorage writes from StrideSync into Half_Ass.
- No Strava token, auth, or private provider data in URLs.
- No auto-complete when the Half_Ass setting is off.

## Phase 10B Implementation Notes

Phase 10B adds the first local-only Half_Ass receiver implementation behind a browser-local setting:

```text
Auto-accept trusted StrideSync handoffs
```

The setting is persisted inside the existing Half_Ass settings key and defaults off:

```text
half_ass_training_settings_v1
```

Duplicate/idempotency receipts are stored under:

```text
halfass_stride_handoff_applied_v1
```

Implemented validation:

- `source=stridesync`
- `action=completeWorkout`
- valid `YYYY-MM-DD` date
- date resolves to one active-profile Half_Ass workout or supported pre-plan Foundation workout
- `workoutName` matches the resolved workout name
- `workoutId` matches the resolved workout id, with a compatibility alias for current pre-plan Foundation handoffs
- `runName`, positive `runDistance`, positive `runDuration`, and `runSource` are present
- existing `completed`, `skipped`, or `modified` status is not overwritten
- duplicate handoff identities do not re-apply
- the same run identity is not allowed to silently complete a different workout
- optional `matchStatus` must be `likely_match` when present
- optional `confidence` must be at least `80` when present
- optional `matchedAt` or `handoffGeneratedAt` must be recent when present

Known limitations:

- Current StrideSync URLs may not include `runId`, `confidence`, `matchStatus`, `matchedAt`, or `handoffVersion` yet.
- Phase 10B therefore treats those richer params as optional receiver checks, while still requiring exact date/workout matching and positive run metrics before auto-accept.
- A later StrideSync phase, likely Phase 10D, should add stable `runId`, `matchStatus`, `confidence`, timestamp, and handoff version params to make the sender contract stronger.
- Undo remains local. Clearing a workout removes the auto-accepted completion metadata from that workout entry, while the duplicate receipt stays in place so the same stale URL cannot immediately re-complete after undo.

Guardrails preserved:

- No Firebase or Firestore reads.
- No Firebase or Firestore writes.
- No shared Firestore progress.
- No StrideSync runtime change.
- No GarminVault touch.
