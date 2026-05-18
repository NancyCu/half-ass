import type { WeekPlan, Workout } from '../data/trainingPlan'
import { addDays, daysBetween, formatFriendlyDate, parseISODate, toISODate } from '../utils/dates'
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
  saferDateSuggestions?: SaferDateSuggestion[]
}

export type MissedWorkoutRecommendation = {
  severity: ScheduleGuardrailSeverity
  recommendation: string
  warnings: string[]
}

export type SaferDateSuggestion = {
  date: string
  label: string
  reason: string
  action: 'move' | 'swap'
  severity: Exclude<ScheduleGuardrailSeverity, 'blocked'>
}

export type SmartScheduleRecommendation = {
  severity: ScheduleGuardrailSeverity
  title: string
  summary: string
  recommendation: string
  warnings: string[]
  missedDays: number
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

function formatSuggestionLabel(isoDate: string): string {
  return formatFriendlyDate(parseISODate(isoDate))
}

function recommendationForSafeAdjustment(plan: WeekPlan[], candidateAdjustments: ScheduleAdjustment[]): string {
  if (candidateAdjustments.every((adjustment) => adjustment.action === 'cross_train')) {
    return 'Safe: cross-training keeps the workout structure without forcing impact.'
  }

  const primaryWorkout = getWorkoutById(plan, candidateAdjustments[0]?.workoutId ?? '')
  const primaryIntensity = classifyWorkoutIntensity(primaryWorkout)
  const hasSwap = candidateAdjustments.some((adjustment) => adjustment.action === 'swapped')
  if (hasSwap) return 'Safe: this keeps hard/easy spacing intact.'
  if (primaryIntensity === 'easy' || primaryIntensity === 'rest') return 'Safe: easy workout move looks okay.'
  return 'Safe: this keeps hard/easy spacing intact.'
}

function recommendationForCaution(warnings: string[]): string {
  if (warnings.some((warning) => /sore|injury|cross-training or rest/i.test(warning))) {
    return 'Caution: do this only if your legs feel normal. Otherwise rest or cross-train.'
  }
  if (warnings.some((warning) => /hard\/easy rhythm/i.test(warning))) {
    return 'Caution: move is possible, but keep the next run easy.'
  }
  return 'Caution: do this only if your legs feel normal.'
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
    return result(false, ['Blocked: this would cram multiple workouts into one day.'], 'Try a rest or open day instead, or use swap if that date already has a run.')
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
      return result(false, ['Blocked: this would make the week too loaded.'], 'Keep the week simpler instead of trying to catch up all the missed stress.')
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
      return result(false, ['Blocked: this would put two hard workouts back-to-back.'], 'Choose a date with an easy, rest, or cross-training day between hard workouts.')
    }

    if (intensity === 'long_run' && (previousIntensity === 'quality' || nextIntensity === 'quality')) {
      return result(false, ['Blocked: this would put a long run too close to a quality workout.'], 'Choose a date with an easier day between the long run and quality stress.')
    }
  }

  const sorenessAdjustment = candidateAdjustments.find((adjustment) => sorenessDescriptors.test(adjustment.reason ?? ''))
  if (sorenessAdjustment && sorenessAdjustment.action !== 'cross_train' && sorenessAdjustment.action !== 'skipped') {
    warnings.push('Caution: sore or minor injury days are usually better handled with cross-training or rest.')
    return result(true, warnings, recommendationForCaution(warnings))
  }

  if (candidateAdjustments.every((adjustment) => adjustment.action === 'cross_train')) {
    return result(true, warnings, recommendationForSafeAdjustment(plan, candidateAdjustments))
  }

  const rhythmShift = candidateAdjustments.some((adjustment) => {
    if (adjustment.action !== 'moved' && adjustment.action !== 'swapped') return false
    if (sameDate(adjustment.originalDate, adjustment.assignedDate)) return false
    const movedWorkout = getWorkoutById(plan, adjustment.workoutId)
    const movedIntensity = classifyWorkoutIntensity(movedWorkout)
    return movedIntensity === 'quality' || movedIntensity === 'long_run'
  })
  if (rhythmShift) {
    warnings.push('Caution: this changes your hard/easy rhythm.')
  }

  const recommendation = warnings.length > 0
    ? recommendationForCaution(warnings)
    : recommendationForSafeAdjustment(plan, candidateAdjustments)
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
  const evaluation = evaluateScheduleAdjustmentsBatch(plan, [first, second], existingAdjustments, week1StartISO)
  if (evaluation.allowed) return evaluation
  return {
    ...evaluation,
    saferDateSuggestions: getSaferDateSuggestions(plan, first, existingAdjustments, week1StartISO),
  }
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
    const blocked = result(false, ['Blocked: this would cram multiple workouts into one day.'], 'Use the swap option or choose an open day instead.')
    return {
      ...blocked,
      saferDateSuggestions: getSaferDateSuggestions(plan, adjustment, active, week1StartISO),
    }
  }

  const evaluation = evaluateScheduleAdjustmentsBatch(plan, [adjustment], active, week1StartISO)
  if (evaluation.allowed) return evaluation
  return {
    ...evaluation,
    saferDateSuggestions: getSaferDateSuggestions(plan, adjustment, active, week1StartISO),
  }
}

