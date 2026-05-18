# Phase 12C: Missed Workout And Rearrangement Plan

This is a design-only plan for missed workouts, schedule rearrangement, safe skipping, week repeats, and cross-training substitutions across Half_Ass_Training and StrideSync.

No runtime code is implemented in this phase. No Firebase, Firestore, Strava sync, RunActivity persistence, Half_Ass auto-accept behavior, StrideSync cloud sync behavior, or planned-vs-actual scoring behavior should change in Phase 12C.

## Doc Location Decision

This plan lives in `Half_Ass_Training/docs/` because the feature is mostly a schedule-editing and user-workflow feature. Half_Ass should own the adjusted training schedule first, because it is the standalone plan reference app, already owns the workout detail sheet, calendar, local progress, manual skip/modify actions, automation history, and profile-separated plan state. StrideSync should consume the adjusted schedule later so planned-vs-actual matching targets the workout assigned to the selected date.

StrideSync still matters for matching, cloud sync, and future cross-app contracts, so this document includes explicit StrideSync phases and contract fields. Those parts remain future work.

## Current System Notes From Inspection

- Half_Ass plan data is static in `src/data/trainingPlan.ts`, with workouts keyed by `id`, `week`, `day`, type, zones, steps, notes, optional `plannedDateKey`, and per-profile plan data.
- Half_Ass date resolution currently derives the workout date from `week1Start`, `week`, and `day` in `src/utils/workouts.ts`. A future adjusted schedule layer should sit above this derived date logic instead of mutating the base plan.
- Half_Ass progress is localStorage-only and profile-scoped through `src/hooks/useProgress.ts`, with statuses `completed`, `skipped`, and `modified`, plus notes, pain flags, manual runs, and StrideSync handoff metadata.
- Half_Ass Calendar, Dashboard, Progress, and WorkoutDetailSheet all render the static workout object plus progress status. Schedule edits will need a resolved "assigned workout for date" view model that these surfaces can share.
- The current WorkoutDetailSheet already has `Complete Workout`, `Skip`, and `Modify`. Phase 12E can extend this surface without introducing backend behavior.
- Half_Ass regression guidelines require progress to remain localStorage-backed, preserve modified/completed separation, keep settings/date alignment intact, and avoid backend/cloud sync without explicit approval.
- StrideSync Training plan data is a static local copy of the Half_Ass plan in `components/training/data/trainingPlan.ts`.
- StrideSync planned-vs-actual matching in `components/training/plannedVsActual.ts` currently resolves planned workouts by selected date and static plan position, with quality-workout intensity guards.
- StrideSync progress keys are date-aware and profile-scoped in `components/training/trainingProgress.ts`.
- StrideSync cloud sync in `components/training/trainingCloudSync.ts` is profile-scoped and progress-only. Adjusted schedule persistence is not part of the current cloud schema and should not be added until local behavior is stable.

## A. Product Behavior

### Skip Workout

Allowed when the workout is incomplete, skipped, modified, or missed and the user chooses not to catch up. It should be the default recommendation for most 1-3 day misses.

Blocked when the workout is already completed by a trusted StrideSync handoff or confirmed match unless the user first clears or reverts that completion.

Warning copy:

- "Skipping is safer than cramming missed volume."
- "This keeps the rest of the week intact."
- "Do not squeeze this run into another hard day."

Progress and matches:

- Half_Ass records `status: skipped` for the workout progress entry.
- Existing notes, pain flags, and modification history remain visible.
- Existing completed/matched entries are not overwritten without explicit confirmation.
- StrideSync later treats skipped workouts as intentionally closed, not as missing match targets.

Future dates:

- Future dates do not shift.
- The base plan remains intact.

### Move Workout To Another Date

Allowed when the target date is open, the workout is not already completed, and guardrails classify the move as safe or caution-only.

Blocked when the move creates hard-hard back-to-back days, places a long run too close to a quality session, doubles workouts on one day without explicit safe allowance, crams missed volume, or attempts to move onto a completed workout.

