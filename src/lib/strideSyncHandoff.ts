import type { PlanId, Workout } from '../data/trainingPlan'
import type { WorkoutProgress } from '../hooks/useProgress'
import { parseISODate, toISODate } from '../utils/dates'
import { getWorkoutForDate, workoutISO } from '../utils/workouts'

export const STRIDESYNC_HANDOFF_APPLIED_STORAGE_KEY = 'halfass_stride_handoff_applied_v1'
export const STRIDESYNC_HANDOFF_HISTORY_STORAGE_KEY = 'halfass_stride_handoff_history_v1'
const AUTO_ACCEPT_V2_VERSION = '2'
const AUTO_ACCEPT_MAX_AGE_MS = 24 * 60 * 60 * 1000

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/

export type StrideSyncHandoff = {
  action: string
  autoCompleted?: string
  confidence?: string
  date: string
  handoffVersion?: string
  handoffId?: string
  matchedAt?: string
  matchStatus?: string
  rawWorkoutId?: string
  runDistance?: string
  runDuration?: string
  runId?: string
  runName?: string
  runSource?: string
  source: string
  workout: Workout | null
  workoutName: string
  autoAcceptBlockReason?: string
  error?: string
  identity: string
}

export type StrideSyncHandoffHistoryMode = 'auto_accept' | 'manual_confirm'
export type StrideSyncHandoffHistoryStatus = 'applied' | 'dismissed' | 'rejected' | 'duplicate' | 'undone'

export type StrideSyncHandoffHistoryEntry = {
  id: string
  acceptedAt: string
  date: string
  handoffId: string
  mode: StrideSyncHandoffHistoryMode
  reason?: string
  runDistance?: string
  runDuration?: string
  runName?: string
  runSource?: string
  status: StrideSyncHandoffHistoryStatus
  workoutId?: string
  workoutName: string
}

export type StrideSyncHandoffHistoryState = {
  entries: StrideSyncHandoffHistoryEntry[]
}

export type AppliedStrideSyncHandoff = {
  completedAt: string
  date: string
  handoffId?: string
  identity: string
  planId: PlanId
  runIdentity: string
  workoutId: string
}

export type AppliedStrideSyncHandoffState = {
  handoffs: Record<string, AppliedStrideSyncHandoff>
}

export type AutoAcceptValidationResult =
  | { status: 'accepted'; handoff: StrideSyncHandoff }
  | { status: 'blocked'; reason: string }
  | { status: 'already_applied'; reason: string }

export function readStrideSyncHandoffFromSearch(search: string, workouts: Workout[], week1Start: string): StrideSyncHandoff | null {
  const params = new URLSearchParams(search)
  const source = params.get('source') ?? ''
  const action = params.get('action') ?? ''
  if (source !== 'stridesync' || action !== 'completeWorkout') return null

  const date = params.get('date') ?? ''
  const rawWorkoutName = params.get('workoutName') ?? ''
  const workoutId = params.get('workoutId') ?? undefined
  const workout = resolveWorkoutForHandoff(date, workouts, week1Start)
  const dateMatches = Boolean(workout && workoutISO(workout, week1Start) === date)
  const namesMatch = Boolean(workout && (!rawWorkoutName || normalizeHandoffValue(workout.name) === normalizeHandoffValue(rawWorkoutName)))
  const idsMatch = Boolean(workout && (!workoutId || workout.id === workoutId || isSupportedPrePlanIdAlias(workout.id, workoutId, date)))
  const autoAcceptBlockReason = getManualBlockReason({
    date,
    dateMatches,
    handoffVersion: params.get('handoffVersion') ?? undefined,
    handoffId: params.get('handoffId') ?? undefined,
    matchedAt: params.get('matchedAt') ?? params.get('handoffGeneratedAt') ?? undefined,
    matchStatus: params.get('matchStatus') ?? undefined,
    confidence: params.get('confidence') ?? undefined,
    runDistance: params.get('runDistance') ?? undefined,
    runDuration: params.get('runDuration') ?? undefined,
    runName: params.get('runName') ?? undefined,
    runSource: params.get('runSource') ?? undefined,
    hasWorkoutLocator: Boolean(workoutId || rawWorkoutName),
    idsMatch,
    namesMatch,
    workout,
  })
  const workoutName = rawWorkoutName || workout?.name || 'Workout'

  return {
    action,
    autoAcceptBlockReason,
    autoCompleted: params.get('autoCompleted') ?? undefined,
    confidence: params.get('confidence') ?? undefined,
    date,
    error: workout && dateMatches && namesMatch ? undefined : 'Could not match this handoff to a planned workout.',
    handoffId: params.get('handoffId') ?? undefined,
    handoffVersion: params.get('handoffVersion') ?? undefined,
    identity: buildStrideSyncHandoffIdentity({
      date,
      runDistance: params.get('runDistance') ?? '',
      runDuration: params.get('runDuration') ?? '',
      runId: params.get('runId') ?? '',
      runName: params.get('runName') ?? '',
      runSource: params.get('runSource') ?? '',
      source,
      workoutId: workoutId ?? rawWorkoutName,
    }),
    matchedAt: params.get('matchedAt') ?? params.get('handoffGeneratedAt') ?? undefined,
    matchStatus: params.get('matchStatus') ?? undefined,
    rawWorkoutId: workoutId,
    runDistance: params.get('runDistance') ?? undefined,
    runDuration: params.get('runDuration') ?? undefined,
    runId: params.get('runId') ?? undefined,
    runName: params.get('runName') ?? undefined,
    runSource: params.get('runSource') ?? undefined,
    source,
    workout: workout && dateMatches && namesMatch ? workout : null,
    workoutName,
  }
}

