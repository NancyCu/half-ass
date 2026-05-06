import { X } from 'lucide-react'
import type { Workout } from '../data/trainingPlan'
import type { PainFlag, WorkoutStatus } from '../hooks/useProgress'
import { GarminCopyButton } from './GarminCopyButton'
import { ZoneChips } from './ZoneChips'

const flags: PainFlag[] = ['Good', 'Tired', 'Hip tight', 'Ankle tight', 'HR too high']
const flagLabels: Record<PainFlag, string> = {
  Good: 'Good',
  Tired: 'Tired',
  'Hip tight': 'Hip Tight',
  'Ankle tight': 'Ankle Tight',
  'HR too high': 'HR High',
}

export function WorkoutDetailSheet({
  workout,
  week1Start,
  status,
  note,
  selectedFlags,
  onClose,
  onStatus,
  onNote,
  onToggleFlag,
}: {
  workout: Workout | null
  week1Start: string
  status?: WorkoutStatus
  note?: string
  selectedFlags: PainFlag[]
  onClose: () => void
  onStatus: (status?: WorkoutStatus) => void
  onNote: (note: string) => void
  onToggleFlag: (flag: PainFlag) => void
}) {
  if (!workout) return null

  return (
    <div className="sheet-backdrop" role="presentation" onClick={onClose}>
      <article className="detail-sheet" role="dialog" aria-modal="true" aria-labelledby="detail-title" onClick={(event) => event.stopPropagation()}>
        <button className="icon-button close-button" type="button" onClick={onClose} aria-label="Close workout details">
          <X size={22} />
        </button>
        <p className="eyebrow">Week {workout.week} · {workout.dayName}</p>
        <h2 id="detail-title">{workout.name}</h2>
        <div className="meta-grid prominent">
          <span><small>Time / Distance</small>{workout.miles ? `${workout.miles} mi` : workout.duration}</span>
          <span><small>Target HR</small>{workout.targetBpm}</span>
          <span><small>Target Pace</small>{workout.targetPace}</span>
          <span><small>Zones</small><ZoneChips zones={workout.zone} /></span>
        </div>
        <ol className="step-list">
          {workout.steps.map((step, index) => <li key={`${index}-${step}`}>{step}</li>)}
        </ol>
        <p className="detail-note">{workout.notes}</p>
        <GarminCopyButton workout={workout} week1Start={week1Start} />
        <div className="button-row">
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
      </article>
    </div>
  )
}