Warning copy:

- "This move creates hard workouts back-to-back."
- "This puts a long run too close to a quality session."
- "This crams too much volume into one week."

Progress and matches:

- Half_Ass stores a schedule override from `originalDate` to `assignedDate`.
- Progress remains keyed to the stable workout identity plus assigned date metadata; existing completion should follow the workout only if the user moved an incomplete workout.
- If a workout was already matched/completed, moving should be blocked or require a separate "clear completion first" flow.
- StrideSync later matches the workout on the adjusted assigned date, not the original static date.

Future dates:

- Moving a single workout should not shift the rest of the plan.
- A move can leave the original date empty or marked "moved".

### Swap Two Workouts

Allowed when both workouts are incomplete, within the same training week or nearby week, and the resulting week passes hard/easy and load guardrails.

Blocked when either workout is completed/matched, when swapping turns a recovery week into a heavy week, or when the result creates hard-hard adjacency.

Warning copy:

- "This swap changes the stress pattern of the week."
- "Recovery weeks should stay easy."
- "One of these workouts is already completed. Undo completion before swapping."

Progress and matches:

- Half_Ass stores two linked schedule adjustments with the same `groupId`.
- Progress and match metadata stay with the workout identity, not the calendar cell.
- StrideSync later uses the swapped assigned dates for match targets.

Future dates:

- Only the two selected dates change.
- The rest of the plan remains unchanged.

### Repeat Week

Allowed when 4-6 days were missed and the current week needs review, or when 7+ days were missed and repeating the previous/current week is safer than cramming.

Blocked during race week unless the app displays a race-specific restart warning and asks for manual review. Blocked when repeating would create a sharp load increase compared with the last completed week.

Warning copy:

- "Repeating a week is safer than cramming missed runs."
- "This keeps the training pattern intact."
- "Race week changes need manual review."

Progress and matches:

- Half_Ass creates a week-level adjustment that maps the selected week template onto a new assigned week range.
- Existing completed workouts remain completed on their historical dates.
- Repeated copies should receive derived assignment IDs while preserving `originalWorkoutId`.
- StrideSync later needs original plan metadata for audit and assigned-date metadata for matching.

Future dates:

- Recommended first implementation: repeat the current or previous week locally without shifting the entire remaining plan.
- Later implementation may offer "repeat week and shift future plan" as an explicit advanced action, but it must be guarded and reversible.

### Replace With Cross-Training

Allowed when the user selects soreness, minor injury, fatigue, or low-impact preference as the reason, especially for easy, foundation, and recovery workouts. It can be caution-allowed for some quality workouts only when the structure is preserved and the activity stays non-impact.

Blocked when the user tries to use cross-training as a way to stack extra load or double up with a hard run on the same day.

Warning copy:

- "Cross-training is recommended if soreness is the reason."
- "Keep the same structure, time, and zones where possible."
- "Do not turn recovery into secret endurance work."

Progress and matches:

- Half_Ass stores the action as `cross_train`, not `modified` only.
- The workout can keep its steps, intervals, times, and zones, with modality metadata such as cycling, elliptical, pool running, or other non-impact aerobic work.
- Completion remains user-confirmed. StrideSync should not auto-match a cycling activity to a run until the adjusted schedule contract supports cross-training.

Future dates:

- No future dates shift.
- Cross-training replaces the assigned workout for that date.

### Mark As Missed

Allowed when a date has passed and the workout is neither completed nor skipped.

Blocked for future dates.

Warning copy:

- "Missed does not mean catch up at all costs."
- "Best option may be skip and continue today."

Progress and matches:

- Half_Ass should distinguish "missed" as a schedule/recommendation state from the existing progress `skipped` state.
- Marking missed should open the decision helper: skip, safe move, cross-train, or repeat week.
- StrideSync should not auto-complete missed workouts from unrelated later runs unless the adjusted schedule assigns that workout to the later date.

