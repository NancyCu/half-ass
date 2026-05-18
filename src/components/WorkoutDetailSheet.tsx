import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import type { WeekPlan, Workout } from '../data/trainingPlan'
import type { Zone } from '../data/zones'
import type { PainFlag, WorkoutStatus } from '../hooks/useProgress'
import {
  evaluateScheduleAdjustment,
  evaluateScheduleSwap,
  getSmartScheduleRecommendation,
  getSwapTargetWorkout,
  resolveAdjustedWorkoutForDate,
  type CrossTrainingType,
  type ResolvedAdjustedWorkout,
  type ScheduleAdjustment,
  type ScheduleAdjustmentState,
  type ScheduleGuardrailResult,
} from '../lib/scheduleAdjustments'
import { toISODate } from '../utils/dates'
import { getWorkoutSegments, workoutISO } from '../utils/workouts'
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

const crossTrainingOptions: Array<{ value: CrossTrainingType; label: string }> = [
  { value: 'cycling', label: 'Bike' },
  { value: 'elliptical', label: 'Elliptical' },
  { value: 'walking', label: 'Walk' },
  { value: 'other', label: 'Other' },
]

const scheduleAdjustmentReasons = [
  { value: '', label: 'No reason selected' },
  { value: 'Busy / life happened', label: 'Busy / life happened' },
  { value: 'Sore / minor injury', label: 'Sore / minor injury' },
  { value: 'Weather', label: 'Weather' },
  { value: 'Travel', label: 'Travel' },
  { value: 'Tired / poor sleep', label: 'Tired / poor sleep' },
  { value: 'Other', label: 'Other' },
] as const

