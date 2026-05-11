import assert from 'node:assert/strict'
import { getTrainingPlanProfile } from '../src/data/trainingPlan'
import {
  readAppliedStrideSyncHandoffs,
  readStrideSyncHandoffHistory,
  readStrideSyncHandoffFromSearch,
  recordStrideSyncHandoffHistory,
  rememberAppliedStrideSyncHandoff,
  STRIDESYNC_HANDOFF_APPLIED_STORAGE_KEY,
  STRIDESYNC_HANDOFF_HISTORY_STORAGE_KEY,
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
const freshMatchedAt = new Date(Date.now() - (60 * 60 * 1000)).toISOString()
const staleMatchedAt = new Date(Date.now() - (25 * 60 * 60 * 1000)).toISOString()

function makeSearch(overrides: Record<string, string> = {}) {
  return new URLSearchParams({
    source: 'stridesync',
    action: 'completeWorkout',
    handoffVersion: '2',
    handoffId: 'handoff-1',
    date: '2026-05-11',
    workoutId: 'w1-d1',
    workoutName: 'Foundation Run 5',
    runName: 'Morning Run',
    runDistance: '5.02',
    runDuration: '57',
    runSource: 'strava',
    confidence: '86',
    matchStatus: 'likely_match',
    matchedAt: freshMatchedAt,
    autoCompleted: 'true',
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
  const storage = new MemoryStorage()
  const handoff = read(makeSearch({ handoffId: 'handoff-1' }))
  recordStrideSyncHandoffHistory(storage, handoff, {
    acceptedAt: '2026-05-11T12:00:00.000Z',
    mode: 'auto_accept',
    status: 'applied',
  })
  const history = readStrideSyncHandoffHistory(storage)
  assert.equal(history.entries.length, 1)
  assert.equal(history.entries[0].handoffId, 'handoff-1')
  assert.equal(history.entries[0].mode, 'auto_accept')
  assert.equal(history.entries[0].status, 'applied')
  assert.equal(history.entries[0].runName, 'Morning Run')
  assert.equal(history.entries[0].runDistance, '5.02')
  assert.ok(storage.getItem(STRIDESYNC_HANDOFF_HISTORY_STORAGE_KEY))
  assert.equal(storage.getItem(STRIDESYNC_HANDOFF_APPLIED_STORAGE_KEY), null)
}

{
  const storage = new MemoryStorage()
  const handoff = read(makeSearch({ handoffId: 'handoff-manual' }))
  recordStrideSyncHandoffHistory(storage, handoff, {
    acceptedAt: '2026-05-11T12:00:00.000Z',
    mode: 'manual_confirm',
    status: 'applied',
  })
  const [entry] = readStrideSyncHandoffHistory(storage).entries
  assert.equal(entry.mode, 'manual_confirm')
  assert.equal(entry.status, 'applied')
}

{
  const storage = new MemoryStorage()
  const handoff = read(makeSearch({ handoffId: 'handoff-dismissed' }))
  recordStrideSyncHandoffHistory(storage, handoff, {
    acceptedAt: '2026-05-11T12:00:00.000Z',
    mode: 'manual_confirm',
    status: 'dismissed',
  })
  const [entry] = readStrideSyncHandoffHistory(storage).entries
  assert.equal(entry.status, 'dismissed')
}

{
  const storage = new MemoryStorage()
  const handoff = read(makeSearch({ handoffId: 'handoff-rejected', runDistance: '' }))
  recordStrideSyncHandoffHistory(storage, handoff, {
    acceptedAt: '2026-05-11T12:00:00.000Z',
    mode: 'manual_confirm',
    reason: 'Auto-accept blocked: missing required run data',
    status: 'rejected',
  })
  const [entry] = readStrideSyncHandoffHistory(storage).entries
  assert.equal(entry.status, 'rejected')
  assert.equal(entry.reason, 'Auto-accept blocked: missing required run data')
}

{
  const storage = new MemoryStorage()
  const handoff = read(makeSearch({ handoffId: 'handoff-duplicate' }))
  recordStrideSyncHandoffHistory(storage, handoff, {
    acceptedAt: '2026-05-11T12:00:00.000Z',
    mode: 'auto_accept',
    reason: 'Already applied from StrideSync.',
    status: 'duplicate',
  })
  recordStrideSyncHandoffHistory(storage, handoff, {
    acceptedAt: '2026-05-11T12:05:00.000Z',
    mode: 'auto_accept',
    reason: 'Already applied from StrideSync.',
    status: 'duplicate',
  })
  const history = readStrideSyncHandoffHistory(storage)
  assert.equal(history.entries.length, 1)
  assert.equal(history.entries[0].acceptedAt, '2026-05-11T12:00:00.000Z')
  assert.equal(history.entries[0].status, 'duplicate')
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
  assert.equal(result.reason, 'Auto-accept blocked: wrong matchStatus')
}

{
  const result = validate(makeSearch({ confidence: 'not-a-number' }))
  assert.equal(result.status, 'blocked')
  assert.equal(result.reason, 'Auto-accept blocked: low confidence')
}

{
  const result = validate(makeSearch({ confidence: '79' }))
  assert.equal(result.status, 'blocked')
  assert.equal(result.reason, 'Auto-accept blocked: low confidence')
}

{
  const result = validate(makeSearch({ handoffId: '' }))
  assert.equal(result.status, 'blocked')
  assert.equal(result.reason, 'Auto-accept blocked: missing handoffId')
}

{
  const result = validate(makeSearch({ matchedAt: staleMatchedAt }))
  assert.equal(result.status, 'blocked')
  assert.equal(result.reason, 'Auto-accept blocked: stale matchedAt')
}

{
  const handoff = read(makeSearch({ autoCompleted: 'false' }))
  assert.equal(handoff.autoCompleted, 'false')
  const result = validate(makeSearch({ autoCompleted: 'false' }))
  assert.equal(result.status, 'accepted')
}

{
  const handoff = read(makeSearch({ autoCompleted: 'true' }))
  assert.equal(handoff.autoCompleted, 'true')
  const result = validate(makeSearch({ autoCompleted: 'true' }))
  assert.equal(result.status, 'accepted')
}

{
  const result = validate(makeSearch({
    date: '2026-05-09',
    workoutId: 'preplan-foundation-run-5',
    workoutName: 'Foundation Run 5',
  }))
  assert.equal(result.status, 'accepted')
}

{
  const result = validate(new URLSearchParams({
    source: 'stridesync',
    action: 'completeWorkout',
    date: '2026-05-11',
    workoutId: 'w1-d1',
    workoutName: 'Foundation Run 5',
    runName: 'Morning Run',
    runDistance: '5.02',
    runDuration: '57',
    runSource: 'strava',
  }).toString())
  assert.equal(result.status, 'blocked')
  assert.equal(result.reason, 'Auto-accept blocked: handoffVersion=2 required')
}

console.log('StrideSync handoff validation tests passed.')
