import { useEffect, useMemo, useState } from 'react'
import { allWorkouts } from '../data/trainingPlan'

const STORAGE_KEY = 'half_ass_training_progress_v1'

export type WorkoutStatus = 'completed' | 'skipped' | 'modified'
export type PainFlag = 'Good' | 'Tired' | 'Hip tight' | 'Ankle tight' | 'HR too high'

export type WorkoutProgress = {
  status?: WorkoutStatus
  note?: string
  flags?: PainFlag[]
  updatedAt?: string
}

export type ProgressState = {
  workouts: Record<string, WorkoutProgress>
}

const initialProgress: ProgressState = { workouts: {} }

function readProgress(): ProgressState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialProgress
    const parsed = JSON.parse(raw) as ProgressState
    return { workouts: parsed.workouts ?? {} }
  } catch {
    return initialProgress
  }
}

export function useProgress() {
  const [progress, setProgress] = useState<ProgressState>(() => {
    if (typeof window === 'undefined') return initialProgress
    return readProgress()
  })

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  }, [progress])

  function updateWorkout(id: string, patch: WorkoutProgress) {
    setProgress((current) => ({
      workouts: {
        ...current.workouts,
        [id]: {
          ...current.workouts[id],
          ...patch,
          updatedAt: new Date().toISOString(),
        },
      },
    }))
  }

  function setStatus(id: string, status?: WorkoutStatus) {
    updateWorkout(id, { status })
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

  function resetProgress() {
    setProgress(initialProgress)
  }

  function importProgress(next: ProgressState) {
    setProgress({ workouts: next.workouts ?? {} })
  }

  const summary = useMemo(() => {
    const entries = Object.entries(progress.workouts)
    const completedIds = entries.filter(([, value]) => value.status === 'completed').map(([id]) => id)
    const skipped = entries.filter(([, value]) => value.status === 'skipped').length
    const modified = entries.filter(([, value]) => value.status === 'modified').length
    const completedWorkouts = allWorkouts.filter((workout) => completedIds.includes(workout.id))
    const longest = completedWorkouts.reduce((max, workout) => Math.max(max, workout.miles ?? 0), 0)
    const lastId = entries
      .filter(([, value]) => value.status === 'completed' && value.updatedAt)
      .sort((a, b) => String(b[1].updatedAt).localeCompare(String(a[1].updatedAt)))[0]?.[0]
    const lastWorkout = allWorkouts.find((workout) => workout.id === lastId)

    return {
      completed: completedIds.length,
      skipped,
      modified,
      total: allWorkouts.length,
      percentage: Math.round((completedIds.length / allWorkouts.length) * 100),
      longestRun: longest,
      lastWorkout,
    }
  }, [progress])

  return {
    progress,
    summary,
    setStatus,
    setNote,
    toggleFlag,
    resetProgress,
    importProgress,
  }
}
