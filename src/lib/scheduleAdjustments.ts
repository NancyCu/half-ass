import type { WeekPlan, Workout } from '../data/trainingPlan'
import { addDays, parseISODate, toISODate } from '../utils/dates'
import { workoutDate } from '../utils/workouts'

export const SCHEDULE_ADJUSTMENT_STORAGE_PREFIX = 'half_ass_schedule_adjustments_v1'

export type ScheduleAdjustmentAction =
  | 'skipped'
  | 'moved'
  | 'swapped'
  | 'cross_train'
  | 'repeat_week'
  | 'missed'
  | 'restored'

export type ScheduleAdjustmentStatus = 'active' | 'undone'
export type ScheduleAdjustmentSource = 'user' | 'guardrail' | 'system'
export type ScheduleGuardrailSeverity = 'safe' | 'caution' | 'blocked'
export type WorkoutIntensityClass = 'easy' | 'long_run' | 'quality' | 'rest' | 'cross_train'
export type CrossTrainingType = 'cycling' | 'elliptical' | 'pool_running' | 'walking' | 'other'

export type ScheduleAdjustment = {
  id: string
  planId: string
  profileId?: string
  workoutId: string
  originalDate: string
  assignedDate: string
  action: ScheduleAdjustmentAction
  status: ScheduleAdjustmentStatus
  reason?: string
  createdAt: string
  updatedAt: string
  source: ScheduleAdjustmentSource
  guardrailWarnings: string[]
  crossTrainingType?: CrossTrainingType
  replacedWorkoutId?: string
  swapWithWorkoutId?: string
}

export type ScheduleAdjustmentState = {
  schemaVersion: 1
  planId: string
  updatedAt: string
  adjustments: ScheduleAdjustment[]
}

export type ResolvedAdjustedWorkout = {
  date: string
  workout: Workout | null
  originalWorkout: Workout | null
  originalDate: string | null
  assignedDate: string
  adjustment: ScheduleAdjustment | null
  isAdjusted: boolean
  isSkipped: boolean
  isCrossTraining: boolean
  crossTrainingType?: CrossTrainingType
}

export type ScheduleGuardrailResult = {
  allowed: boolean
  severity: ScheduleGuardrailSeverity
  warnings: string[]
  recommendation: string
}

export type MissedWorkoutRecommendation = {
  severity: ScheduleGuardrailSeverity
  recommendation: string
  warnings: string[]
}

type ScheduleAdjustmentStorage = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const qualityDescriptors = /(fast[-\s]?finish|tempo|interval|threshold|speed|hill|cruise|quality|race)/i
const sorenessDescriptors = /(sore|soreness|injury|hurt|pain|hip|ankle|tired|fatigue|minor)/i

function getDefaultStorage(): ScheduleAdjustmentStorage | null {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

function emptyScheduleAdjustmentState(planId: string): ScheduleAdjustmentState {
  return {
    schemaVersion: 1,
    planId,
    updatedAt: new Date(0).toISOString(),
    adjustments: [],
  }
}

function sanitizeAdjustment(value: unknown, planId: string): ScheduleAdjustment | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<ScheduleAdjustment>
  const action = candidate.action
  const status = candidate.status
  const source = candidate.source
  if (
    action !== 'skipped'
    && action !== 'moved'
    && action !== 'swapped'
    && action !== 'cross_train'
    && action !== 'repeat_week'
    && action !== 'missed'
    && action !== 'restored'
  ) return null
  if (status !== 'active' && status !== 'undone') return null
  if (source !== 'user' && source !== 'guardrail' && source !== 'system') return null
  if (
    typeof candidate.id !== 'string'
    || typeof candidate.workoutId !== 'string'
    || typeof candidate.originalDate !== 'string'
    || typeof candidate.assignedDate !== 'string'
    || typeof candidate.createdAt !== 'string'
    || typeof candidate.updatedAt !== 'string'
  ) return null

  return {
    id: candidate.id,
    planId: typeof candidate.planId === 'string' && candidate.planId.trim() ? candidate.planId : planId,
    profileId: typeof candidate.profileId === 'string' ? candidate.profileId : undefined,
    workoutId: candidate.workoutId,
    originalDate: candidate.originalDate,
    assignedDate: candidate.assignedDate,
    action,
    status,
    reason: typeof candidate.reason === 'string' ? candidate.reason : undefined,
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt,
    source,
    guardrailWarnings: Array.isArray(candidate.guardrailWarnings)
      ? candidate.guardrailWarnings.filter((warning): warning is string => typeof warning === 'string')
      : [],
    crossTrainingType: sanitizeCrossTrainingType(candidate.crossTrainingType),
    replacedWorkoutId: typeof candidate.replacedWorkoutId === 'string' ? candidate.replacedWorkoutId : undefined,
    swapWithWorkoutId: typeof candidate.swapWithWorkoutId === 'string' ? candidate.swapWithWorkoutId : undefined,
  }
}

