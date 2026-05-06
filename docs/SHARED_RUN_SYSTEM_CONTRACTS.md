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
            targetBpm: "130-143 bpm",
            targetPace: "10:45-11:30/mi",
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
