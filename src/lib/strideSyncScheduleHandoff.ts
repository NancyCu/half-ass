import type { CrossTrainingType, ScheduleAdjustmentAction, ScheduleGuardrailSeverity } from './scheduleAdjustments'

export const DEFAULT_STRIDESYNC_URL = 'http://localhost:5173/?trainingTab=1'
export const STRIDESYNC_SCHEDULE_ADJUSTMENT_VERSION = '1'

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

function setOptionalParam(params: URLSearchParams, key: string, value?: string) {
  if (!value) {
    params.delete(key)
    return
  }
  params.set(key, value)
}