function sanitizeCrossTrainingType(value: unknown): CrossTrainingType | undefined {
  return value === 'cycling'
    || value === 'elliptical'
    || value === 'pool_running'
    || value === 'walking'
    || value === 'other'
    ? value
    : undefined
}

function sanitizeScheduleAdjustmentState(value: unknown, planId: string): ScheduleAdjustmentState {
  if (!value || typeof value !== 'object') return emptyScheduleAdjustmentState(planId)
  const candidate = value as Partial<ScheduleAdjustmentState>
  const rawAdjustments = Array.isArray(candidate.adjustments) ? candidate.adjustments : []
  const adjustments = rawAdjustments
    .map((entry) => sanitizeAdjustment(entry, planId))
    .filter((entry): entry is ScheduleAdjustment => Boolean(entry))

  return {
    schemaVersion: 1,
    planId,
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : new Date(0).toISOString(),
    adjustments,
  }
}

function dateKey(date: Date | string): string {
  return typeof date === 'string' ? date : toISODate(date)
}

function allPlanWorkouts(plan: WeekPlan[]): Workout[] {
  return plan.flatMap((week) => week.days)
}

function getWorkoutById(plan: WeekPlan[], workoutId: string): Workout | null {
  return allPlanWorkouts(plan).find((workout) => workout.id === workoutId) ?? null
}

function getBaseDateByWorkoutId(plan: WeekPlan[], week1StartISO: string): Map<string, string> {
  return new Map(allPlanWorkouts(plan).map((workout) => [workout.id, toISODate(workoutDate(workout, week1StartISO))]))
}

function getBaseWorkoutByDate(plan: WeekPlan[], week1StartISO: string): Map<string, Workout> {
  return new Map(allPlanWorkouts(plan).map((workout) => [toISODate(workoutDate(workout, week1StartISO)), workout]))
}

function sameDate(left: string, right: string): boolean {
  return left === right
}

function getSeverity(allowed: boolean, warnings: string[]): ScheduleGuardrailSeverity {
  if (!allowed) return 'blocked'
  return warnings.length > 0 ? 'caution' : 'safe'
}

function result(allowed: boolean, warnings: string[], recommendation: string): ScheduleGuardrailResult {
  return {
    allowed,
    severity: getSeverity(allowed, warnings),
    warnings,
    recommendation,
  }
}

function normalizeDescriptor(workout: Pick<Workout, 'type' | 'name' | 'zone'>): string {
  return `${workout.type} ${workout.name} ${workout.zone}`.toLowerCase()
}

function isQualityWorkout(workout: Workout): boolean {
  return qualityDescriptors.test(normalizeDescriptor(workout))
    || workout.steps.some((step) => /zone\s*[3-5]|\bz[3-5]\b/i.test(step))
}

function isLongWorkout(workout: Workout): boolean {
  return workout.type.includes('long') || /\blong\b/i.test(workout.name)
}

function cloneCrossTrainingWorkout(workout: Workout, adjustment: ScheduleAdjustment): Workout {
  return {
    ...workout,
    notes: `Cross-training substitute${adjustment.crossTrainingType ? ` (${adjustment.crossTrainingType.replace('_', ' ')})` : ''}. ${workout.notes}`,
  }
}

