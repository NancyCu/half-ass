import type { Workout } from '../data/trainingPlan'
import type { PainFlag, WorkoutStatus } from '../hooks/useProgress'
import { GarminCopyButton } from './GarminCopyButton'
import { getWorkoutLibraryEntry } from '../data/workoutLibrary'
import { ZoneChips } from './ZoneChips'

const flags: PainFlag[] = ['Good', 'Tired', 'Hip tight', 'Ankle tight', 'HR too high']
const flagLabels: Record<PainFlag, string> = {
  Good: 'Good',
  Tired: 'Tired',
  'Hip tight': 'Hip Tight',
  'Ankle tight': 'Ankle Tight',
  'HR too high': 'HR High',
}

export function TodayWorkoutCard({
  workout,
  week1Start,
  status,
  note,
  selectedFlags,
  onStatus,
  onNote,
  onToggleFlag,
}: {
  workout: Workout | null
  week1Start: string
  status?: WorkoutStatus
  note?: string
  selectedFlags: PainFlag[]
  onStatus: (status?: WorkoutStatus) => void
  onNote: (note: string) => void
  onToggleFlag: (flag: PainFlag) => void
}) {
  if (!workout) {
    return (
      <section className="today-card">
        <p className="eyebrow">No scheduled workout</p>
        <h1>Plan starts outside today</h1>
        <p>Set Week 1 in Settings to bring today into the 15-week plan.</p>
      </section>
    )
  }

  const isEasyDay = ['foundation', 'recovery', 'long-run', 'long-speed-play', 'long-fast-finish'].includes(workout.type)
  const library = getWorkoutLibraryEntry(workout.type)
  const distanceOrDuration = workout.miles ? `${workout.miles} mi` : workout.duration

  return (
    <section className={`today-card ${library.color} ${isEasyDay ? 'easy-day' : ''}`}>
      <div className="hero-stripe" aria-hidden="true" />
      <h1>{workout.name}</h1>
      <div className="target-strip">
        <div><span>Time / Distance</span><strong>{distanceOrDuration}</strong></div>
        <div><span>Target HR</span><strong>{workout.targetBpm}</strong></div>
        <div><span>Target Pace</span><strong>{workout.targetPace}</strong></div>
        <div><span>Zones</span><strong><ZoneChips zones={workout.zone} /></strong></div>
      </div>
      <p className="workout-goal-strip">{library.what}</p>
      {isEasyDay ? <div className="warning-banner">Stay under 143 bpm</div> : null}
      <ol className="step-list">
        {workout.steps.map((step, index) => <li key={`${index}-${step}`}>{step}</li>)}
      </ol>
      <GarminCopyButton workout={workout} week1Start={week1Start} />
      <div className="button-row action-row">
        <button className="primary-button" type="button" onClick={() => onStatus(status === 'completed' ? undefined : 'completed')}>
          {status === 'completed' ? 'Undo Complete' : 'Complete Workout'}
        </button>
        <button className="secondary-button" type="button" onClick={() => onStatus('skipped')}>Skip</button>
        <button className="secondary-button" type="button" onClick={() => onStatus('modified')}>Modify</button>
      </div>
      <label className="note-field">
        <span>Run Notes</span>
        <textarea value={note ?? ''} onChange={(event) => onNote(event.target.value)} placeholder="Breathing, legs, pain, fuel, weather…" />
      </label>
      <div className="flag-row">
        {flags.map((flag) => (
          <button className={selectedFlags.includes(flag) ? 'flag selected' : 'flag'} key={flag} type="button" onClick={() => onToggleFlag(flag)}>
            {flagLabels[flag]}
          </button>
        ))}
      </div>
    </section>
  )
}