Future dates:

- No automatic shift.

### Undo Or Revert Schedule Adjustment

Allowed for skipped, moved, swapped, cross-training, missed, and repeat-week adjustments that have not been superseded by completed/matched progress.

Blocked or caution-gated when reverting would orphan a completion/match. In that case the app should ask whether to keep the completion with the original workout, clear the completion, or cancel.

Warning copy:

- "Undo restores the original plan date."
- "This workout has completion data. Choose what to do with it before reverting."

Progress and matches:

- Store adjustments append-only with `revertedAt` rather than deleting them.
- The active schedule resolver ignores reverted adjustments.
- Progress remains intact unless the user explicitly clears it.

Future dates:

- Reverting restores the original assigned date view.

## B. Guardrail Engine

The guardrail engine should be a pure helper that accepts the base plan, profile id, week1 start date, current progress, schedule adjustments, and a proposed action. It returns:

```ts
type GuardrailSeverity = 'safe' | 'caution' | 'blocked';

type ScheduleGuardrailResult = {
  severity: GuardrailSeverity;
  warnings: string[];
  blockingReasons: string[];
  recommendation: 'allow' | 'allow_with_warning' | 'prefer_skip' | 'prefer_cross_train' | 'prefer_repeat_week' | 'block';
};
```

Workout classification:

- `easy`: `foundation`, `recovery`, easy Zone 1/Zone 2 base work.
- `long_run`: `long-run`.
- `quality`: `fast-finish`, `tempo`, `cruise`, `hills`, `short-interval`, `long-interval`, `mixed-interval`, `long-fast-finish`, `long-speed-play`, threshold, speed, hill, and any workout with meaningful Zone 3/4/5 segments.
- `rest`: `rest`.
- `cross_training_substitute`: adjusted workout with action `cross_train`.

Rules:

- Block quality-quality back-to-back days.
- Require at least one easy, recovery, rest, or cross-training day between hard workouts.
- Cap hard workouts per calendar/training week. Initial recommendation: no more than 3 hard-like stress days per week, where quality workouts count as hard and long-run-with-quality counts as hard.
- Block multiple planned workouts assigned to the same day unless a future explicit double-up mode exists.
- Do not allow double-up with quality or long-run workouts in the first implementation.
- Warn or block when a long run is moved within one day of a quality session. Prefer block when either workout includes Zone 3+ work.
- Warn when weekly duration/load increases more than roughly 10-15% over the original assigned week or recent completed week. Block when the increase is clearly caused by cramming missed work.
- Preserve recovery and taper weeks. Any move that adds hard load to a recovery week should be blocked or require a strong caution with "prefer skip".
- If soreness, hip tightness, ankle tightness, fatigue, or minor injury is the reason, recommend cross-training or rest before any catch-up run.
- Do not turn a recovery week into leg soup.

## C. Missed Day Decision Helper

The decision helper should be the first thing users see after marking a workout missed or opening the app after missed days.

- Missed 1 day: default to "Skip and continue today." Allow moving only if the target date is open and guardrails are safe.
- Missed 2-3 days: default to "Skip missed runs and continue." Optionally move one easy/foundation run if it does not create bunching.
- Missed 4-6 days: recommend a week review. Offer "reduce this week", "repeat current week", or "skip and continue" depending on where the hard workouts fall.
- Missed 7+ days: recommend repeating the previous week or restarting the current week safely. Do not offer cram-style catch-up.
- Soreness or minor injury: recommend rest or cross-training. If cross-training is chosen, preserve the workout structure, intervals, times, and zones when possible using cycling, elliptical, pool running, or another non-impact aerobic mode.

Example smart recommendation copy:

- "You missed 2 days. Best option: skip and continue today."
- "You missed most of this week. Repeating the week is safer than cramming."
- "Because soreness is the reason, replace this with easy cross-training or rest."

## D. Data Model

