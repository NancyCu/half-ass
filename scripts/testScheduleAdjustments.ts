import assert from 'node:assert/strict'
import { getTrainingPlanProfile, type WeekPlan, type Workout } from '../src/data/trainingPlan'
import { effectiveWorkoutStatus } from '../src/lib/workoutProgress'
import {
  addScheduleAdjustment,
  classifyWorkoutIntensity,
  clearScheduleAdjustments,
  evaluateScheduleAdjustment,
  getActiveScheduleAdjustments,
  getAdjustedWeekSchedule,
  getMissedWorkoutRecommendation,
  getScheduleAdjustmentStorageKey,
  readScheduleAdjustments,
  resolveAdjustedWorkoutForDate,
  undoScheduleAdjustment,
  writeScheduleAdjustments,
  type ScheduleAdjustment,
} from '../src/lib/scheduleAdjustments'

type MemoryStorage = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function createMemoryStorage(): MemoryStorage {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
}

function adjustment(overrides: Partial<ScheduleAdjustment> & Pick<ScheduleAdjustment, 'id' | 'workoutId' | 'originalDate' | 'assignedDate' | 'action'>): ScheduleAdjustment {
  return {
    planId: 'mikey',
    profileId: 'mikey',
    status: 'active',
    reason: undefined,
    createdAt: '2026-05-18T12:00:00.000Z',
    updatedAt: '2026-05-18T12:00:00.000Z',
    source: 'user',
    guardrailWarnings: [],
    ...overrides,
  }
}

function restFrom(workout: Workout, id = workout.id): Workout {
  return {
    ...workout,
    id,
    name: 'Off',
    duration: '0 min',
    miles: undefined,
    type: 'rest',
    targetBpm: 'Rest',
    targetPace: 'Rest',
    zone: 'Rest',
    steps: ['No scheduled workout'],
    notes: 'Full rest day.',
  }
}

function planWithRestDays(basePlan: WeekPlan[], restWorkoutIds: string[]): WeekPlan[] {
  return basePlan.map((week) => ({
    ...week,
    days: week.days.map((workout) => (restWorkoutIds.includes(workout.id) ? restFrom(workout) : workout)),
  }))
}

const week1Start = '2026-05-11'
const profile = getTrainingPlanProfile('mikey')
const basePlanSnapshot = JSON.stringify(profile.trainingPlan)
const week1 = profile.trainingPlan[0]
const mondayFoundation = week1.days[0]
const tuesdayFastFinish = week1.days[1]
const wednesdayFoundation = week1.days[2]
const fridayInterval = week1.days[4]
const sundayLongRun = week1.days[6]
const storage = createMemoryStorage()

assert.equal(getScheduleAdjustmentStorageKey('mikey'), 'half_ass_schedule_adjustments_v1:mikey')
assert.equal(getScheduleAdjustmentStorageKey('manny'), 'half_ass_schedule_adjustments_v1:manny')
assert.notEqual(getScheduleAdjustmentStorageKey('mikey'), getScheduleAdjustmentStorageKey('manny'))

const skipped = adjustment({
  id: 'skip-fast-finish',
  workoutId: tuesdayFastFinish.id,
  originalDate: '2026-05-12',
  assignedDate: '2026-05-12',
  action: 'skipped',
})
writeScheduleAdjustments('mikey', [skipped], storage)
assert.equal(readScheduleAdjustments('mikey', storage).adjustments.length, 1)
assert.equal(readScheduleAdjustments('manny', storage).adjustments.length, 0)

const skippedResolution = resolveAdjustedWorkoutForDate(profile.trainingPlan, '2026-05-12', [skipped], week1Start)
assert.equal(skippedResolution.workout?.id, tuesdayFastFinish.id)
assert.equal(skippedResolution.isSkipped, true)
assert.equal(skippedResolution.isAdjusted, true)

