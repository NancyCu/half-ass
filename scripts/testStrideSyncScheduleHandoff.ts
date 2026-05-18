import assert from 'node:assert/strict'
import {
  buildScheduleHandoffId,
  buildStrideSyncScheduleHandoffUrl,
  STRIDESYNC_SCHEDULE_ADJUSTMENT_VERSION,
} from '../src/lib/strideSyncScheduleHandoff'

const basePayload = {
  actionType: 'moved' as const,
  adjustmentId: 'move-w1-d1-2026-05-14',
  assignedDate: '2026-05-14',
  createdAt: '2026-05-18T12:00:00.000Z',
  planId: 'mikey',
  profileId: 'mikey',
  originalDate: '2026-05-11',
  reason: 'Busy / life happened',
  updatedAt: '2026-05-18T12:05:00.000Z',
  workoutId: 'w1-d1',
  workoutName: 'Foundation Run 5',
}

{
  const { scheduleHandoffId, url } = buildStrideSyncScheduleHandoffUrl(basePayload, {
    baseUrl: 'https://mikerun.web.app/?trainingTab=1',
  })
  const parsed = new URL(url)

  assert.equal(parsed.searchParams.get('source'), 'halfass')
  assert.equal(parsed.searchParams.get('action'), 'applyScheduleAdjustment')
  assert.equal(parsed.searchParams.get('scheduleAdjustmentVersion'), STRIDESYNC_SCHEDULE_ADJUSTMENT_VERSION)
  assert.equal(parsed.searchParams.get('planId'), 'mikey')
  assert.equal(parsed.searchParams.get('workoutId'), 'w1-d1')
  assert.equal(parsed.searchParams.get('originalDate'), '2026-05-11')
  assert.equal(parsed.searchParams.get('assignedDate'), '2026-05-14')
  assert.equal(parsed.searchParams.get('actionType'), 'moved')
  assert.equal(parsed.searchParams.get('scheduleHandoffId'), scheduleHandoffId)
  assert.equal(parsed.searchParams.get('trainingTab'), '1')
}

{
  const handoffId = buildScheduleHandoffId({
    actionType: 'swapped',
    adjustmentId: 'swap-a',
    assignedDate: '2026-05-14',
    originalDate: '2026-05-11',
    planId: 'mikey',
    swapGroupId: 'swap-group-w1-d1-w1-d4',
    workoutId: 'w1-d1',
  })

  assert.equal(
    handoffId,
    buildScheduleHandoffId({
      actionType: 'swapped',
      adjustmentId: 'swap-a',
      assignedDate: '2026-05-14',
      originalDate: '2026-05-11',
      planId: 'mikey',
      swapGroupId: 'swap-group-w1-d1-w1-d4',
      workoutId: 'w1-d1',
    }),
  )
  assert.match(handoffId, /^sched1-[a-z0-9-]+$/)
}

{
  const { url } = buildStrideSyncScheduleHandoffUrl({
    ...basePayload,
    actionType: 'cross_train',
    crossTrainingType: 'cycling',
  }, {
    baseUrl: 'https://mikerun.web.app/?trainingTab=1',
  })
  const parsed = new URL(url)

  assert.equal(parsed.searchParams.get('actionType'), 'cross_train')
  assert.equal(parsed.searchParams.get('crossTrainingType'), 'cycling')
}

{
  const { url } = buildStrideSyncScheduleHandoffUrl({
    ...basePayload,
    actionType: 'swapped',
    adjustmentId: 'swap-selected',
    swapGroupId: 'swap-group-1',
    pairedWorkoutId: 'w1-d3',
    pairedWorkoutName: 'Foundation Run 5',
    pairedOriginalDate: '2026-05-13',
    pairedAssignedDate: '2026-05-11',
  }, {
    baseUrl: 'https://mikerun.web.app/app-shell',
  })
  const parsed = new URL(url)

  assert.equal(parsed.searchParams.get('swapGroupId'), 'swap-group-1')
  assert.equal(parsed.searchParams.get('pairedWorkoutId'), 'w1-d3')
  assert.equal(parsed.searchParams.get('pairedOriginalDate'), '2026-05-13')
  assert.equal(parsed.searchParams.get('pairedAssignedDate'), '2026-05-11')
  assert.equal(parsed.searchParams.get('trainingTab'), '1')
}

{
  const { url } = buildStrideSyncScheduleHandoffUrl({
    ...basePayload,
    reason: undefined,
  }, {
    baseUrl: 'https://mikerun.web.app/?trainingTab=1',
  })

  assert.ok(!url.includes('undefined'))
  assert.ok(!url.includes('null'))
}

{
  const { url } = buildStrideSyncScheduleHandoffUrl({
    ...basePayload,
    guardrailSeverity: 'caution',
    guardrailWarnings: [
      'Caution: this changes your hard/easy rhythm.',
      'Caution: sore or minor injury days are usually better handled with cross-training or rest.',
    ],
  }, {
    baseUrl: 'https://mikerun.web.app/?foo=bar',
  })
  const parsed = new URL(url)

  assert.equal(parsed.searchParams.get('foo'), 'bar')
  assert.equal(parsed.searchParams.get('trainingTab'), '1')
  assert.equal(parsed.searchParams.get('guardrailSeverity'), 'caution')
  assert.match(parsed.searchParams.get('guardrailWarnings') ?? '', /hard\/easy rhythm/)
  assert.ok(url.length < 700, `Expected normal handoff URL to stay reasonably short, got ${url.length}`)
}

console.log('StrideSync schedule handoff tests passed.')