Half_Ass should store a profile-scoped local schedule adjustment map and keep the original plan immutable.

Recommended localStorage key:

```text
half_ass_schedule_adjustments_v1:<planId>
```

For legacy Mikey behavior, using `half_ass_schedule_adjustments_v1` as a migration alias is acceptable, but new reads and writes should prefer explicit plan/profile scoping.

Recommended shape:

```ts
type ScheduleAdjustmentAction =
  | 'skipped'
  | 'moved'
  | 'swapped'
  | 'cross_train'
  | 'repeat_week'
  | 'missed';

type ScheduleAdjustmentSource = 'user' | 'manual' | 'guardrail';

type ScheduleAdjustmentStatus = 'active' | 'reverted';

type ScheduleAdjustment = {
  id: string;
  scheduleAdjustmentVersion: 1;
  profileId: string;
  planId: string;
  workoutId: string;
  originalDate: string;
  newDate?: string;
  assignedDate?: string;
  action: ScheduleAdjustmentAction;
  reason?: string;
  status: ScheduleAdjustmentStatus;
  createdAt: string;
  updatedAt: string;
  revertedAt?: string;
  source: ScheduleAdjustmentSource;
  ruleWarnings: string[];
  groupId?: string;
  crossTrainingType?: 'cycling' | 'elliptical' | 'pool_running' | 'walking' | 'other';
  originalWorkoutId?: string;
  repeatWeek?: {
    sourceWeek: number;
    assignedWeekStart: string;
    shiftFuturePlan: boolean;
  };
};

type ScheduleAdjustmentState = {
  schemaVersion: 1;
  profileId: string;
  planId: string;
  updatedAt: string;
  adjustments: Record<string, ScheduleAdjustment>;
};
```

How to keep the base plan intact:

- Never edit `src/data/trainingPlan.ts` from user actions.
- Build a derived schedule view by applying active adjustments over the static plan.
- Store `originalDate` and `originalWorkoutId` for every adjustment.
- Use `assignedDate` for the effective matching/display date.
- Store `ruleWarnings` for audit, but recompute guardrails when editing because neighboring schedule state may change.

Undo:

- Mark adjustment `status: reverted` and set `revertedAt`.
- Do not delete adjustment records unless the user resets all schedule adjustments.
- If progress exists for the adjusted assignment, ask whether to keep, clear, or cancel.

Avoiding destructive plan changes:

- Treat schedule adjustments as an overlay.
- Add tests proving the static plan object is not mutated.
- Export/import should include the base plan id plus overlay state, not a rewritten plan.

## E. Half_Ass Implementation Plan

### Phase 12D: Local Schedule Adjustment Data Model And Helpers

Likely files:

- `src/hooks/useScheduleAdjustments.ts`
- `src/lib/scheduleAdjustments.ts`
- `src/lib/scheduleGuardrails.ts`
- `src/utils/workouts.ts`
- `src/data/trainingPlan.ts` only for type imports if needed, not plan rewrites.
- tests for schedule resolver and guardrails.

Scope:

- Add localStorage read/write for `half_ass_schedule_adjustments_v1:<planId>`.
- Add pure resolver for effective assigned workouts by date.
- Add pure guardrail checker.
- Keep existing progress untouched.

### Phase 12E: UI For Skip, Move, Swap, Cross-Train, Repeat Week

Likely files:

- `src/components/WorkoutDetailSheet.tsx`
- `src/pages/Calendar.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/Progress.tsx`
- shared schedule action components if the sheet gets too large.

Scope:

- Add action buttons and mobile-first flows.
- Add date picker for move.
- Add two-workout picker for swap.
- Add cross-training modality selector.
- Add repeat-week confirmation.
- Add smart recommendation panel.

### Phase 12F: Guardrail Warnings And Blocked Actions

Likely files:

- `src/lib/scheduleGuardrails.ts`
- `src/components/WorkoutDetailSheet.tsx`
- `src/pages/Calendar.tsx`
- tests for blocked/caution/safe states.