export function getScheduleAdjustmentStorageKey(planId: string): string {
  return `${SCHEDULE_ADJUSTMENT_STORAGE_PREFIX}:${planId}`
}

export function readScheduleAdjustments(
  planId: string,
  storage: ScheduleAdjustmentStorage | null = getDefaultStorage(),
): ScheduleAdjustmentState {
  if (!storage) return emptyScheduleAdjustmentState(planId)
  try {
    return sanitizeScheduleAdjustmentState(JSON.parse(storage.getItem(getScheduleAdjustmentStorageKey(planId)) ?? 'null'), planId)
  } catch {
    return emptyScheduleAdjustmentState(planId)
  }
}

export function writeScheduleAdjustments(
  planId: string,
  adjustments: ScheduleAdjustment[] | ScheduleAdjustmentState,
  storage: ScheduleAdjustmentStorage | null = getDefaultStorage(),
): ScheduleAdjustmentState {
  const now = new Date().toISOString()
  const state: ScheduleAdjustmentState = Array.isArray(adjustments)
    ? { schemaVersion: 1, planId, updatedAt: now, adjustments }
    : { ...adjustments, schemaVersion: 1, planId, updatedAt: adjustments.updatedAt || now }
  if (storage) {
    storage.setItem(getScheduleAdjustmentStorageKey(planId), JSON.stringify(state))
  }
  return state
}

export function addScheduleAdjustment(
  planId: string,
  adjustment: ScheduleAdjustment,
  storage: ScheduleAdjustmentStorage | null = getDefaultStorage(),
): ScheduleAdjustmentState {
  const current = readScheduleAdjustments(planId, storage)
  return writeScheduleAdjustments(planId, [...current.adjustments, adjustment], storage)
}

export function undoScheduleAdjustment(
  planId: string,
  adjustmentId: string,
  storage: ScheduleAdjustmentStorage | null = getDefaultStorage(),
): ScheduleAdjustmentState {
  const current = readScheduleAdjustments(planId, storage)
  const now = new Date().toISOString()
  return writeScheduleAdjustments(
    planId,
    current.adjustments.map((adjustment) => (
      adjustment.id === adjustmentId
        ? { ...adjustment, status: 'undone' as const, updatedAt: now }
        : adjustment
    )),
    storage,
  )
}

export function clearScheduleAdjustments(
  planId: string,
  storage: ScheduleAdjustmentStorage | null = getDefaultStorage(),
): ScheduleAdjustmentState {
  storage?.removeItem(getScheduleAdjustmentStorageKey(planId))
  return emptyScheduleAdjustmentState(planId)
}

export function getActiveScheduleAdjustments(adjustments: ScheduleAdjustment[] | ScheduleAdjustmentState): ScheduleAdjustment[] {
  const entries = Array.isArray(adjustments) ? adjustments : adjustments.adjustments
  return entries.filter((adjustment) => adjustment.status === 'active')
}

export function classifyWorkoutIntensity(workout: Workout | null, adjustment?: Pick<ScheduleAdjustment, 'action'> | null): WorkoutIntensityClass {
  if (!workout) return 'rest'
  if (adjustment?.action === 'cross_train') return 'cross_train'
  if (workout.type === 'rest') return 'rest'
  if (isQualityWorkout(workout)) return 'quality'
  if (isLongWorkout(workout)) return 'long_run'
  return 'easy'
}

