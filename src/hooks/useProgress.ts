import { useEffect, useMemo, useState } from 'react'
import { allWorkouts as defaultAllWorkouts, type PlanId, type Workout } from '../data/trainingPlan'
import { isMeaningfullyModified } from '../lib/workoutProgress'

const STORAGE_KEY = 'half_ass_training_progress_v1'

export type WorkoutStatus = 'completed' | 'skipped' | 'modified'
export type PainFlag = 'Good' | 'Tired' | 'Hip tight' | 'Ankle tight' | 'HR too high'

export type WorkoutProgress = {
  status?: WorkoutStatus
  note?: string
  flags?: PainFlag[]
  modification?: {
    savedAt: string
    summary: string
  }
  strideSyncHandoff?: {
    appliedAt: string
    identity: string
    runDistance?: string
    runDuration?: string
    runName?: string
    runSource?: string
  }
  updatedAt?: string
}

export type ManualRunEntry = {
  id: string
  date: string
  name: string
  distanceMiles: number
  duration?: string
  durationMinutes?: number
  pace?: string
  averageHr?: number
  createdAt: string
}

export type ProgressState = {
  workouts: Record<string, WorkoutProgress>
  manualRuns: ManualRunEntry[]
}

const initialProgress: ProgressState = { workouts: {}, manualRuns: [] }

function storageKeyForPlan(planId: PlanId) {
  return planId === 'mikey' ? STORAGE_KEY : `${STORAGE_KEY}_${planId}`
}

function readProgress(planId: PlanId): ProgressState {
  try {
    const raw = window.localStorage.getItem(storageKeyForPlan(planId))
    if (!raw) return initialProgress
    const parsed = JSON.parse(raw) as ProgressState
    return {
      workouts: parsed.workouts ?? {},
      manualRuns: Array.isArray(parsed.manualRuns) ? parsed.manualRuns : [],
    }
  } catch {
    return initialProgress
  }
}

export function useProgress(planId: PlanId = 'mikey', workouts: Workout[] = defaultAllWorkouts) {
  const [progressByPlan, setProgressByPlan] = useState<Record<PlanId, ProgressState>>(() => {
    if (typeof window === 'undefined') return { mikey: initialProgress, manny: initialProgress }
    return {
      mikey: readProgress('mikey'),
      manny: readProgress('manny'),
    }
  })
  const progress = progressByPlan[planId] ?? initialProgress

  useEffect(() => {
    window.localStorage.setItem(storageKeyForPlan(planId), JSON.stringify(progress))
  }, [planId, progress])

  function updateWorkout(id: string, patch: WorkoutProgress) {
    setProgressByPlan((allProgress) => {
      const current = allProgress[planId] ?? initialProgress
      return {
        ...allProgress,
        [planId]: {
          ...current,
          workouts: {
            ...current.workouts,
            [id]: {
              ...current.workouts[id],
              ...patch,
              updatedAt: new Date().toISOString(),
            },
          },
        },
      }
    })
  }

  function setStatus(id: string, status?: WorkoutStatus) {
    updateWorkout(id, { status, modification: undefined, strideSyncHandoff: undefined })
  }

  function completeFromStrideSync(id: string, handoff: NonNullable<WorkoutProgress['strideSyncHandoff']>) {
    updateWorkout(id, { status: 'completed', modification: undefined, strideSyncHandoff: handoff })
  }

  function saveModification(id: string, summary: string) {
    const trimmedSummary = summary.trim()
    if (!trimmedSummary) return
    updateWorkout(id, {
      status: 'modified',
      modification: {
        savedAt: new Date().toISOString(),
        summary: trimmedSummary,
      },
      strideSyncHandoff: undefined,
    })
  }

  function setNote(id: string, note: string) {
    updateWorkout(id, { note })
  }

  function toggleFlag(id: string, flag: PainFlag) {
    const current = progress.workouts[id]?.flags ?? []
    updateWorkout(id, {
      flags: current.includes(flag) ? current.filter((item) => item !== flag) : [...current, flag],
    })
  }

  function addManualRun(entry: Omit<ManualRunEntry, 'id' | 'createdAt'>) {
    setProgressByPlan((allProgress) => {
      const current = allProgress[planId] ?? initialProgress
      return {
        ...allProgress,
        [planId]: {
          ...current,
          manualRuns: [
            {
              ...entry,
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
            },
            ...(current.manualRuns ?? []),
          ],
        },
      }
    })
  }

  function removeManualRun(id: string) {
    setProgressByPlan((allProgress) => {
      const current = allProgress[planId] ?? initialProgress
      return {
        ...allProgress,
        [planId]: {
          ...current,
          manualRuns: (current.manualRuns ?? []).filter((run) => run.id !== id),
        },
      }
    })
  }

  function resetProgress() {
    setProgressByPlan((allProgress) => ({ ...allProgress, [planId]: initialProgress }))
  }

  function importProgress(next: ProgressState) {
    setProgressByPlan((allProgress) => ({
      ...allProgress,
      [planId]: {
        workouts: next.workouts ?? {},
        manualRuns: Array.isArray(next.manualRuns) ? next.manualRuns : [],
      },
    }))
  }

  const summary = useMemo(() => {
    const entries = Object.entries(progress.workouts)
    const completedIds = entries.filter(([, value]) => value.status === 'completed').map(([id]) => id)
    const skipped = entries.filter(([, value]) => value.status === 'skipped').length
    const modified = entries.filter(([, value]) => isMeaningfullyModified(value)).length
    const completedWorkouts = workouts.filter((workout) => completedIds.includes(workout.id))
    const longest = completedWorkouts.reduce((max, workout) => Math.max(max, workout.miles ?? 0), 0)
    const lastId = entries
      .filter(([, value]) => value.status === 'completed' && value.updatedAt)
      .sort((a, b) => String(b[1].updatedAt).localeCompare(String(a[1].updatedAt)))[0]?.[0]
    const lastWorkout = workouts.find((workout) => workout.id === lastId)

    return {
      completed: completedIds.length,
      skipped,
      modified,
      total: workouts.length,
      percentage: Math.round((completedIds.length / workouts.length) * 100),
      longestRun: longest,
      lastWorkout,
    }
  }, [progress, workouts])

  return {
    progress,
    summary,
    setStatus,
    completeFromStrideSync,
    saveModification,
    setNote,
    toggleFlag,
    addManualRun,
    removeManualRun,
    resetProgress,
    importProgress,
  }
}
