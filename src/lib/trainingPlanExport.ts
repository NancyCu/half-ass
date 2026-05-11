import type { ProgressState } from '../hooks/useProgress'
import { effectiveWorkoutStatus } from './workoutProgress'
import type { SettingsState } from '../hooks/useSettings'
import type { WeekPlan, Workout } from '../data/trainingPlan'
import type {
  PlannedWorkout,
  PlannedWorkoutProgress,
  PlannedWorkoutWeek,
  TrainingPlanDefinition,
  TrainingPlanExportV1,
  TrainingPlanSettings,
} from '../shared/run-system-types'

export const TRAINING_PLAN_EXPORT_ID = 'half-ass-training-80-20-half-marathon'
export const TRAINING_PLAN_EXPORT_NAME = '80/20 Half Marathon Training Plan'

export type TrainingPlanExportInput = {
  weeks: WeekPlan[]
  settings?: Partial<SettingsState>
  progress?: ProgressState
  generatedAt?: string
  planId?: string
  planName?: string
}

function toTrainingPlanSettings(settings?: Partial<SettingsState>): TrainingPlanSettings {
  return {
    week1Start: settings?.week1Start,
    raceDate: settings?.raceDate,
  }
}

function toPlannedWorkout(workout: Workout, planId: string): PlannedWorkout {
  return {
    id: workout.id,
    planId,
    week: workout.week,
    day: workout.day,
    dayName: workout.dayName,
    name: workout.name,
    type: workout.type,
    duration: workout.duration,
    miles: workout.miles,
    zone: workout.zone,
    targetBpm: workout.targetBpm,
    targetPace: workout.targetPace,
    steps: [...workout.steps],
    notes: workout.notes,
  }
}

function toPlannedWorkoutWeek(week: WeekPlan, planId: string): PlannedWorkoutWeek {
  return {
    week: week.week,
    phase: week.phase,
    label: week.label,
    days: week.days.map((workout) => toPlannedWorkout(workout, planId)),
  }
}

export function createTrainingPlanDefinition(
  weeks: WeekPlan[],
  planId: string = TRAINING_PLAN_EXPORT_ID,
  planName: string = TRAINING_PLAN_EXPORT_NAME,
): TrainingPlanDefinition {
  return {
    id: planId,
    name: planName,
    sourceApp: 'Half_Ass_Training',
    weeks: weeks.map((week) => toPlannedWorkoutWeek(week, planId)),
  }
}

export function mapProgressToPlannedWorkoutProgress(progress?: ProgressState): PlannedWorkoutProgress[] | undefined {
  if (!progress) return undefined

  const rows = Object.entries(progress.workouts ?? {})
    .filter(([, value]) => effectiveWorkoutStatus(value) || value.note || (value.flags?.length ?? 0) > 0)
    .map(([plannedWorkoutId, value]) => ({
      plannedWorkoutId,
      status: effectiveWorkoutStatus(value),
      note: value.note,
      flags: value.flags ? [...value.flags] : undefined,
      updatedAt: value.updatedAt ?? '',
    }))

  return rows.length > 0 ? rows : undefined
}

export function createTrainingPlanExport({
  weeks,
  settings,
  progress,
  generatedAt = new Date().toISOString(),
  planId = TRAINING_PLAN_EXPORT_ID,
  planName = TRAINING_PLAN_EXPORT_NAME,
}: TrainingPlanExportInput): TrainingPlanExportV1 {
  return {
    exportVersion: 1,
    generatedAt,
    sourceApp: 'Half_Ass_Training',
    plan: createTrainingPlanDefinition(weeks, planId, planName),
    settings: toTrainingPlanSettings(settings),
    progress: mapProgressToPlannedWorkoutProgress(progress),
  }
}
