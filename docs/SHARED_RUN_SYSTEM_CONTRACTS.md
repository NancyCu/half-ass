# Shared Run System Contracts

Phase 1 keeps the running-system contracts copied inside each existing app repo instead of creating a parent repo, monorepo, shared package, or fourth app.

This repo's copy lives at `src/shared/run-system-types.ts`. It is contract-only and is not imported into runtime code yet. The copied contract may become a real shared package later, but only after Garmin activity export/import and training-plan export/import flows are proven safely.

## Half_Ass_Training Export Adapter

Phase 3 adds a pure training-plan adapter in `src/lib/trainingPlanExport.ts`.

The adapter maps the existing `WeekPlan[]`, optional settings, and optional progress into a `TrainingPlanExportV1` object:

```ts
{
  exportVersion: 1,
  generatedAt: "2026-05-06T12:00:00.000Z",
  sourceApp: "Half_Ass_Training",
  plan: {
    id: "half-ass-training-80-20-half-marathon",
    name: "80/20 Half Marathon Training Plan",
    sourceApp: "Half_Ass_Training",
    weeks: [
      {
        week: 1,
        phase: "Base Phase",
        days: [
          {
            id: "w1-d1",
            planId: "half-ass-training-80-20-half-marathon",
            week: 1,
            day: 1,
            dayName: "Monday",
            name: "Foundation Run 3",
            type: "foundation",
            duration: "30 min",
            zone: "Z1/Z2",
            targetBpm: "129-140 bpm",
            targetPace: "10:15-11:20/mi",
            steps: ["5 mins Zone 1", "20 mins Zone 2", "5 mins Zone 1"]
          }
        ]
      }
    ]
  },
  settings: {
    week1Start: "2026-05-04",
    raceDate: "2026-08-16"
  },
  progress: [
    {
      plannedWorkoutId: "w1-d1",
      status: "completed",
      note: "Felt controlled.",
      flags: ["Good"],
      updatedAt: "2026-05-06T12:00:00.000Z"
    }
  ]
}
```

This is preview/import-only for a later StrideSync flow. It does not connect to Firebase, does not write to Firestore, does not add a StrideSync dependency, and does not change localStorage migration behavior.

## Phase 12B: Beta-Blocker Adjusted Training Zones

Phase 12B updates Mikey's static 80/20 training-zone configuration to the current beta-blocker adjusted references:

- Threshold HR: about 150 bpm
- Threshold pace: about 8:40/mi
- Zone 1 Recovery: 118-128 bpm, 11:20+/mi
- Zone 2 Aerobic Endurance: 129-140 bpm, 10:15-11:20/mi
- Black Hole Zone Moderate Gray Zone: 141-145 bpm, 9:30-10:15/mi
- Zone 3 Tempo / Fast Finish: 146-152 bpm, 8:40-9:20/mi
- Zone 4 Hard Intervals: 153-158 bpm, 7:50-8:30/mi
- Zone 5 Speed / Short Bursts: 159+ bpm if reachable, faster than 7:45/mi

This is a local static data/config update. It does not add Firebase or Firestore reads/writes, does not change StrideSync handoff auto-accept behavior, and does not change localStorage migration behavior.

## Developer Smoke-Test Export

Phase 4.5 adds a developer-only script for manual integration smoke tests:

```bash
npm run export:run-system:sample
```

The export script reads the existing static `trainingPlan` data, creates a `TrainingPlanExportV1` payload with sample `week1Start` and `raceDate` settings, and writes:

```text
/tmp/half-ass-training-plan-export.json
```

This script is not app runtime behavior. It does not contact StrideSync, does not connect to Firebase, does not read or write Firestore, does not use the network, does not write localStorage, and does not change training plan data or localStorage migrations. The JSON file is for copy/paste preview in StrideSync at `?importPreview=1`; it does not save or import anything by itself.
