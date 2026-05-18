import type { CrossTrainingType, ScheduleAdjustmentAction, ScheduleGuardrailSeverity } from './scheduleAdjustments'
import { formatFriendlyDate, parseISODate } from '../utils/dates'

export const DEFAULT_STRIDESYNC_URL = 'http://localhost:5173/?trainingTab=1'
export const STRIDESYNC_SCHEDULE_ADJUSTMENT_VERSION = '1'
export const SCHEDULE_HANDOFF_HISTORY_STORAGE_PREFIX = 'half_ass_schedule_handoff_history_v1'

type SupportedScheduleAction = Extract<
  ScheduleAdjustmentAction,
  'skipped' | 'moved' | 'swapped' | 'cross_train' | 'missed' | 'restored'
>

export type StrideSyncScheduleHandoffPayload = {
  actionType: SupportedScheduleAction
  adjustmentId: string
  assignedDate: string
  createdAt: string
  planId: string
  profileId?: string
  originalDate: string
  reason?: string
  status?: 'active'
  updatedAt: string
  workoutId: string
  workoutName: string
  crossTrainingType?: CrossTrainingType
  guardrailSeverity?: ScheduleGuardrailSeverity
  guardrailWarnings?: string[]
  pairedAssignedDate?: string
  pairedOriginalDate?: string
  pairedWorkoutId?: string
  pairedWorkoutName?: string
  swapGroupId?: string
}

export type ScheduleHandoffHistoryStatus = 'generated' | 'opened' | 'copied' | 'dismissed' | 'superseded'

export type ScheduleHandoffHistoryEntry = {
  id: string
  scheduleHandoffId: string
  planId: string
  profileId?: string
  workoutId: string
  workoutName: string
  originalDate: string
  assignedDate: string
  actionType: SupportedScheduleAction
  status: ScheduleHandoffHistoryStatus
  createdAt: string
  updatedAt: string
  url?: string
  summary: string
  reason?: string
  crossTrainingType?: CrossTrainingType
  swapGroupId?: string
  attemptCount: number
}

export type ScheduleHandoffHistoryState = {
  schemaVersion: 1
  planId: string
  entries: ScheduleHandoffHistoryEntry[]
}

type ScheduleHandoffHistoryStorage = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function normalizeValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function shorten(value: string, maxLength: number) {
  return value.length > maxLength ? value.slice(0, maxLength) : value
}

function compactDate(isoDate: string) {
  return isoDate.replace(/-/g, '')
}

function cleanText(value?: string) {
  if (!value) return undefined
  const trimmed = value.trim().replace(/\s+/g, ' ')
  return trimmed || undefined
}

function getDefaultStorage(): ScheduleHandoffHistoryStorage | null {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

function emptyScheduleHandoffHistoryState(planId: string): ScheduleHandoffHistoryState {
  return {
    schemaVersion: 1,
    planId,
    entries: [],
  }
}

function encodeGuardrailWarnings(warnings?: string[]) {
  if (!warnings?.length) return undefined

  const compactWarnings = warnings
    .map((warning) => cleanText(warning))
    .filter((warning): warning is string => Boolean(warning))
    .filter((warning, index, values) => values.indexOf(warning) === index)
    .slice(0, 3)
    .map((warning) => shorten(warning, 96))

  if (!compactWarnings.length) return undefined
  return compactWarnings.join('||')
}

function actionLabel(actionType: SupportedScheduleAction) {
  switch (actionType) {
    case 'cross_train':
      return 'Cross-train'
    case 'missed':
      return 'Missed'
    case 'moved':
      return 'Move'
    case 'restored':
      return 'Restore'
    case 'skipped':
      return 'Skip'
    case 'swapped':
      return 'Swap'
    default:
      return 'Adjustment'
  }
}

function formatCompactDate(isoDate: string) {
  return formatFriendlyDate(parseISODate(isoDate)).replace(/^[A-Za-z]{3},\s*/, '')
}

function clampSafeUrl(url?: string) {
  const cleanedUrl = cleanText(url)
  if (!cleanedUrl) return undefined
  return cleanedUrl.length <= 700 ? cleanedUrl : undefined
}

function sanitizeStatus(value: unknown): ScheduleHandoffHistoryStatus | null {
  return value === 'generated'
    || value === 'opened'
    || value === 'copied'
    || value === 'dismissed'
    || value === 'superseded'
    ? value
    : null
}

function sanitizeScheduleHandoffHistoryEntry(value: unknown, planId: string): ScheduleHandoffHistoryEntry | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<ScheduleHandoffHistoryEntry>
  const status = sanitizeStatus(candidate.status)
  if (!status) return null
  if (
    typeof candidate.id !== 'string'
    || typeof candidate.scheduleHandoffId !== 'string'
    || typeof candidate.workoutId !== 'string'
    || typeof candidate.workoutName !== 'string'
    || typeof candidate.originalDate !== 'string'
    || typeof candidate.assignedDate !== 'string'
    || typeof candidate.actionType !== 'string'
    || typeof candidate.createdAt !== 'string'
    || typeof candidate.updatedAt !== 'string'
    || typeof candidate.summary !== 'string'
  ) return null

  return {
    id: candidate.id,
    scheduleHandoffId: candidate.scheduleHandoffId,
    planId: typeof candidate.planId === 'string' && candidate.planId.trim() ? candidate.planId : planId,
    profileId: cleanText(candidate.profileId),
    workoutId: candidate.workoutId,
    workoutName: cleanText(candidate.workoutName) ?? candidate.workoutName,
    originalDate: candidate.originalDate,
    assignedDate: candidate.assignedDate,
    actionType: candidate.actionType as SupportedScheduleAction,
    status,
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt,
    url: clampSafeUrl(candidate.url),
    summary: cleanText(candidate.summary) ?? candidate.summary,
    reason: cleanText(candidate.reason),
    crossTrainingType: candidate.crossTrainingType,
    swapGroupId: cleanText(candidate.swapGroupId),
    attemptCount: Math.max(1, Number(candidate.attemptCount) || 1),
  }
}