export function validateStrideSyncAutoAccept(
  handoff: StrideSyncHandoff,
  options: {
    appliedState: AppliedStrideSyncHandoffState
    currentProgress?: WorkoutProgress
    planId: PlanId
    week1Start: string
  },
): AutoAcceptValidationResult {
  if (handoff.handoffVersion !== AUTO_ACCEPT_V2_VERSION) {
    return { status: 'blocked', reason: 'Auto-accept blocked: handoffVersion=2 required' }
  }
  if (!handoff.workout) return { status: 'blocked', reason: handoff.autoAcceptBlockReason ?? 'Auto-accept blocked: workout mismatch' }
  if (handoff.autoAcceptBlockReason) return { status: 'blocked', reason: handoff.autoAcceptBlockReason }
  if (options.currentProgress?.status === 'completed') return { status: 'already_applied', reason: 'Already completed from StrideSync.' }
  if (options.currentProgress?.status === 'skipped' || options.currentProgress?.status === 'modified') {
    return { status: 'blocked', reason: 'Auto-accept blocked: existing local decision' }
  }
  if (!handoff.runName?.trim() || !handoff.runSource?.trim()) return { status: 'blocked', reason: 'Auto-accept blocked: missing required run data' }
  if (!isPositiveNumber(handoff.runDistance) || !isPositiveNumber(handoff.runDuration)) {
    return { status: 'blocked', reason: 'Auto-accept blocked: missing required run data' }
  }
  if (handoff.matchStatus !== 'likely_match') {
    return { status: 'blocked', reason: 'Auto-accept blocked: wrong matchStatus' }
  }
  const confidence = Number(handoff.confidence)
  if (!Number.isFinite(confidence) || confidence < 80) {
    return { status: 'blocked', reason: 'Auto-accept blocked: low confidence' }
  }
  if (!handoff.handoffId?.trim()) return { status: 'blocked', reason: 'Auto-accept blocked: missing handoffId' }
  if (!handoff.matchedAt || isStaleTimestamp(handoff.matchedAt)) return { status: 'blocked', reason: 'Auto-accept blocked: stale matchedAt' }
  if (hasAppliedStrideSyncHandoff(options.appliedState, handoff)) return { status: 'already_applied', reason: 'Already applied from StrideSync.' }

  const runIdentity = getRunIdentity(handoff)
  const duplicateRun = Object.values(options.appliedState.handoffs).find((entry) => (
    entry.planId === options.planId
    && entry.runIdentity === runIdentity
    && entry.workoutId !== handoff.workout?.id
  ))
  if (duplicateRun) return { status: 'blocked', reason: 'Auto-accept blocked: duplicate handoff' }

  if (workoutISO(handoff.workout, options.week1Start) !== handoff.date) {
    return { status: 'blocked', reason: 'Auto-accept blocked: wrong date' }
  }

  return { status: 'accepted', handoff }
}

export function readAppliedStrideSyncHandoffs(storage: Storage): AppliedStrideSyncHandoffState {
  try {
    const raw = storage.getItem(STRIDESYNC_HANDOFF_APPLIED_STORAGE_KEY)
    if (!raw) return { handoffs: {} }
    const parsed = JSON.parse(raw) as Partial<AppliedStrideSyncHandoffState>
    return parsed.handoffs && typeof parsed.handoffs === 'object' ? { handoffs: parsed.handoffs } : { handoffs: {} }
  } catch {
    return { handoffs: {} }
  }
}