export function getMissedWorkoutRecommendation(missedDays: number, reason?: string): MissedWorkoutRecommendation {
  if (sorenessDescriptors.test(reason ?? '')) {
    return {
      severity: 'caution',
      recommendation: 'Sore or minor injury: choose rest or low-impact cross-training instead of forcing a catch-up run.',
      warnings: [
        'Use this for soreness or minor injury.',
        'Bike or elliptical are usually the best non-impact aerobic replacement.',
      ],
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
      recommendation: 'Missed 1-3 days: skip and continue today unless one easy move is clearly safe.',
      warnings: ['Do not cram missed volume into a tight window.'],
    }
  }

  if (missedDays <= 6) {
    return {
      severity: 'caution',
      recommendation: 'Missed 4-6 days: reduce volume or repeat the current week instead of trying to catch up everything.',
      warnings: ['Avoid stacking missed workouts just to hit the planned weekly volume.'],
    }
  }

  return {
    severity: 'caution',
    recommendation: 'Missed 7+ days: repeating the previous or current week is safer than cramming missed workouts.',
    warnings: ['A full week or more was missed, so restarting the rhythm is safer than catching up.'],
  }
}

export function getSaferDateSuggestions(
  plan: WeekPlan[],
  adjustment: ScheduleAdjustment,
  existingAdjustments: ScheduleAdjustment[] | ScheduleAdjustmentState = [],
  week1StartISO = '2026-05-11',
  limit = 3,
): SaferDateSuggestion[] {
  const active = getActiveScheduleAdjustments(existingAdjustments).filter((entry) => entry.id !== adjustment.id)
  const workout = getWorkoutById(plan, adjustment.workoutId)
  if (!workout) return []

  const center = parseISODate(adjustment.assignedDate)
  const offsets = [1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6, 7, -7]
  const suggestions: Array<SaferDateSuggestion & { rank: number }> = []

  for (const offset of offsets) {
    const candidateDate = toISODate(addDays(center, offset))
    if (candidateDate === adjustment.assignedDate || candidateDate === adjustment.originalDate) continue
    if (suggestions.some((entry) => entry.date === candidateDate)) continue

    const targetWorkout = getSwapTargetWorkout(plan, candidateDate, active, week1StartISO)
    if (targetWorkout && targetWorkout.id === workout.id) continue

    if (targetWorkout) {
      const targetResolved = resolveAdjustedWorkoutForDate(plan, candidateDate, active, week1StartISO)
      const swapGroupId = `suggested-swap-${adjustment.workoutId}-${candidateDate}`
      const selectedSwap = {
        ...adjustment,
        assignedDate: candidateDate,
        action: 'swapped' as const,
        swapGroupId,
        swapWithWorkoutId: targetWorkout.id,
      }
      const targetSwap: ScheduleAdjustment = {
        id: `${swapGroupId}-${targetWorkout.id}`,
        planId: adjustment.planId,
        profileId: adjustment.profileId,
        workoutId: targetWorkout.id,
        originalDate: targetResolved.originalDate ?? candidateDate,
        assignedDate: adjustment.originalDate,
        action: 'swapped',
        status: 'active',
        reason: adjustment.reason,
        createdAt: adjustment.createdAt,
        updatedAt: adjustment.updatedAt,
        source: 'system',
        guardrailWarnings: [],
        swapWithWorkoutId: workout.id,
        swapGroupId,
      }
      const swapEvaluation = evaluateScheduleAdjustmentsBatch(plan, [selectedSwap, targetSwap], active, week1StartISO)
      if (!swapEvaluation.allowed) continue
      const targetIntensity = classifyWorkoutIntensity(targetWorkout)
      const rank = targetIntensity === 'easy' ? (swapEvaluation.severity === 'safe' ? 1 : 3) : 5
      suggestions.push({
        date: candidateDate,
        label: formatSuggestionLabel(candidateDate),
        reason: targetIntensity === 'easy' ? 'Easy day swap looks safer here.' : 'This swap passes the current guardrails.',
        action: 'swap',
        severity: swapEvaluation.severity as Exclude<ScheduleGuardrailSeverity, 'blocked'>,
        rank,
      })
      continue
    }

    const movedCandidate = {
      ...adjustment,
      assignedDate: candidateDate,
      action: 'moved' as const,
    }
    const moveEvaluation = evaluateScheduleAdjustmentsBatch(plan, [movedCandidate], active, week1StartISO)
    if (!moveEvaluation.allowed) continue
    suggestions.push({
      date: candidateDate,
      label: formatSuggestionLabel(candidateDate),
      reason: 'Open or rest day keeps the week cleaner.',
      action: 'move',
      severity: moveEvaluation.severity as Exclude<ScheduleGuardrailSeverity, 'blocked'>,
      rank: moveEvaluation.severity === 'safe' ? 0 : 2,
    })
  }

  return suggestions
    .sort((left, right) => left.rank - right.rank || left.date.localeCompare(right.date))
    .slice(0, limit)
    .map((suggestion) => ({
      date: suggestion.date,
      label: suggestion.label,
      reason: suggestion.reason,
      action: suggestion.action,
      severity: suggestion.severity,
    }))
}

