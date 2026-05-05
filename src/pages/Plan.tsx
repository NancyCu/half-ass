import { useMemo, useState } from 'react'
import { WeekCard } from '../components/WeekCard'
import { trainingPlan, type Workout } from '../data/trainingPlan'
import type { useProgress } from '../hooks/useProgress'
import { getCurrentWeekNumber } from '../utils/workouts'

type ProgressApi = ReturnType<typeof useProgress>

export function Plan({
  week1Start,
  progressApi,
  onOpenWorkout,
}: {
  week1Start: string
  progressApi: ProgressApi
  onOpenWorkout: (workout: Workout) => void
}) {
  const currentWeek = getCurrentWeekNumber(week1Start)
  const currentBlock = Math.floor((currentWeek - 1) / 4)
  const [mode, setMode] = useState<'week' | 'block' | 'full'>('block')

  const visibleWeeks = useMemo(() => {
    if (mode === 'full') return trainingPlan
    if (mode === 'week') return trainingPlan.filter((week) => week.week === currentWeek)
    return trainingPlan.slice(currentBlock * 4, currentBlock * 4 + 4)
  }, [currentBlock, currentWeek, mode])

  return (
    <main className="screen">
      <header className="screen-header">
        <p className="eyebrow">15-week plan</p>
        <h1>Training Plan</h1>
      </header>
      <div className="segmented-control sticky-control" role="group" aria-label="Plan view">
        <button className={mode === 'week' ? 'selected' : ''} type="button" onClick={() => setMode('week')}>Week</button>
        <button className={mode === 'block' ? 'selected' : ''} type="button" onClick={() => setMode('block')}>4-week block</button>
        <button className={mode === 'full' ? 'selected' : ''} type="button" onClick={() => setMode('full')}>Full plan</button>
      </div>
      {visibleWeeks.map((week) => (
        <WeekCard key={week.week} week={week} week1Start={week1Start} progress={progressApi.progress} onOpenWorkout={onOpenWorkout} />
      ))}
    </main>
  )
}