function createAdjustmentId(action: string, workoutId: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${action}-${workoutId}-${Date.now()}`
}

function todayISO() {
  return toISODate(new Date())
}

function guardrailLabel(result: { severity: ScheduleGuardrailResult['severity'] }) {
  if (result.severity === 'blocked') return 'Blocked'
  if (result.severity === 'caution') return 'Caution'
  return 'Safe'
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
  selectedResolvedWorkout,
  scheduleAdjustments,
  basePlan,
  planId,
  profileId,
  onClose,
  onStatus,
  onSaveModification,
  onNote,
  onToggleFlag,
  onSaveScheduleAdjustments,
  onUndoScheduleAdjustment,
}: {
  workout: Workout | null
  week1Start: string
  zoneTargets: Record<string, { bpm: string; pace: string; reminder: string }>
  zones: Zone[]
  status?: WorkoutStatus
  note?: string
  modificationSummary?: string
  selectedFlags: PainFlag[]
  selectedResolvedWorkout: ResolvedAdjustedWorkout | null
  scheduleAdjustments: ScheduleAdjustmentState
  basePlan: WeekPlan[]
  planId: string
  profileId: string
  onClose: () => void
  onStatus: (status?: WorkoutStatus) => void
  onSaveModification: (summary: string) => void
  onNote: (note: string) => void
  onToggleFlag: (flag: PainFlag) => void
  onSaveScheduleAdjustments: (adjustments: ScheduleAdjustment[]) => void
  onUndoScheduleAdjustment: (adjustmentId: string, assignedDate: string, workoutId: string) => void
}) {
  const [introIndex, setIntroIndex] = useState<number | null>(null)
  const [introDone, setIntroDone] = useState(false)
  const [isModifyOpen, setIsModifyOpen] = useState(false)
  const [isMoveOpen, setIsMoveOpen] = useState(false)
  const [modificationDraft, setModificationDraft] = useState('')
  const [moveDate, setMoveDate] = useState('')
  const [moveResult, setMoveResult] = useState<ScheduleGuardrailResult | null>(null)
  const [crossTrainingType, setCrossTrainingType] = useState<CrossTrainingType>('cycling')
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null)
  const [selectedReason, setSelectedReason] = useState<string>('')

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
      setIsMoveOpen(false)
      setMoveResult(null)
      setSelectedReason('')
    })
  }, [modificationSummary, workout?.id])

  const smartRecommendation = useMemo(() => {
    if (!workout) {
      return {
        severity: 'safe' as const,
        title: 'Smart recommendation',
        summary: 'Stay on the current plan.',
        recommendation: 'Stay on the current plan.',
        warnings: [],
        missedDays: 0,
      }
    }

    return getSmartScheduleRecommendation(basePlan, workout, selectedResolvedWorkout?.assignedDate ?? workoutISO(workout, week1Start), scheduleAdjustments, {
      todayISO: todayISO(),
      reason: selectedReason,
      week1StartISO: week1Start,
    })
  }, [basePlan, scheduleAdjustments, selectedReason, selectedResolvedWorkout?.assignedDate, week1Start, workout])

  if (!workout) return null

  const activeWorkout = workout
  const originalDate = selectedResolvedWorkout?.originalDate ?? workoutISO(activeWorkout, week1Start)
  const assignedDate = selectedResolvedWorkout?.assignedDate ?? originalDate
  const activeAdjustment = selectedResolvedWorkout?.adjustment?.status === 'active' ? selectedResolvedWorkout.adjustment : null
  const scheduleLabel = selectedResolvedWorkout?.isSkipped
    ? 'Skipped'
    : selectedResolvedWorkout?.isCrossTraining
      ? 'Cross-training substitute'
      : activeAdjustment?.action === 'swapped'
        ? `Swapped from ${activeAdjustment.originalDate}`
      : activeAdjustment?.action === 'moved'
        ? `Moved from ${activeAdjustment.originalDate}`
        : activeAdjustment
          ? 'Adjusted'
          : 'Original plan'
  const occupiedTargetWorkout = moveDate
    ? getSwapTargetWorkout(basePlan, moveDate, scheduleAdjustments, week1Start)
    : null
  const swapTargetWorkout = occupiedTargetWorkout && occupiedTargetWorkout.id !== activeWorkout.id ? occupiedTargetWorkout : null

  function makeAdjustment(action: ScheduleAdjustment['action'], nextAssignedDate = assignedDate, extra: Partial<ScheduleAdjustment> = {}): ScheduleAdjustment {
    const now = new Date().toISOString()
    return {
      id: createAdjustmentId(action, activeWorkout.id),
      planId,
      profileId,
      workoutId: activeWorkout.id,
      originalDate,
      assignedDate: nextAssignedDate,
      action,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      source: 'user',
      guardrailWarnings: [],
      reason: selectedReason || undefined,
      ...extra,
    }
  }

  function saveSkip() {
    const message = smartRecommendation.missedDays > 0
      ? `${smartRecommendation.summary}\n\nSkip this workout and continue from today? This will not count as completed.`
      : 'Skip this workout? This will not count as completed.'
    if (!window.confirm(message)) return
    onSaveScheduleAdjustments([makeAdjustment('skipped', assignedDate, { reason: selectedReason || 'User skipped workout' })])
  }

  function previewMove(nextDate: string) {
    setMoveDate(nextDate)
    if (!nextDate) {
      setMoveResult(null)
      return
    }
    const moveCandidate = makeAdjustment('moved', nextDate)
    const targetWorkout = getSwapTargetWorkout(basePlan, nextDate, scheduleAdjustments, week1Start)
    if (targetWorkout && targetWorkout.id !== activeWorkout.id) {
      const targetResolved = resolveAdjustedWorkoutForDate(basePlan, nextDate, scheduleAdjustments, week1Start)
      const swapGroupId = createAdjustmentId('swap-group', activeWorkout.id)
      const selectedSwap = makeAdjustment('swapped', nextDate, {
        swapGroupId,
        swapWithWorkoutId: targetWorkout.id,
        reason: 'User swapped workouts',
      })
      const targetSwap: ScheduleAdjustment = {
        id: createAdjustmentId('swapped', targetWorkout.id),
        planId,
        profileId,
        workoutId: targetWorkout.id,
        originalDate: targetResolved.originalDate ?? nextDate,
        assignedDate,
        action: 'swapped',
        status: 'active',
        createdAt: selectedSwap.createdAt,
        updatedAt: selectedSwap.updatedAt,
        source: 'user',
        guardrailWarnings: [],
        swapWithWorkoutId: activeWorkout.id,
        swapGroupId,
        reason: selectedReason || 'User swapped workouts',
      }
      setMoveResult(evaluateScheduleSwap(basePlan, selectedSwap, targetSwap, scheduleAdjustments, week1Start))
      return
    }
    setMoveResult(evaluateScheduleAdjustment(basePlan, moveCandidate, scheduleAdjustments, week1Start))
  }

  function saveMove() {
    if (!moveDate || !moveResult) return
    if (!moveResult.allowed) return
    if (swapTargetWorkout) {
      const targetResolved = resolveAdjustedWorkoutForDate(basePlan, moveDate, scheduleAdjustments, week1Start)
      const now = new Date().toISOString()
      const swapGroupId = createAdjustmentId('swap-group', activeWorkout.id)
      const selectedSwap = makeAdjustment('swapped', moveDate, {
        createdAt: now,
        updatedAt: now,
        guardrailWarnings: moveResult.warnings,
        reason: selectedReason || 'User swapped workouts',
        swapGroupId,
        swapWithWorkoutId: swapTargetWorkout.id,
      })
      const targetSwap: ScheduleAdjustment = {
        id: createAdjustmentId('swapped', swapTargetWorkout.id),
        planId,
        profileId,
        workoutId: swapTargetWorkout.id,
        originalDate: targetResolved.originalDate ?? moveDate,
        assignedDate,
        action: 'swapped',
        status: 'active',
        createdAt: now,
        updatedAt: now,
        source: 'user',
        guardrailWarnings: moveResult.warnings,
        reason: selectedReason || 'User swapped workouts',
        swapWithWorkoutId: activeWorkout.id,
        swapGroupId,
      }
      const message = moveResult.severity === 'caution'
        ? `${moveResult.recommendation}\n\n${moveResult.warnings.join('\n')}\n\nSwap anyway with ${swapTargetWorkout.name} on ${moveDate}?`
        : `${moveResult.recommendation}\n\nSwap this workout with ${swapTargetWorkout.name} on ${moveDate}?`
      if (!window.confirm(message)) return
      onSaveScheduleAdjustments([selectedSwap, targetSwap])
      setIsMoveOpen(false)
      return
    }
    const message = moveResult.severity === 'caution'
      ? `${moveResult.recommendation}\n\n${moveResult.warnings.join('\n')}\n\nMove anyway to ${moveDate}?`
      : `${moveResult.recommendation}\n\nMove this workout to ${moveDate}?`
    if (!window.confirm(message)) return
    onSaveScheduleAdjustments([makeAdjustment('moved', moveDate, { guardrailWarnings: moveResult.warnings })])
    setIsMoveOpen(false)
  }

  function saveCrossTraining() {
    if (!window.confirm('Replace this run with a cross-training substitute? Use this for soreness or minor injury. Completion still stays manual.')) return
    onSaveScheduleAdjustments([makeAdjustment('cross_train', assignedDate, {
      crossTrainingType,
      reason: selectedReason || 'User selected cross-training substitute',
    })])
  }

  function undoAdjustment() {
    if (!activeAdjustment) return
    const warning = status === 'completed'
      ? 'This workout has completion data. Undoing the schedule adjustment will not delete completion records. Continue?'
      : 'Undo this schedule adjustment?'
    if (!window.confirm(warning)) return
    onUndoScheduleAdjustment(activeAdjustment.id, activeAdjustment.originalDate, activeAdjustment.workoutId)
  }

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
        <div className="schedule-summary-row" aria-label="Schedule assignment">
          <span className={`schedule-pill ${selectedResolvedWorkout?.isSkipped ? 'skipped' : selectedResolvedWorkout?.isCrossTraining ? 'cross-train' : activeAdjustment?.action === 'swapped' ? 'swapped' : activeAdjustment ? 'moved' : 'safe'}`}>
            {scheduleLabel}
          </span>
          <span>{assignedDate}</span>
        </div>
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
        <section className="schedule-adjustment-panel" aria-label="Schedule adjustment">
          <div className="schedule-adjustment-header">
            <div>
              <p className="eyebrow">Schedule adjustment</p>
              <strong>{activeAdjustment ? 'Active overlay' : 'Original schedule'}</strong>
            </div>
            {activeAdjustment ? <button className="secondary-button schedule-undo-button" type="button" onClick={undoAdjustment}>Undo adjustment</button> : null}
          </div>
          <div className="button-row compact schedule-action-row">
            <button type="button" onClick={saveSkip}>Skip</button>
            <button
              type="button"
              onClick={() => {
                const initialDate = assignedDate || originalDate || todayISO()
                setIsMoveOpen((open) => !open)
                previewMove(initialDate)
              }}
            >
              Move
            </button>
            <button type="button" onClick={saveCrossTraining}>Cross-train</button>
          </div>
          <section className={`schedule-guidance-panel ${smartRecommendation.severity}`} aria-label="Smart recommendation">
            <div className="schedule-guidance-heading">
              <div>
                <p className="eyebrow">Smart recommendation</p>
                <strong>{smartRecommendation.summary}</strong>
              </div>
              <span className={`schedule-pill ${smartRecommendation.severity}`}>{guardrailLabel(smartRecommendation)}</span>
            </div>
            <p>{smartRecommendation.recommendation}</p>
            {smartRecommendation.warnings.length > 0 ? (
              <ul className="schedule-guidance-list">
                {smartRecommendation.warnings.slice(0, 3).map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            ) : null}
          </section>
          <label className="schedule-reason-select">
            <span>Adjustment reason</span>
            <select
              aria-label="Adjustment reason"
              value={selectedReason}
              onChange={(event) => {
                const nextReason = event.target.value
                setSelectedReason(nextReason)
                if (isMoveOpen && moveDate) {
                  queueMicrotask(() => previewMove(moveDate))
                }
              }}
            >
              {scheduleAdjustmentReasons.map((option) => <option key={option.value || 'none'} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="schedule-cross-train-select">
            <span>Cross-training type</span>
            <select aria-label="Cross-training type" value={crossTrainingType} onChange={(event) => setCrossTrainingType(event.target.value as CrossTrainingType)}>
              {crossTrainingOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <p className="schedule-helper-copy">
            Use cross-training for soreness or minor injury. Keep the same duration and zones when possible. Bike or elliptical work best. Cross-training does not automatically complete the workout.
          </p>
          {isMoveOpen ? (
            <div className="schedule-move-panel">
              <label>
                <span>Move to date</span>
                <input type="date" value={moveDate} onChange={(event) => previewMove(event.target.value)} />
              </label>
              {moveResult ? (
                <div className={`guardrail-result ${moveResult.severity}`}>
                  <strong>{moveResult.warnings[0] ?? `${guardrailLabel(moveResult)}: ${moveResult.recommendation}`}</strong>
                  {moveResult.recommendation && moveResult.recommendation !== moveResult.warnings[0] ? <p>{moveResult.recommendation}</p> : null}
                </div>
              ) : null}
              {swapTargetWorkout ? (
                <p className="schedule-occupied-note">
                  <strong>Occupied by:</strong> {swapTargetWorkout.name}. Swap instead?
                </p>
              ) : null}
              {moveResult?.severity === 'blocked' ? (
                <div className="schedule-safer-options" aria-label="Safer options">
                  <strong>Safer options</strong>
                  {moveResult.saferDateSuggestions?.length ? (
                    <div className="schedule-safer-option-list">
                      {moveResult.saferDateSuggestions.map((suggestion) => (
                        <button
                          key={`${suggestion.action}-${suggestion.date}`}
                          className="secondary-button"
                          type="button"
                          onClick={() => previewMove(suggestion.date)}
                        >
                          Try {suggestion.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p>Try another easy or rest day, or skip and continue today.</p>
                  )}
                  {moveResult.saferDateSuggestions?.length ? (
                    <ul className="schedule-guidance-list compact">
                      {moveResult.saferDateSuggestions.map((suggestion) => <li key={`why-${suggestion.action}-${suggestion.date}`}>{suggestion.label}: {suggestion.reason}</li>)}
                    </ul>
                  ) : null}
                </div>
              ) : null}
              <button className="primary-button" type="button" disabled={!moveResult?.allowed || moveDate === assignedDate} onClick={saveMove}>
                {swapTargetWorkout ? 'Swap workouts' : 'Save move'}
              </button>
            </div>
          ) : null}
        </section>
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