export function resolveAdjustedWorkoutForDate(
  basePlan: WeekPlan[],
  date: Date | string,
  adjustments: ScheduleAdjustment[] | ScheduleAdjustmentState,
  week1StartISO = '2026-05-11',
): ResolvedAdjustedWorkout {
  const targetDate = dateKey(date)
  const active = getActiveScheduleAdjustments(adjustments)
  const baseDateByWorkoutId = getBaseDateByWorkoutId(basePlan, week1StartISO)
  const baseWorkoutByDate = getBaseWorkoutByDate(basePlan, week1StartISO)
  const movedAway = active.find((adjustment) => (
    adjustment.action !== 'restored'
    && !sameDate(adjustment.originalDate, adjustment.assignedDate)
    && sameDate(adjustment.originalDate, targetDate)
  ))
  const assignedAdjustment = active.find((adjustment) => sameDate(adjustment.assignedDate, targetDate))

  if (assignedAdjustment) {
    const originalWorkout = getWorkoutById(basePlan, assignedAdjustment.workoutId)
    const workout = originalWorkout && assignedAdjustment.action === 'cross_train'
      ? cloneCrossTrainingWorkout(originalWorkout, assignedAdjustment)
      : originalWorkout
    return {
      date: targetDate,
      workout,
      originalWorkout,
      originalDate: assignedAdjustment.originalDate,
      assignedDate: assignedAdjustment.assignedDate,
      adjustment: assignedAdjustment,
      isAdjusted: true,
      isSkipped: assignedAdjustment.action === 'skipped' || assignedAdjustment.action === 'missed',
      isCrossTraining: assignedAdjustment.action === 'cross_train',
      crossTrainingType: assignedAdjustment.crossTrainingType,
    }
  }

  if (movedAway) {
    return {
      date: targetDate,
      workout: null,
      originalWorkout: getWorkoutById(basePlan, movedAway.workoutId),
      originalDate: movedAway.originalDate,
      assignedDate: targetDate,
      adjustment: movedAway,
      isAdjusted: true,
      isSkipped: false,
      isCrossTraining: false,
    }
  }

  const baseWorkout = baseWorkoutByDate.get(targetDate) ?? null
  return {
    date: targetDate,
    workout: baseWorkout,
    originalWorkout: baseWorkout,
    originalDate: baseWorkout ? baseDateByWorkoutId.get(baseWorkout.id) ?? targetDate : null,
    assignedDate: targetDate,
    adjustment: null,
    isAdjusted: false,
    isSkipped: false,
    isCrossTraining: false,
  }
}

export function getAdjustedWeekSchedule(
  basePlan: WeekPlan[],
  startDate: Date | string,
  days: number,
  adjustments: ScheduleAdjustment[] | ScheduleAdjustmentState,
  week1StartISO = '2026-05-11',
): ResolvedAdjustedWorkout[] {
  const start = typeof startDate === 'string' ? parseISODate(startDate) : startDate
  return Array.from({ length: days }, (_, index) => (
    resolveAdjustedWorkoutForDate(basePlan, addDays(start, index), adjustments, week1StartISO)
  ))
}