function sanitizeScheduleHandoffHistoryState(value: unknown, planId: string): ScheduleHandoffHistoryState {
  if (!value || typeof value !== 'object') return emptyScheduleHandoffHistoryState(planId)
  const candidate = value as Partial<ScheduleHandoffHistoryState>
  const entries = Array.isArray(candidate.entries)
    ? candidate.entries
      .map((entry) => sanitizeScheduleHandoffHistoryEntry(entry, planId))
      .filter((entry): entry is ScheduleHandoffHistoryEntry => Boolean(entry))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, 50)
    : []

  return {
    schemaVersion: 1,
    planId,
    entries,
  }
}

export function getScheduleHandoffHistoryStorageKey(planId: string) {
  return `${SCHEDULE_HANDOFF_HISTORY_STORAGE_PREFIX}:${planId}`
}

export function buildScheduleHandoffSummary(payload: Pick<
  StrideSyncScheduleHandoffPayload,
  'actionType' | 'assignedDate' | 'originalDate' | 'workoutName'
>) {
  const base = `${actionLabel(payload.actionType)} ${cleanText(payload.workoutName) ?? 'Workout'}`
  if (payload.assignedDate !== payload.originalDate) {
    return `${base} · ${formatCompactDate(payload.originalDate)} -> ${formatCompactDate(payload.assignedDate)}`
  }
  return `${base} · ${formatCompactDate(payload.assignedDate)}`
}

export function getStrideSyncBaseUrl(explicitBaseUrl?: string) {
  const configured = explicitBaseUrl?.trim() || import.meta.env?.VITE_STRIDESYNC_URL?.trim()
  return configured || DEFAULT_STRIDESYNC_URL
}

export function buildScheduleHandoffId(payload: Pick<
  StrideSyncScheduleHandoffPayload,
  'actionType' | 'adjustmentId' | 'assignedDate' | 'originalDate' | 'planId' | 'swapGroupId' | 'workoutId'
>) {
  const identitySeed = payload.swapGroupId || payload.adjustmentId
  return [
    'sched1',
    shorten(normalizeValue(payload.planId) || 'plan', 16),
    shorten(normalizeValue(payload.workoutId) || 'workout', 24),
    compactDate(payload.originalDate),
    compactDate(payload.assignedDate),
    shorten(normalizeValue(payload.actionType) || 'action', 16),
    shorten(normalizeValue(identitySeed) || 'id', 32),
  ].join('-')
}

