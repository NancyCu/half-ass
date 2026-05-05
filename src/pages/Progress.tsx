import { RotateCcw } from 'lucide-react'
import { ProgressSummary } from '../components/ProgressSummary'
import { allWorkouts, type Workout } from '../data/trainingPlan'
import type { useProgress } from '../hooks/useProgress'
import { getCurrentWeekNumber, workoutDateLabel } from '../utils/workouts'

type ProgressApi = ReturnType<typeof useProgress>

export function Progress({
  week1Start,
  progressApi,
  onOpenWorkout,
}: {
  week1Start: string
  progressApi: ProgressApi
  onOpenWorkout: (workout: Workout) => void
}) {
  const currentWeek = getCurrentWeekNumber(week1Start)
  const touched = allWorkouts.filter((workout) => progressApi.progress.workouts[workout.id])

  function reset() {
    if (window.confirm('Reset workout progress, notes, and flags?')) {
      progressApi.resetProgress()
    }
  }

  return (
    <main className="screen">
      <header className="screen-header split-header">
        <div>
          <p className="eyebrow">Local progress</p>
          <h1>Progress</h1>
        </div>
        <button className="icon-button" type="button" onClick={reset} aria-label="Reset progress">
          <RotateCcw size={21} />
        </button>
      </header>
      <ProgressSummary summary={progressApi.summary} currentWeek={currentWeek} />
      <section className="progress-panel">
        <h2>Training log</h2>
        {touched.length === 0 ? <p>No workouts logged yet.</p> : null}
        {touched.map((workout) => {
          const item = progressApi.progress.workouts[workout.id]
          return (
            <article className="log-row" key={workout.id}>
              <button type="button" onClick={() => onOpenWorkout(workout)}>
                <strong>{workout.name}</strong>
                <span>{workoutDateLabel(workout, week1Start)} · {item.status ?? 'note'}</span>
              </button>
              <textarea
                aria-label={`Note for ${workout.name}`}
                value={item.note ?? ''}
                placeholder="Add or edit note"
                onChange={(event) => progressApi.setNote(workout.id, event.target.value)}
              />
              <div className="button-row compact">
                <button type="button" onClick={() => progressApi.setStatus(workout.id, item.status === 'completed' ? undefined : 'completed')}>
                  {item.status === 'completed' ? 'Undo' : 'Complete'}
                </button>
                <button type="button" onClick={() => progressApi.setStatus(workout.id, 'skipped')}>Skipped</button>
                <button type="button" onClick={() => progressApi.setStatus(workout.id, 'modified')}>Modified</button>
              </div>
            </article>
          )
        })}
      </section>
      <section className="progress-panel">
        <h2>Snapshot</h2>
        <p>Skipped: {progressApi.summary.skipped}</p>
        <p>Modified: {progressApi.summary.modified}</p>
        <p>Last completed: {progressApi.summary.lastWorkout?.name ?? 'None yet'}</p>
      </section>
    </main>
  )
}
