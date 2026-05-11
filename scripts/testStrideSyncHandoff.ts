import assert from 'node:assert/strict'
import { getTrainingPlanProfile } from '../src/data/trainingPlan'
import {
  readAppliedStrideSyncHandoffs,
  readStrideSyncHandoffFromSearch,
  rememberAppliedStrideSyncHandoff,
  STRIDESYNC_HANDOFF_APPLIED_STORAGE_KEY,
  validateStrideSyncAutoAccept,
} from '../src/lib/strideSyncHandoff'

class MemoryStorage implements Storage {
  private values = new Map<string, string>()

  get length() {
    return this.values.size
  }

  clear() {
    this.values.clear()
  }

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null
  }

  removeItem(key: string) {
    this.values.delete(key)
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }
}

const profile = getTrainingPlanProfile('mikey')
const week1Start = '2026-05-11'

function makeSearch(overrides: Record<string, string> = {}) {
  return new URLSearchParams({
    source: 'stridesync',
    action: 'completeWorkout',
    date: '2026-05-11',
    workoutId: 'w1-d1',
    workoutName: 'Foundation Run 5',
    runName: 'Morning Run',
    runDistance: '5.02',
    runDuration: '57',
    runSource: 'strava',
    ...overrides,
  }).toString()
}

function read(search: string) {
  const handoff = readStrideSyncHandoffFromSearch(`?${search}`, profile.allWorkouts, week1Start)
  assert.ok(handoff)
  return handoff
}

function validate(search: string, storage = new MemoryStorage(), currentStatus?: 'completed' | 'skipped' | 'modified') {
  return validateStrideSyncAutoAccept(read(search), {
    appliedState: readAppliedStrideSyncHandoffs(storage),
    currentProgress: currentStatus ? { status: currentStatus } : undefined,
    planId: 'mikey',
    week1Start,
  })
}

{
  const result = validate(makeSearch())
  assert.equal(result.status, 'accepted')
}

{
  const result = validate(makeSearch({ workoutName: '' }))
  assert.equal(result.status, 'accepted')
}

{
  const result = validate(makeSearch({ workoutId: '', workoutName: '' }))
  assert.equal(result.status, 'blocked')
  assert.equal(result.reason, 'Auto-accept blocked: workout mismatch')
}

{
  const result = validate(makeSearch({ runDistance: '' }))
  assert.equal(result.status, 'blocked')
  assert.equal(result.reason, 'Auto-accept blocked: missing required run data')
}

{
  const result = validate(makeSearch({ date: '2026-05-12' }))
  assert.equal(result.status, 'blocked')
  assert.equal(result.reason, 'Auto-accept blocked: workout mismatch')
}

{
  const storage = new MemoryStorage()
  const handoff = read(makeSearch())
  rememberAppliedStrideSyncHandoff(storage, handoff, 'mikey', '2026-05-11T12:00:00.000Z')
  const result = validate(makeSearch(), storage)
  assert.equal(result.status, 'already_applied')
  assert.ok(storage.getItem(STRIDESYNC_HANDOFF_APPLIED_STORAGE_KEY))
}

{
  const result = validate(makeSearch(), new MemoryStorage(), 'completed')
  assert.equal(result.status, 'already_applied')
}

{
  const result = validate(makeSearch({ matchStatus: 'needs_review', confidence: '70' }))
  assert.equal(result.status, 'blocked')
  assert.equal(result.reason, 'Auto-accept blocked: review-level match')
}

{
  const result = validate(makeSearch({ confidence: 'not-a-number' }))
  assert.equal(result.status, 'blocked')
  assert.equal(result.reason, 'Auto-accept blocked: review-level match')
}

{
  const result = validate(makeSearch({
    date: '2026-05-09',
    workoutId: 'preplan-foundation-run-5',
    workoutName: 'Foundation Run 5',
  }))
  assert.equal(result.status, 'accepted')
}

console.log('StrideSync handoff validation tests passed.')
