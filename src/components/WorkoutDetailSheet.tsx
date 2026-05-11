import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import type { Workout } from '../data/trainingPlan'
import type { Zone } from '../data/zones'
import type { PainFlag, WorkoutStatus } from '../hooks/useProgress'
import { getWorkoutSegments } from '../utils/workouts'
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
  zoneTargets,
  zones,
  status,
  note,
  modificationSummary,
  selectedFlags,
  onClose,
  onStatus,
  onSaveModification,
  onNote,
  onToggleFlag,
}: {
  workout: Workout | null
  week1Start: string
  zoneTargets: Record<string, { bpm: string; pace: string; reminder: string }>
  zones: Zone[]
  status?: WorkoutStatus
  note?: string
  modificationSummary?: string
  selectedFlags: PainFlag[]
  onClose: () => void
  onStatus: (status?: WorkoutStatus) => void
  onSaveModification: (summary: string) => void
  onNote: (note: string) => void
  onToggleFlag: (flag: PainFlag) => void
}) {
  const [introIndex, setIntroIndex] = useState<number | null>(null)
  const [introDone, setIntroDone] = useState(false)
  const [isModifyOpen, setIsModifyOpen] = useState(false)
  const [modificationDraft, setModificationDraft] = useState('')
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null)

  const segments = useMemo(() => (workout ? getWorkoutSegments(workout, zoneTargets, zones) : []), [workout, zoneTargets, zones])

  useEffect(() => {
    const reset = window.setTimeout(() => {
      setSelectedSegment(null)
      setIntroIndex(segments.length > 0 ? 0 : null)
      setIntroDone(segments.length === 0)
    }, 0)

    if (!workout || segments.length === 0) {
      return () => window.clearTimeout(reset)
    }

    let nextIndex = 0
    const interval = window.setInterval(() => {
      nextIndex += 1
      if (nextIndex >= segments.length) {
        window.clearInterval(interval)
        setIntroIndex(null)
        setIntroDone(true)
        return
      }
      setIntroIndex(nextIndex)
    }, 2000)

    return () => {
      window.clearTimeout(reset)
      window.clearInterval(interval)
    }
  }, [workout, segments.length])

  useEffect(() => {
    if (selectedSegment === null) return

    const timeout = window.setTimeout(() => setSelectedSegment(null), 10000)
    return () => window.clearTimeout(timeout)
  }, [selectedSegment])

  useEffect(() => {
    queueMicrotask(() => {
      setIsModifyOpen(false)
      setModificationDraft(modificationSummary ?? '')
    })
  }, [modificationSummary, workout?.id])

  if (!workout) return null

  const activeSegmentIndex = selectedSegment ?? introIndex
  const activeSegment = activeSegmentIndex === null ? null : segments[activeSegmentIndex]
  const displayedTargetBpm = activeSegment?.targetBpm ?? workout.targetBpm
  const displayedTargetPace = activeSegment?.targetPace ?? workout.targetPace
  const zoneClass = (zone: string) => zone.match(/Z[1-5]/)?.[0].toLowerCase() ?? 'z2'
  const activeTargetClass = activeSegment ? `target-sync active ${zoneClass(activeSegment.zone)}` : 'target-sync'
  const hasModificationDiff = modificationDraft.trim() !== (modificationSummary ?? '').trim()

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
          <span className={activeTargetClass}><small>Target HR</small>{displayedTargetBpm}</span>
          <span className={activeTargetClass}><small>Target Pace</small>{displayedTargetPace}</span>
          <span><small>Zones</small><ZoneChips zones={workout.zone} /></span>
        </div>
        <ol className="step-list interactive">
          {segments.map((segment, index) => {
            const isIntroActive = introIndex === index
            const isSelected = selectedSegment === index
            const isActive = activeSegmentIndex === index
            return (
              <li
                className={`${zoneClass(segment.zone)} ${isActive ? 'active' : ''} ${isIntroActive ? 'intro-pulse' : ''} ${isSelected ? 'selected' : ''}`}
                key={`${index}-${segment.step}`}
              >
                <button
                  type="button"
                  disabled={!introDone}
                  onClick={() => setSelectedSegment(index)}
                  aria-pressed={isSelected}
                >
                  <span>{segment.step}</span>
                  <em>{segment.targetBpm} · {segment.targetPace}</em>
                </button>
              </li>
            )
          })}
        </ol>
        <p className="detail-note">{workout.notes}</p>
        <GarminCopyButton workout={workout} week1Start={week1Start} />
        <div className="button-row">
          <button className="primary-button" type="button" onClick={() => onStatus(status === 'completed' ? undefined : 'completed')}>
            {status === 'completed' ? 'Undo Complete' : 'Complete Workout'}
          </button>
          <button className="secondary-button" type="button" onClick={() => onStatus('skipped')}>Skip</button>
          <button className="secondary-button" type="button" onClick={() => setIsModifyOpen(true)}>Modify</button>
        </div>
        {isModifyOpen ? (
          <section className="modify-panel" aria-label="Workout modification">
            <label className="note-field">
              <span>Modification saved to this workout</span>
              <textarea
                value={modificationDraft}
                onChange={(event) => setModificationDraft(event.target.value)}
                placeholder="What did you actually change? Example: swapped for 30 min bike, shortened to 25 min easy run."
              />
            </label>
            <div className="button-row compact">
              <button
                className="primary-button"
                type="button"
                disabled={!modificationDraft.trim() || !hasModificationDiff}
                onClick={() => {
                  if (!modificationDraft.trim() || !hasModificationDiff) return
                  onSaveModification(modificationDraft)
                  setIsModifyOpen(false)
                }}
              >
                Save modification
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  setModificationDraft(modificationSummary ?? '')
                  setIsModifyOpen(false)
                }}
              >
                Cancel
              </button>
            </div>
          </section>
        ) : null}
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