Scope:

- Show green safe, amber caution, red blocked states.
- Block hard-hard, cramming, unsafe double-ups, and recovery-week overload.
- Prefer skip/cross-training recommendations when rearranging is unsafe.

### Phase 12G: Persistence, History, And Undo Polish

Likely files:

- `src/hooks/useScheduleAdjustments.ts`
- `src/pages/Progress.tsx`
- `src/pages/Settings.tsx`
- export/import helpers if settings export includes progress.

Scope:

- Add adjustment history.
- Add undo/revert.
- Make import/export preserve schedule overlays separately from progress.
- Confirm profile separation for Mikey and Manny.

## F. StrideSync Implementation Plan

StrideSync should eventually match against the adjusted schedule, not only the static plan.

Expected behavior:

- If Half_Ass moves a workout from Monday to Tuesday, Tuesday becomes the planned-vs-actual target for that workout.
- A run should match the workout assigned to the selected date.
- The original plan reference should remain visible for audit, e.g. "Originally Week 3 Monday, moved to Tuesday."
- Existing match metadata should preserve both `plannedDateKey` and `assignedDate` once adjusted schedules exist.
- Profile separation must remain strict for Michael, Shawn, Tiffany, and any future athletes.
- Cloud sync should not be expanded to adjusted schedules until the local UX and contract are proven.

### Phase 12H: Adjusted Schedule Source

Choose between importing/exporting adjusted schedules from Half_Ass or duplicating the adjustment logic in StrideSync. Preferred: Half_Ass owns adjustments and exports a versioned schedule overlay for StrideSync to consume.

Likely files later:

- Half_Ass export helper for schedule adjustments.
- StrideSync import/preview or local adjustment consumer.
- Existing shared contract docs.

### Phase 12I: StrideSync Adjusted-Plan Matching Support

Likely files later:

- `components/training/plannedVsActual.ts`
- `components/training/trainingProgress.ts`
- Training tab shell/view model files.
- matching tests.

Scope:

- Resolve workout for selected date through adjusted schedule overlay.
- Keep fallback to static plan when no adjustment exists.
- Preserve quality-intensity matching guards.
- Keep local auto-complete eligibility based on the adjusted assigned date.

### Phase 12J: Cross-App Adjusted Schedule Contract

Likely files later:

- `docs/SHARED_RUN_SYSTEM_CONTRACTS.md`
- shared run-system types.
- Half_Ass export types.
- StrideSync validation helpers.

Scope:

- Define contract versioning.
- Validate profile and plan identity.
- Keep preview/validation before any writes.

### Phase 12K: Cloud Or Shared Persistence Design If Needed

Likely files later:

- StrideSync cloud sync design docs.
- Potential future cloud schema version.

Scope:

- Design only after Half_Ass local behavior is stable.
- Do not jump straight to Firestore.
- Decide whether schedule overlays belong beside progress or in a separate document.

## G. Cross-App Contract

Preferred ownership model: Half_Ass owns schedule adjustments. StrideSync consumes the adjusted schedule later for matching.

Reasoning:

- Half_Ass is the reference schedule app and already owns the plan UI.
- Duplicating the same schedule rules in both apps risks drift.
- StrideSync already owns actual runs and matching, so it should consume assigned-date metadata and keep original plan references for audit.
- Cloud/shared persistence should wait until local behavior and contract validation are stable.

Future contract:

```ts
type ScheduleAdjustmentExportV1 = {
  scheduleAdjustmentVersion: 1;
  sourceApp: 'Half_Ass_Training';
  generatedAt: string;
  profileId: string;
  planId: string;
  adjustments: ScheduleAdjustmentContractEntry[];
};

type ScheduleAdjustmentContractEntry = {
  scheduleAdjustmentVersion: 1;
  profileId: string;
  planId: string;
  workoutId: string;
  originalDate: string;
  assignedDate: string;
  action: 'skipped' | 'moved' | 'swapped' | 'cross_train' | 'repeat_week' | 'missed';
  reason?: string;
  status: 'active' | 'reverted';
  createdAt: string;
  updatedAt: string;
  guardrailWarnings: string[];
  crossTrainingType?: 'cycling' | 'elliptical' | 'pool_running' | 'walking' | 'other';
  originalWorkoutId?: string;
  groupId?: string;
};
```

