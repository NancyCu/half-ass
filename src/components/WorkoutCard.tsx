import type { Workout } from '../data/trainingPlan'
import { getWorkoutLibraryEntry } from '../data/workoutLibrary'
import { workoutDateLabel } from '../utils/workouts'

export function WorkoutCard({
  workout,
  week1Start,
  status,
  onOpen,
}: {
  workout: Workout
  week1Start: string
  status?: string
  onOpen: (workout: Workout) => void
}) {
  const library = getWorkoutLibraryEntry(workout.type)
  const distanceOrDuration = workout.miles ? `${workout.miles} mi` : workout.duration
  return (
    <button className={`workout-card ${library.color}`} type="button" onClick={() => onOpen(workout)}>
      <span className="card-date">{workout.dayName} · {workoutDateLabel(workout, week1Start)}</span>
      <span className="type-badge">{library.name}</span>
      <span className="card-title">{workout.name}</span>
      <span className="meta-grid">
        <span><small>Time / Distance</small>{distanceOrDuration}</span>
        <span><small>Target HR</small>{workout.targetBpm}</span>
        <span><small>Target Pace</small>{workout.targetPace}</span>
        <span><small>Zones</small>{workout.zone}</span>
      </span>
      <span className="steps-preview">{workout.steps.slice(0, 2).join(' · ')}</span>
      {status ? <span className={`status-pill ${status}`}>{status}</span> : null}
    </button>
  )
}