export function getSmartScheduleRecommendation(
  _plan: WeekPlan[],
  workout: Workout,
  selectedDate: string,
  existingAdjustments: ScheduleAdjustment[] | ScheduleAdjustmentState = [],
  options: {
    todayISO?: string
    reason?: string
    week1StartISO?: string
  } = {},
): SmartScheduleRecommendation {
  const todayISO = options.todayISO ?? toISODate(new Date())
  const missedDays = Math.max(daysBetween(parseISODate(selectedDate), parseISODate(todayISO)), 0)
  const baseMissedRecommendation = getMissedWorkoutRecommendation(missedDays, options.reason)
  const intensity = classifyWorkoutIntensity(workout)
  const activeCount = getActiveScheduleAdjustments(existingAdjustments).length
  const warnings = [...baseMissedRecommendation.warnings]

  if (activeCount > 0) {
    warnings.push(`You already have ${activeCount} active schedule adjustment${activeCount === 1 ? '' : 's'}, so keep this week simple.`)
  }

  if (intensity === 'quality' && missedDays > 0 && missedDays <= 3 && !sorenessDescriptors.test(options.reason ?? '')) {
    return {
      severity: 'safe',
      title: 'Smart recommendation',
      summary: `Missed ${missedDays} day${missedDays === 1 ? '' : 's'}: safest move is usually skip and continue today.`,
      recommendation: 'Quality workouts are usually not worth cramming back into the week.',
      warnings,
      missedDays,
    }
  }

  if (intensity === 'easy' && missedDays > 0 && missedDays <= 3 && !sorenessDescriptors.test(options.reason ?? '')) {
    warnings.push('If you move anything, move only one easy run and keep the rest of the week normal.')
  }

  if (sorenessDescriptors.test(options.reason ?? '')) {
    warnings.push('Cross-training does not auto-complete the workout.')
    return {
      severity: 'caution',
      title: 'Smart recommendation',
      summary: 'Sore or minor injury: cross-training or rest is safer than forcing the run.',
      recommendation: 'Keep the same duration and zones when possible. Bike or elliptical usually work best.',
      warnings,
      missedDays,
    }
  }

  if (missedDays >= 7) {
    warnings.push('Repeat week is guidance only for now, not an automated schedule action.')
  }

  return {
    severity: baseMissedRecommendation.severity,
    title: 'Smart recommendation',
    summary: baseMissedRecommendation.recommendation,
    recommendation: intensity === 'easy' && missedDays <= 3
      ? 'Easy runs are the only ones worth moving, and only when the target date still looks safe.'
      : baseMissedRecommendation.recommendation,
    warnings,
    missedDays,
  }
}
