import type { WorkoutProgress, WorkoutStatus } from '../hooks/useProgress'

export function isMeaningfullyModified(progress?: WorkoutProgress) {
  return progress?.status === 'modified' && Boolean(progress.modification?.summary.trim())
}

export function effectiveWorkoutStatus(progress?: WorkoutProgress): WorkoutStatus | undefined {
  if (!progress?.status) return undefined
  if (progress.status === 'modified' && !isMeaningfullyModified(progress)) return undefined
  return progress.status
}

export function hasVisibleWorkoutProgress(progress?: WorkoutProgress) {
  return Boolean(
    effectiveWorkoutStatus(progress)
    || progress?.note?.trim()
    || (progress?.flags?.length ?? 0) > 0
    || progress?.strideSyncHandoff,
  )
}