export function rememberAppliedStrideSyncHandoff(
  storage: Storage,
  handoff: StrideSyncHandoff,
  planId: PlanId,
  completedAt: string,
) {
  if (!handoff.workout) return
  const current = readAppliedStrideSyncHandoffs(storage)
  current.handoffs[getAppliedHandoffKey(handoff)] = {
    completedAt,
    date: handoff.date,
    handoffId: handoff.handoffId,
    identity: handoff.identity,
    planId,
    runIdentity: getRunIdentity(handoff),
    workoutId: handoff.workout.id,
  }
  storage.setItem(STRIDESYNC_HANDOFF_APPLIED_STORAGE_KEY, JSON.stringify(current))
}

export function readStrideSyncHandoffHistory(storage: Storage): StrideSyncHandoffHistoryState {
  try {
    const raw = storage.getItem(STRIDESYNC_HANDOFF_HISTORY_STORAGE_KEY)
    if (!raw) return { entries: [] }
    const parsed = JSON.parse(raw) as Partial<StrideSyncHandoffHistoryState>
    return { entries: Array.isArray(parsed.entries) ? parsed.entries.slice(0, 50) : [] }
  } catch {
    return { entries: [] }
  }
}

export function recordStrideSyncHandoffHistory(
  storage: Storage,
  handoff: StrideSyncHandoff,
  event: {
    acceptedAt: string
    mode: StrideSyncHandoffHistoryMode
    reason?: string
    status: StrideSyncHandoffHistoryStatus
  },
): boolean {
  const handoffId = handoff.handoffId ?? handoff.identity
  const id = [
    handoffId,
    event.mode,
    event.status,
    normalizeHandoffValue(event.reason ?? ''),
  ].join('|')
  const current = readStrideSyncHandoffHistory(storage)
  const currentEntry = current.entries.find((item) => item.id === id)
  const entry: StrideSyncHandoffHistoryEntry = {
    id,
    acceptedAt: currentEntry?.acceptedAt ?? event.acceptedAt,
    date: handoff.date,
    handoffId,
    mode: event.mode,
    reason: event.reason,
    runDistance: handoff.runDistance,
    runDuration: handoff.runDuration,
    runName: handoff.runName,
    runSource: handoff.runSource,
    status: event.status,
    workoutId: handoff.workout?.id ?? handoff.rawWorkoutId,
    workoutName: handoff.workout?.name ?? handoff.workoutName,
  }
  const nextEntries = [
    entry,
    ...current.entries.filter((item) => item.id !== id),
  ].slice(0, 50)
  if (currentEntry && JSON.stringify(currentEntry) === JSON.stringify(entry)) return false
  storage.setItem(STRIDESYNC_HANDOFF_HISTORY_STORAGE_KEY, JSON.stringify({ entries: nextEntries }))
  return true
}

export function clearStrideSyncHandoffHistory(storage: Storage) {
  storage.removeItem(STRIDESYNC_HANDOFF_HISTORY_STORAGE_KEY)
}

export function cleanStrideSyncHandoffParamsFromUrl(href: string) {
  const url = new URL(href)
  for (const key of [
    'action',
    'autoCompleted',
    'confidence',
    'date',
    'handoffGeneratedAt',
    'handoffId',
    'handoffVersion',
    'matchStatus',
    'matchedAt',
    'runDistance',
    'runDuration',
    'runId',
    'runName',
    'runSource',
    'source',
    'workoutId',
    'workoutName',
  ]) {
    url.searchParams.delete(key)
  }
  return `${url.pathname}${url.search}${url.hash}`
}

export function formatStrideSyncHandoffRun(handoff: Pick<StrideSyncHandoff, 'runDistance' | 'runDuration' | 'runName'>) {
  return [
    handoff.runName,
    formatOptionalMiles(handoff.runDistance),
    formatOptionalMinutes(handoff.runDuration),
  ].filter(Boolean).join(' · ')
}

function resolveWorkoutForHandoff(date: string, workouts: Workout[], week1Start: string) {
  if (!isoDatePattern.test(date)) return null
  const parsedDate = parseISODate(date)
  if (toISODate(parsedDate) !== date) return null
  return getWorkoutForDate(parsedDate, week1Start, workouts)
}

