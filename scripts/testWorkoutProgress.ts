import assert from 'node:assert/strict'
import type { WorkoutProgress } from '../src/hooks/useProgress'
import { effectiveWorkoutStatus, hasVisibleWorkoutProgress, isMeaningfullyModified } from '../src/lib/workoutProgress'

const oldNoopModified: WorkoutProgress = {
  status: 'modified',
  updatedAt: '2026-05-11T12:00:00.000Z',
}

const realModified: WorkoutProgress = {
  status: 'modified',
  modification: {
    savedAt: '2026-05-11T12:00:00.000Z',
    summary: 'Shortened to 25 minutes easy because of heat.',
  },
  updatedAt: '2026-05-11T12:00:00.000Z',
}

const completedWithModificationMetadata: WorkoutProgress = {
  status: 'completed',
  modification: {
    savedAt: '2026-05-11T12:00:00.000Z',
    summary: 'Swapped warmup order.',
  },
}

assert.equal(isMeaningfullyModified(oldNoopModified), false)
assert.equal(effectiveWorkoutStatus(oldNoopModified), undefined)
assert.equal(hasVisibleWorkoutProgress(oldNoopModified), false)

assert.equal(isMeaningfullyModified(realModified), true)
assert.equal(effectiveWorkoutStatus(realModified), 'modified')
assert.equal(hasVisibleWorkoutProgress(realModified), true)

assert.equal(effectiveWorkoutStatus({ status: 'completed' }), 'completed')
assert.equal(effectiveWorkoutStatus(completedWithModificationMetadata), 'completed')
assert.equal(effectiveWorkoutStatus({ status: 'skipped' }), 'skipped')
assert.equal(hasVisibleWorkoutProgress({ note: 'Felt good.' }), true)

console.log('Workout progress status tests passed.')