StrideSync should validate:

- `scheduleAdjustmentVersion === 1`
- `sourceApp === 'Half_Ass_Training'`
- known `profileId`
- known `planId`
- known `workoutId` or safe unknown-workout warning
- valid ISO date strings for `originalDate` and `assignedDate`
- active/reverted status
- no cross-profile leakage

## H. UI / UX

Add actions in WorkoutDetailSheet and calendar contexts:

- Skip
- Move
- Swap
- Replace with cross-training
- Repeat week
- Mark missed
- Undo adjustment

Smart recommendation panel:

- Put this above the destructive/action buttons when the workout is missed or the user opens a past incomplete workout.
- Keep it short: "You missed 2 days. Best option: skip and continue today."
- Show the reason: "This avoids hard workouts back-to-back."

Warning states:

- Green safe: action can proceed.
- Amber caution: action can proceed with a clear warning.
- Red blocked: action cannot proceed; offer safer choices.

Example warning copy:

- "This move creates hard workouts back-to-back."
- "This crams too much volume into one week."
- "Cross-training recommended if soreness is the reason."
- "Recovery week should stay easy."

Mobile-first principles:

- Keep the sheet action area compact.
- Use progressive disclosure for Move/Swap details.
- Do not show every rule at once.
- Make the recommended action visually primary.
- Keep advanced actions below safe defaults.

## I. Future Tests

- Moving an easy/foundation run to an open day is allowed.
- Moving an interval next to tempo is blocked.
- Moving a long run next to an interval warns or blocks based on intensity and spacing.
- Missed 1-3 days recommends skip and continue.
- Missed 7+ days recommends repeating a previous/current week instead of cramming.
- Cross-training substitute preserves workout structure, intervals, times, and zones.
- Undo restores the original schedule assignment.
- Adjusted schedule overlay does not mutate the base training plan.
- Completed workouts remain associated with the correct workout identity after safe schedule changes.
- Matched workouts are not silently moved or orphaned.
- StrideSync matching uses adjusted assigned date when an adjustment is present.
- StrideSync quality-intensity guardrails still apply after adjusted date resolution.
- Profile separation: Michael, Shawn, Tiffany, Mikey, and Manny adjustments do not leak across profiles/plans.
- Recovery week guardrail blocks extra quality load.
- Same-day double-up is blocked unless a future explicit safe mode is introduced.

## J. Recommendation

Start with Half_Ass local schedule adjustment planning and UI.

Half_Ass should be the source of truth for plan adjustments. StrideSync should consume adjusted schedule metadata later for planned-vs-actual matching. Do not jump straight to Firestore or shared persistence until the local behavior, undo model, profile separation, and guardrails are stable.

Keep guardrails advisory/blocking before automation. The app should help the runner make safer choices, not maximize completion percentage by cramming missed volume.

Recommended phase order:

1. Phase 12D: Half_Ass local schedule adjustment data model, resolver, and guardrail helpers.
2. Phase 12E: Half_Ass UI for Skip, Move, Swap, Cross-train, Repeat week, Mark missed, and Undo.
3. Phase 12F: Guardrail warnings and blocked actions.
4. Phase 12G: Persistence/history/undo polish and import/export review.
5. Phase 12H: Export adjusted schedule from Half_Ass for StrideSync or define a preview-only consumer.
6. Phase 12I: StrideSync adjusted-plan matching support.
7. Phase 12J: Cross-app adjusted schedule contract.
8. Phase 12K: Cloud/shared persistence design only if local behavior proves stable.