function getManualBlockReason({
  date,
  dateMatches,
  handoffVersion,
  handoffId,
  matchedAt,
  matchStatus,
  confidence,
  runDistance,
  runDuration,
  runName,
  runSource,
  hasWorkoutLocator,
  idsMatch,
  namesMatch,
  workout,
}: {
  date: string
  dateMatches: boolean
  handoffVersion?: string
  handoffId?: string
  matchedAt?: string
  matchStatus?: string
  confidence?: string
  runDistance?: string
  runDuration?: string
  runName?: string
  runSource?: string
  hasWorkoutLocator: boolean
  idsMatch: boolean
  namesMatch: boolean
  workout: Workout | null
}) {
  if (handoffVersion === AUTO_ACCEPT_V2_VERSION) {
    if (!handoffId?.trim()) return 'Auto-accept blocked: missing handoffId'
    if (!runName?.trim() || !runSource?.trim() || !isPositiveNumber(runDistance) || !isPositiveNumber(runDuration)) {
      return 'Auto-accept blocked: missing required run data'
    }
    if (!matchStatus?.trim()) return 'Auto-accept blocked: wrong matchStatus'
    if (matchStatus !== 'likely_match') return 'Auto-accept blocked: wrong matchStatus'
    const numericConfidence = Number(confidence)
    if (!Number.isFinite(numericConfidence) || numericConfidence < 80) return 'Auto-accept blocked: low confidence'
    if (!matchedAt || isStaleTimestamp(matchedAt)) return 'Auto-accept blocked: stale matchedAt'
  }
  if (!isoDatePattern.test(date)) return 'Auto-accept blocked: wrong date'
  if (!workout) return 'Auto-accept blocked: wrong date'
  if (!dateMatches) return 'Auto-accept blocked: wrong date'
  if (!hasWorkoutLocator) return 'Auto-accept blocked: workout mismatch'
  if (!idsMatch || !namesMatch) return 'Auto-accept blocked: workout mismatch'
  return undefined
}

function getAppliedHandoffKey(handoff: Pick<StrideSyncHandoff, 'handoffId' | 'handoffVersion' | 'identity'>) {
  return handoff.handoffVersion === AUTO_ACCEPT_V2_VERSION && handoff.handoffId?.trim()
    ? handoff.handoffId
    : handoff.identity
}

function hasAppliedStrideSyncHandoff(
  appliedState: AppliedStrideSyncHandoffState,
  handoff: Pick<StrideSyncHandoff, 'handoffId' | 'handoffVersion' | 'identity'>,
) {
  const primaryKey = getAppliedHandoffKey(handoff)
  if (appliedState.handoffs[primaryKey]) return true
  return handoff.handoffVersion === AUTO_ACCEPT_V2_VERSION
    ? Object.values(appliedState.handoffs).some((entry) => entry.handoffId === handoff.handoffId)
    : false
}

function buildStrideSyncHandoffIdentity({
  date,
  runDistance,
  runDuration,
  runId,
  runName,
  runSource,
  source,
  workoutId,
}: {
  date: string
  runDistance: string
  runDuration: string
  runId: string
  runName: string
  runSource: string
  source: string
  workoutId: string
}) {
  return [
    source,
    date,
    normalizeHandoffValue(workoutId),
    normalizeHandoffValue(runId || runName),
    normalizeHandoffValue(runDistance),
    normalizeHandoffValue(runDuration),
    normalizeHandoffValue(runSource),
  ].join('|')
}

function getRunIdentity(handoff: StrideSyncHandoff) {
  return [
    normalizeHandoffValue(handoff.runSource ?? ''),
    normalizeHandoffValue(handoff.runId || handoff.runName || ''),
    normalizeHandoffValue(handoff.runDistance ?? ''),
    normalizeHandoffValue(handoff.runDuration ?? ''),
  ].join('|')
}

function normalizeHandoffValue(value: string) {
  return value.trim().toLowerCase()
}

function isPositiveNumber(value?: string) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) && numericValue > 0
}

function isStaleTimestamp(value: string) {
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return true
  return Date.now() - timestamp > AUTO_ACCEPT_MAX_AGE_MS
}

function isSupportedPrePlanIdAlias(workoutId: string, rawWorkoutId: string, date: string) {
  return workoutId === `preplan-${date}-foundation-run-5` && rawWorkoutId === 'preplan-foundation-run-5'
}

function formatOptionalMiles(value?: string) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? `${numericValue.toFixed(2)} mi` : null
}

function formatOptionalMinutes(value?: string) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? `${Math.round(numericValue)} min` : null
}
