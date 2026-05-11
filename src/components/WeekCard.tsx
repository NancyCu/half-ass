import type { WeekPlan, Workout } from '../data/trainingPlan'
import type { ProgressState } from '../hooks/useProgress'
import { effectiveWorkoutStatus } from '../lib/workoutProgress'
import { WorkoutCard } from './WorkoutCard'

export function WeekCard({
  week,
  week1Start,
  progress,
  onOpenWorkout,
}: {
  week: WeekPlan
  week1Start: string
  progress: ProgressState
  onOpenWorkout: (workout: Workout) => void
}) {
  const completed = week.days.filter((workout) => effectiveWorkoutStatus(progress.workouts[workout.id]) === 'completed').length
  const phaseClass = week.label === 'Race Week'
    ? 'race-week'
    : week.label === 'Recovery Week'
      ? 'recovery-week'
      : week.label === 'Taper Week'
        ? 'taper-week'
        : week.phase.toLowerCase().includes('peak')
          ? 'peak-week'
          : 'base-week'

  return (
    <section className={`week-card ${phaseClass}`}>
      <div className="week-header">
        <div>
          <p className="eyebrow">{week.phase}</p>
          <h2>Week {week.week}</h2>
        </div>
        <div className="week-stack">
          {week.label ? <span className="week-label">{week.label}</span> : null}
          <span className="mini-progress">{completed}/7 done</span>
        </div>
      </div>
      <div className="day-list">
        {week.days.map((workout) => (
          <WorkoutCard
            key={workout.id}
            workout={workout}
            week1Start={week1Start}
            status={effectiveWorkoutStatus(progress.workouts[workout.id])}
            onOpen={onOpenWorkout}
          />
        ))}
      </div>
    </section>
  )
}
