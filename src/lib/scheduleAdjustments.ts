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
  swapGroupId?: string
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
    swapGroupId: typeof candidate.swapGroupId === 'string' ? candidate.swapGroupId : undefined,
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

export function addScheduleAdjustments(
  planId: string,
  adjustments: ScheduleAdjustment[],
  storage: ScheduleAdjustmentStorage | null = getDefaultStorage(),
): ScheduleAdjustmentState {
  const current = readScheduleAdjustments(planId, storage)
  return writeScheduleAdjustments(planId, [...current.adjustments, ...adjustments], storage)
}

export function undoScheduleAdjustment(
  planId: string,
  adjustmentId: string,
  storage: ScheduleAdjustmentStorage | null = getDefaultStorage(),
): ScheduleAdjustmentState {
  const current = readScheduleAdjustments(planId, storage)
  const now = new Date().toISOString()
  const selected = current.adjustments.find((adjustment) => adjustment.id === adjustmentId)
  const swapGroupId = selected?.swapGroupId
  return writeScheduleAdjustments(
    planId,
    current.adjustments.map((adjustment) => (
      adjustment.id === adjustmentId || (swapGroupId && adjustment.swapGroupId === swapGroupId)
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
  const newestActive = [...active].reverse()
  const baseDateByWorkoutId = getBaseDateByWorkoutId(basePlan, week1StartISO)
  const baseWorkoutByDate = getBaseWorkoutByDate(basePlan, week1StartISO)
  const movedAway = newestActive.find((adjustment) => (
    adjustment.action !== 'restored'
    && !sameDate(adjustment.originalDate, adjustment.assignedDate)
    && sameDate(adjustment.originalDate, targetDate)
  ))
  const assignedAdjustment = newestActive.find((adjustment) => sameDate(adjustment.assignedDate, targetDate))

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

function unique<T>(values: T[]): T[] {
  return [...new Set(values)]
}

function findAssignedWorkoutIdForDate(
  plan: WeekPlan[],
  targetDate: string,
  adjustments: ScheduleAdjustment[],
  week1StartISO: string,
): string | null {
  const workout = resolveAdjustedWorkoutForDate(plan, targetDate, adjustments, week1StartISO).workout
  return workout && workout.type !== 'rest' ? workout.id : null
}

function countAssignmentsByDate(adjustments: ScheduleAdjustment[]): Map<string, number> {
  const counts = new Map<string, number>()
  adjustments.forEach((adjustment) => {
    if (adjustment.action === 'skipped' || adjustment.action === 'missed') return
    counts.set(adjustment.assignedDate, (counts.get(adjustment.assignedDate) ?? 0) + 1)
  })
  return counts
}

function evaluateScheduleAdjustmentsBatch(
  plan: WeekPlan[],
  candidateAdjustments: ScheduleAdjustment[],
  existingAdjustments: ScheduleAdjustment[] | ScheduleAdjustmentState = [],
  week1StartISO = '2026-05-11',
): ScheduleGuardrailResult {
  const warnings: string[] = []
  const active = getActiveScheduleAdjustments(existingAdjustments).filter((entry) => !candidateAdjustments.some((candidate) => candidate.id === entry.id))
  const nextAdjustments = [...active, ...candidateAdjustments]
  const assignmentCounts = countAssignmentsByDate(nextAdjustments)
  const duplicateDate = [...assignmentCounts.entries()].find(([, count]) => count > 1)?.[0]
  if (duplicateDate) {
    return result(false, ['Do not cram multiple workouts into the same day.'], 'Swap workouts or choose an open day instead of doubling up.')
  }

  const affectedDates = unique(candidateAdjustments.flatMap((adjustment) => [adjustment.originalDate, adjustment.assignedDate]))
  const affectedWeeks = unique(affectedDates.map((date) => {
    const parsed = parseISODate(date)
    return toISODate(addDays(parsed, -((parsed.getDay() + 6) % 7)))
  }))

  for (const weekStart of affectedWeeks) {
    const weekSchedule = getAdjustedWeekSchedule(plan, weekStart, 7, nextAdjustments, week1StartISO)
    const qualityCount = weekSchedule.filter((entry) => classifyWorkoutIntensity(entry.workout, entry.adjustment) === 'quality').length
    if (qualityCount > 3) {
      warnings.push('This week has more hard workouts than the guardrail recommends.')
      break
    }
  }

  const datesToInspect = unique(candidateAdjustments.map((adjustment) => adjustment.assignedDate))
  for (const assignedDate of datesToInspect) {
    const resolved = resolveAdjustedWorkoutForDate(plan, assignedDate, nextAdjustments, week1StartISO)
    const workout = resolved.workout
    if (!workout || resolved.isSkipped) continue
    const intensity = classifyWorkoutIntensity(workout, resolved.adjustment)
    const parsedDate = parseISODate(assignedDate)
    const previous = resolveAdjustedWorkoutForDate(plan, toISODate(addDays(parsedDate, -1)), nextAdjustments, week1StartISO)
    const next = resolveAdjustedWorkoutForDate(plan, toISODate(addDays(parsedDate, 1)), nextAdjustments, week1StartISO)
    const previousIntensity = classifyWorkoutIntensity(previous.workout, previous.adjustment)
    const nextIntensity = classifyWorkoutIntensity(next.workout, next.adjustment)

    if (intensity === 'quality' && (previousIntensity === 'quality' || nextIntensity === 'quality')) {
      return result(false, ['This swap would put two hard workouts back-to-back.'], 'Keep at least one easy, rest, or cross-training day between quality workouts.')
    }

    if (intensity === 'long_run' && (previousIntensity === 'quality' || nextIntensity === 'quality')) {
      return result(false, ['This places a long run too close to a quality workout.'], 'Keep at least one easier day between long-run and quality stress.')
    }
  }

  const sorenessAdjustment = candidateAdjustments.find((adjustment) => sorenessDescriptors.test(adjustment.reason ?? ''))
  if (sorenessAdjustment && sorenessAdjustment.action !== 'cross_train' && sorenessAdjustment.action !== 'skipped') {
    warnings.push('Cross-training or rest is recommended when soreness or minor injury is the reason.')
    return result(true, warnings, 'Prefer cross-training or rest instead of forcing a catch-up run.')
  }

  if (candidateAdjustments.every((adjustment) => adjustment.action === 'cross_train')) {
    return result(true, warnings, 'Preserve the same time, structure, and zones with non-impact aerobic work.')
  }

  const hasSwap = candidateAdjustments.some((adjustment) => adjustment.action === 'swapped')
  const recommendation = warnings.length > 0
    ? 'Proceed with caution and keep the rest of the week easy.'
    : hasSwap
      ? 'Swap keeps the current schedule guardrails intact.'
      : 'Adjustment passes the current schedule guardrails.'
  return result(true, warnings, recommendation)
}

export function getSwapTargetWorkout(
  plan: WeekPlan[],
  targetDate: string,
  adjustments: ScheduleAdjustment[] | ScheduleAdjustmentState = [],
  week1StartISO = '2026-05-11',
): Workout | null {
  const resolved = resolveAdjustedWorkoutForDate(plan, targetDate, adjustments, week1StartISO)
  return resolved.workout?.type === 'rest' ? null : resolved.workout
}

export function evaluateScheduleSwap(
  plan: WeekPlan[],
  first: ScheduleAdjustment,
  second: ScheduleAdjustment,
  existingAdjustments: ScheduleAdjustment[] | ScheduleAdjustmentState = [],
  week1StartISO = '2026-05-11',
): ScheduleGuardrailResult {
  return evaluateScheduleAdjustmentsBatch(plan, [first, second], existingAdjustments, week1StartISO)
}

export function evaluateScheduleAdjustment(
  plan: WeekPlan[],
  adjustment: ScheduleAdjustment,
  existingAdjustments: ScheduleAdjustment[] | ScheduleAdjustmentState = [],
  week1StartISO = '2026-05-11',
): ScheduleGuardrailResult {
  const workout = getWorkoutById(plan, adjustment.workoutId)
  if (!workout) return result(false, ['Workout could not be found in the base plan.'], 'Block this adjustment until the plan reference is fixed.')
  const active = getActiveScheduleAdjustments(existingAdjustments).filter((entry) => entry.id !== adjustment.id)
  const currentAssignedWorkoutId = findAssignedWorkoutIdForDate(plan, adjustment.assignedDate, active, week1StartISO)
  if (
    adjustment.action === 'moved'
    && currentAssignedWorkoutId
    && currentAssignedWorkoutId !== workout.id
  ) {
    return result(false, ['Target date is already occupied. Swap workouts instead of cramming two onto one day.'], 'Use the swap flow or choose an open day.')
  }

  return evaluateScheduleAdjustmentsBatch(plan, [adjustment], active, week1StartISO)
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