const moved = adjustment({
  id: 'move-foundation-open-day',
  workoutId: mondayFoundation.id,
  originalDate: '2026-05-11',
  assignedDate: '2026-08-25',
  action: 'moved',
})
const moveOriginal = resolveAdjustedWorkoutForDate(profile.trainingPlan, '2026-05-11', [moved], week1Start)
const moveTarget = resolveAdjustedWorkoutForDate(profile.trainingPlan, '2026-08-25', [moved], week1Start)
assert.equal(moveOriginal.workout, null)
assert.equal(moveOriginal.originalWorkout?.id, mondayFoundation.id)
assert.equal(moveTarget.workout?.id, mondayFoundation.id)
assert.equal(moveTarget.originalDate, '2026-05-11')
assert.equal(moveTarget.assignedDate, '2026-08-25')

const swapMonday = adjustment({
  id: 'swap-monday-to-wednesday',
  workoutId: mondayFoundation.id,
  originalDate: '2026-05-11',
  assignedDate: '2026-05-13',
  action: 'swapped',
  swapWithWorkoutId: wednesdayFoundation.id,
})
const swapWednesday = adjustment({
  id: 'swap-wednesday-to-monday',
  workoutId: wednesdayFoundation.id,
  originalDate: '2026-05-13',
  assignedDate: '2026-05-11',
  action: 'swapped',
  swapWithWorkoutId: mondayFoundation.id,
})
assert.equal(resolveAdjustedWorkoutForDate(profile.trainingPlan, '2026-05-11', [swapMonday, swapWednesday], week1Start).workout?.id, wednesdayFoundation.id)
assert.equal(resolveAdjustedWorkoutForDate(profile.trainingPlan, '2026-05-13', [swapMonday, swapWednesday], week1Start).workout?.id, mondayFoundation.id)

const crossTrain = adjustment({
  id: 'cross-train-foundation',
  workoutId: mondayFoundation.id,
  originalDate: '2026-05-11',
  assignedDate: '2026-05-11',
  action: 'cross_train',
  reason: 'Hip tight',
  crossTrainingType: 'cycling',
})
const crossTrainResolution = resolveAdjustedWorkoutForDate(profile.trainingPlan, '2026-05-11', [crossTrain], week1Start)
assert.equal(crossTrainResolution.isCrossTraining, true)
assert.equal(crossTrainResolution.crossTrainingType, 'cycling')
assert.deepEqual(crossTrainResolution.workout?.steps, mondayFoundation.steps)
assert.equal(crossTrainResolution.workout?.zone, mondayFoundation.zone)
assert.match(crossTrainResolution.workout?.notes ?? '', /Cross-training substitute/)

const undoStorage = createMemoryStorage()
addScheduleAdjustment('mikey', moved, undoStorage)
assert.equal(getActiveScheduleAdjustments(readScheduleAdjustments('mikey', undoStorage)).length, 1)
undoScheduleAdjustment('mikey', moved.id, undoStorage)
assert.equal(getActiveScheduleAdjustments(readScheduleAdjustments('mikey', undoStorage)).length, 0)
assert.equal(resolveAdjustedWorkoutForDate(profile.trainingPlan, '2026-05-11', readScheduleAdjustments('mikey', undoStorage), week1Start).workout?.id, mondayFoundation.id)
clearScheduleAdjustments('mikey', undoStorage)
assert.equal(readScheduleAdjustments('mikey', undoStorage).adjustments.length, 0)

assert.equal(classifyWorkoutIntensity(mondayFoundation), 'easy')
assert.equal(classifyWorkoutIntensity(sundayLongRun), 'long_run')
assert.equal(classifyWorkoutIntensity(fridayInterval), 'quality')
assert.equal(classifyWorkoutIntensity(restFrom(mondayFoundation)), 'rest')
assert.equal(classifyWorkoutIntensity(mondayFoundation, crossTrain), 'cross_train')

const easyMoveResult = evaluateScheduleAdjustment(profile.trainingPlan, moved, [], week1Start)
assert.equal(easyMoveResult.allowed, true)
assert.equal(easyMoveResult.severity, 'safe')