export function buildStrideSyncScheduleHandoffUrl(
  payload: StrideSyncScheduleHandoffPayload,
  options: { baseUrl?: string } = {},
) {
  const url = new URL(getStrideSyncBaseUrl(options.baseUrl))
  const params = url.searchParams
  const scheduleHandoffId = buildScheduleHandoffId(payload)
  const guardrailWarnings = encodeGuardrailWarnings(payload.guardrailWarnings)

  params.set('trainingTab', params.get('trainingTab') || '1')
  params.set('source', 'halfass')
  params.set('action', 'applyScheduleAdjustment')
  params.set('scheduleAdjustmentVersion', STRIDESYNC_SCHEDULE_ADJUSTMENT_VERSION)
  params.set('scheduleHandoffId', scheduleHandoffId)
  params.set('planId', payload.planId)
  params.set('workoutId', payload.workoutId)
  params.set('workoutName', payload.workoutName)
  params.set('originalDate', payload.originalDate)
  params.set('assignedDate', payload.assignedDate)
  params.set('actionType', payload.actionType)
  params.set('status', payload.status || 'active')
  params.set('adjustmentId', payload.adjustmentId)
  params.set('createdAt', payload.createdAt)
  params.set('updatedAt', payload.updatedAt)

  setOptionalParam(params, 'profileId', payload.profileId)
  setOptionalParam(params, 'reason', cleanText(payload.reason))
  setOptionalParam(params, 'crossTrainingType', payload.crossTrainingType)
  setOptionalParam(params, 'swapGroupId', payload.swapGroupId)
  setOptionalParam(params, 'guardrailSeverity', payload.guardrailSeverity)
  setOptionalParam(params, 'guardrailWarnings', guardrailWarnings)
  setOptionalParam(params, 'pairedWorkoutId', payload.pairedWorkoutId)
  setOptionalParam(params, 'pairedWorkoutName', cleanText(payload.pairedWorkoutName))
  setOptionalParam(params, 'pairedOriginalDate', payload.pairedOriginalDate)
  setOptionalParam(params, 'pairedAssignedDate', payload.pairedAssignedDate)

  return {
    scheduleHandoffId,
    url: url.toString(),
  }
}

export function readScheduleHandoffHistory(
  planId: string,
  storage: ScheduleHandoffHistoryStorage | null = getDefaultStorage(),
): ScheduleHandoffHistoryState {
  if (!storage) return emptyScheduleHandoffHistoryState(planId)
  try {
    return sanitizeScheduleHandoffHistoryState(
      JSON.parse(storage.getItem(getScheduleHandoffHistoryStorageKey(planId)) ?? 'null'),
      planId,
    )
  } catch {
    return emptyScheduleHandoffHistoryState(planId)
  }
}

export function recordScheduleHandoffHistory(
  payload: StrideSyncScheduleHandoffPayload,
  event: {
    status: Exclude<ScheduleHandoffHistoryStatus, 'superseded'>
    occurredAt?: string
    url?: string
  },
  storage: ScheduleHandoffHistoryStorage | null = getDefaultStorage(),
) {
  const occurredAt = event.occurredAt ?? new Date().toISOString()
  const { scheduleHandoffId } = buildStrideSyncScheduleHandoffUrl(payload)
  const current = readScheduleHandoffHistory(payload.planId, storage)
  const previous = current.entries.find((entry) => entry.scheduleHandoffId === scheduleHandoffId)
  const summary = buildScheduleHandoffSummary(payload)
  const entry: ScheduleHandoffHistoryEntry = {
    id: previous?.id ?? scheduleHandoffId,
    scheduleHandoffId,
    planId: payload.planId,
    profileId: cleanText(payload.profileId),
    workoutId: payload.workoutId,
    workoutName: cleanText(payload.workoutName) ?? 'Workout',
    originalDate: payload.originalDate,
    assignedDate: payload.assignedDate,
    actionType: payload.actionType,
    status: event.status,
    createdAt: previous?.createdAt ?? occurredAt,
    updatedAt: occurredAt,
    url: clampSafeUrl(event.url ?? previous?.url),
    summary,
    reason: cleanText(payload.reason),
    crossTrainingType: payload.crossTrainingType,
    swapGroupId: cleanText(payload.swapGroupId),
    attemptCount: event.status === 'opened' ? (previous?.attemptCount ?? 0) + 1 : (previous?.attemptCount ?? 1),
  }

  const nextEntries = current.entries
    .map((item) => {
      if (item.scheduleHandoffId === scheduleHandoffId) return null
      if (
        item.workoutId === payload.workoutId
        && item.originalDate === payload.originalDate
        && item.scheduleHandoffId !== scheduleHandoffId
        && item.status !== 'superseded'
      ) {
        return {
          ...item,
          status: 'superseded' as const,
          updatedAt: occurredAt,
        }
      }
      return item
    })
    .filter((item): item is ScheduleHandoffHistoryEntry => Boolean(item))

  const nextState: ScheduleHandoffHistoryState = {
    schemaVersion: 1,
    planId: payload.planId,
    entries: [entry, ...nextEntries]
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, 50),
  }

  if (storage) {
    storage.setItem(getScheduleHandoffHistoryStorageKey(payload.planId), JSON.stringify(nextState))
  }

  return entry
}

export function clearScheduleHandoffHistory(
  planId: string,
  storage: ScheduleHandoffHistoryStorage | null = getDefaultStorage(),
) {
  storage?.removeItem(getScheduleHandoffHistoryStorageKey(planId))
}

function setOptionalParam(params: URLSearchParams, key: string, value?: string) {
  if (!value) {
    params.delete(key)
    return
  }
  params.set(key, value)
}