export function evaluateScheduleAdjustment(
  plan: WeekPlan[],
  adjustment: ScheduleAdjustment,
  existingAdjustments: ScheduleAdjustment[] | ScheduleAdjustmentState = [],
  week1StartISO = '2026-05-11',
): ScheduleGuardrailResult {
  const warnings: string[] = []
  const active = getActiveScheduleAdjustments(existingAdjustments).filter((entry) => entry.id !== adjustment.id)
  const workout = getWorkoutById(plan, adjustment.workoutId)
  if (!workout) return result(false, ['Workout could not be found in the base plan.'], 'Block this adjustment until the plan reference is fixed.')

  const sameDayAssignments = active.filter((entry) => entry.status === 'active' && sameDate(entry.assignedDate, adjustment.assignedDate))
  if (sameDayAssignments.length > 0 && adjustment.action !== 'swapped') {
    return result(false, ['Do not cram multiple workouts into the same day.'], 'Skip or replace one workout instead of doubling up.')
  }

  const nextAdjustments = [...active, adjustment]
  const weekStart = addDays(parseISODate(adjustment.assignedDate), -((parseISODate(adjustment.assignedDate).getDay() + 6) % 7))
  const weekSchedule = getAdjustedWeekSchedule(plan, weekStart, 7, nextAdjustments, week1StartISO)
  const assignedIndex = weekSchedule.findIndex((entry) => sameDate(entry.assignedDate, adjustment.assignedDate))
  const intensity = classifyWorkoutIntensity(workout, adjustment)
  const previous = assignedIndex > 0 ? weekSchedule[assignedIndex - 1] : null
  const next = assignedIndex >= 0 && assignedIndex < weekSchedule.length - 1 ? weekSchedule[assignedIndex + 1] : null
  const previousIntensity = previous ? classifyWorkoutIntensity(previous.workout, previous.adjustment) : 'rest'
  const nextIntensity = next ? classifyWorkoutIntensity(next.workout, next.adjustment) : 'rest'

  if (intensity === 'quality' && (previousIntensity === 'quality' || nextIntensity === 'quality')) {
    return result(false, ['This move creates hard workouts back-to-back.'], 'Skip this workout or move it away from another quality day.')
  }

  if (intensity === 'long_run' && (previousIntensity === 'quality' || nextIntensity === 'quality')) {
    return result(false, ['This puts a long run too close to a quality session.'], 'Keep at least one easy, rest, or cross-training day between long and quality stress.')
  }

  if (intensity === 'quality') {
    const qualityCount = weekSchedule.filter((entry) => classifyWorkoutIntensity(entry.workout, entry.adjustment) === 'quality').length
    if (qualityCount > 3) {
      warnings.push('This week has more hard workouts than the guardrail recommends.')
    }
  }

  const baseDate = getBaseDateByWorkoutId(plan, week1StartISO).get(workout.id)
  if (baseDate && !sameDate(baseDate, adjustment.assignedDate)) {
    const assignmentsOnTarget = [
      ...active.filter((entry) => sameDate(entry.assignedDate, adjustment.assignedDate)),
      ...allPlanWorkouts(plan)
        .filter((entry) => (
          toISODate(workoutDate(entry, week1StartISO)) === adjustment.assignedDate
          && entry.id !== workout.id
          && entry.type !== 'rest'
        ))
        .map((entry) => ({
          id: `base-${entry.id}`,
          planId: adjustment.planId,
          workoutId: entry.id,
          originalDate: adjustment.assignedDate,
          assignedDate: adjustment.assignedDate,
          action: 'moved' as const,
          status: 'active' as const,
          createdAt: adjustment.createdAt,
          updatedAt: adjustment.updatedAt,
          source: 'system' as const,
          guardrailWarnings: [],
        })),
    ]
    if (assignmentsOnTarget.length > 0 && adjustment.action !== 'swapped') {
      return result(false, ['Do not cram multiple workouts into the same day.'], 'Choose an open day or skip instead of doubling up.')
    }
  }

  if (sorenessDescriptors.test(adjustment.reason ?? '') && adjustment.action !== 'cross_train' && adjustment.action !== 'skipped') {
    warnings.push('Cross-training or rest is recommended when soreness or minor injury is the reason.')
    return result(true, warnings, 'Prefer cross-training or rest instead of forcing a catch-up run.')
  }

  if (adjustment.action === 'cross_train') {
    return result(true, warnings, 'Preserve the same time, structure, and zones with non-impact aerobic work.')
  }

  return result(true, warnings, warnings.length ? 'Proceed with caution and keep the rest of the week easy.' : 'Adjustment passes the current schedule guardrails.')
}

export function getMissedWorkoutRecommendation(missedDays: number, reason?: string): MissedWorkoutRecommendation {
  if (sorenessDescriptors.test(reason ?? '')) {
    return {
      severity: 'caution',
      recommendation: 'Choose rest or a low-impact cross-training substitute instead of forcing a catch-up run.',
      warnings: ['Cross-training is recommended if soreness or minor injury is the reason.'],
    }
  }

  if (missedDays <= 0) {
    return {
      severity: 'safe',
      recommendation: 'Stay on the current plan.',
      warnings: [],
    }
  }

  if (missedDays <= 3) {
    return {
      severity: 'safe',
      recommendation: 'Skip the missed workout and continue from today unless a single easy move is clearly safe.',
      warnings: ['Do not cram missed volume into a tight window.'],
    }
  }

  if (missedDays <= 6) {
    return {
      severity: 'caution',
      recommendation: 'Review the week and consider reducing volume or repeating the current week.',
      warnings: ['Avoid stacking missed workouts just to hit the planned weekly volume.'],
    }
  }

  return {
    severity: 'caution',
    recommendation: 'Repeat the previous or current week safely instead of cramming missed workouts.',
    warnings: ['A full week or more was missed, so restarting the rhythm is safer than catching up.'],
  }
}