const guardrailPlan = planWithRestDays(profile.trainingPlan, ['w1-d3', 'w1-d6'])
const intervalNextToFastFinish = adjustment({
  id: 'move-interval-next-to-fast-finish',
  workoutId: fridayInterval.id,
  originalDate: '2026-05-15',
  assignedDate: '2026-05-13',
  action: 'moved',
})
const intervalResult = evaluateScheduleAdjustment(guardrailPlan, intervalNextToFastFinish, [], week1Start)
assert.equal(intervalResult.allowed, false)
assert.equal(intervalResult.severity, 'blocked')
assert.match(intervalResult.warnings.join(' '), /hard workouts back-to-back/i)

const fastFinishNextToSpeed = adjustment({
  id: 'move-fast-finish-next-to-speed',
  workoutId: tuesdayFastFinish.id,
  originalDate: '2026-05-12',
  assignedDate: '2026-05-16',
  action: 'moved',
})
const fastFinishResult = evaluateScheduleAdjustment(guardrailPlan, fastFinishNextToSpeed, [], week1Start)
assert.equal(fastFinishResult.allowed, false)
assert.match(fastFinishResult.warnings.join(' '), /hard workouts back-to-back/i)

const longNearQuality = adjustment({
  id: 'move-long-run-next-to-fast-finish',
  workoutId: sundayLongRun.id,
  originalDate: '2026-05-17',
  assignedDate: '2026-05-13',
  action: 'moved',
})
const longRunResult = evaluateScheduleAdjustment(guardrailPlan, longNearQuality, [], week1Start)
assert.equal(longRunResult.allowed, false)
assert.match(longRunResult.warnings.join(' '), /long run too close/i)

const sameDayMove = adjustment({
  id: 'move-second-workout-same-day',
  workoutId: wednesdayFoundation.id,
  originalDate: '2026-05-13',
  assignedDate: '2026-08-25',
  action: 'moved',
})
const sameDayResult = evaluateScheduleAdjustment(profile.trainingPlan, sameDayMove, [moved], week1Start)
assert.equal(sameDayResult.allowed, false)
assert.match(sameDayResult.warnings.join(' '), /multiple workouts into the same day/i)

const sorenessMove = adjustment({
  id: 'soreness-move',
  workoutId: mondayFoundation.id,
  originalDate: '2026-05-11',
  assignedDate: '2026-08-25',
  action: 'moved',
  reason: 'Hip soreness',
})
const sorenessResult = evaluateScheduleAdjustment(profile.trainingPlan, sorenessMove, [], week1Start)
assert.equal(sorenessResult.allowed, true)
assert.equal(sorenessResult.severity, 'caution')
assert.match(sorenessResult.recommendation, /cross-training or rest/i)

assert.match(getMissedWorkoutRecommendation(1).recommendation, /Skip the missed workout and continue from today/i)
assert.match(getMissedWorkoutRecommendation(3).warnings.join(' '), /Do not cram/i)
assert.match(getMissedWorkoutRecommendation(7).recommendation, /Repeat the previous or current week/i)
assert.match(getMissedWorkoutRecommendation(2, 'minor ankle injury').recommendation, /cross-training/i)

const adjustedWeek = getAdjustedWeekSchedule(profile.trainingPlan, '2026-08-25', 2, [moved], week1Start)
assert.equal(adjustedWeek[0].workout?.id, mondayFoundation.id)
assert.equal(adjustedWeek[0].isAdjusted, true)
assert.equal(adjustedWeek[1].workout, null)

assert.equal(JSON.stringify(profile.trainingPlan), basePlanSnapshot, 'schedule adjustments must not mutate the base plan')
assert.equal(effectiveWorkoutStatus({ status: 'completed' }), 'completed', 'progress completion helpers should remain unchanged')
assert.equal(effectiveWorkoutStatus({ status: 'skipped' }), 'skipped', 'progress skip helpers should remain unchanged')

console.log('Schedule adjustment foundation tests passed.')
