import assert from 'node:assert/strict'
import { getTrainingPlanProfile, type Workout } from '../src/data/trainingPlan'
import { getPrePlanWorkoutForDate } from '../src/utils/workouts'

const expectedFoundationRun5Steps = ['5 mins Zone 1', '50 mins Zone 2', '5 mins Zone 1']

function planLoad(workouts: Workout[]) {
  return workouts.reduce((total, workout) => {
    const durationMinutes = Number.parseFloat(workout.duration)
    return total + (workout.miles ?? (Number.isFinite(durationMinutes) ? durationMinutes / 10 : 0))
  }, 0)
}

for (const planId of ['mikey', 'manny'] as const) {
  const profile = getTrainingPlanProfile(planId)
  const foundationRun5Workouts = profile.allWorkouts.filter((workout) => workout.name === 'Foundation Run 5')

  assert.ok(foundationRun5Workouts.length > 0, `${planId} plan should include Foundation Run 5`)
  for (const workout of foundationRun5Workouts) {
    assert.equal(workout.duration, '60 min', `${planId} ${workout.id} should be 60 min`)
    assert.deepEqual(workout.steps, expectedFoundationRun5Steps, `${planId} ${workout.id} should use the 5/50/5 structure`)
  }
}

const mikey = getTrainingPlanProfile('mikey')
const week1 = mikey.trainingPlan[0]
const mondayFoundation = week1.days[0]

assert.equal(mondayFoundation.name, 'Foundation Run 5')
assert.equal(mondayFoundation.duration, '60 min')
assert.deepEqual(mondayFoundation.steps, expectedFoundationRun5Steps)
assert.equal(planLoad(week1.days), 37.8)

const foundationRun6 = mikey.allWorkouts.find((workout) => workout.name === 'Foundation Run 6')
assert.ok(foundationRun6)
assert.equal(foundationRun6.duration, '45 min')
assert.deepEqual(foundationRun6.steps, ['5 mins Zone 1', '35 mins Zone 2', '5 mins Zone 1'])

const prePlanSaturday = getPrePlanWorkoutForDate(new Date('2026-05-09T12:00:00'), mikey.allWorkouts)
const prePlanSunday = getPrePlanWorkoutForDate(new Date('2026-05-10T12:00:00'), mikey.allWorkouts)

assert.equal(prePlanSaturday?.name, 'Foundation Run 5')
assert.equal(prePlanSaturday?.duration, '60 min')
assert.deepEqual(prePlanSaturday?.steps, expectedFoundationRun5Steps)
assert.equal(prePlanSunday?.name, 'Foundation Run 5')
assert.equal(prePlanSunday?.duration, '60 min')
assert.deepEqual(prePlanSunday?.steps, expectedFoundationRun5Steps)

console.log('Training plan data tests passed.')
