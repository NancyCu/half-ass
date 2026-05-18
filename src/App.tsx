import { useEffect, useState } from 'react'
import { Settings as SettingsIcon } from 'lucide-react'
import { BottomNav, type Screen } from './components/BottomNav'
import { WorkoutDetailSheet } from './components/WorkoutDetailSheet'
import { getTrainingPlanProfile, trainingPlanProfiles, type PlanId, type Workout } from './data/trainingPlan'
import { mannyZoneTargets, mannyZones, zoneTargets, zones } from './data/zones'
import { useProgress } from './hooks/useProgress'
import {
  addScheduleAdjustments,
  addScheduleAdjustment,
  readScheduleAdjustments,
  resolveAdjustedWorkoutForDate,
  undoScheduleAdjustment,
  type ScheduleAdjustment,
} from './lib/scheduleAdjustments'
import { effectiveWorkoutStatus } from './lib/workoutProgress'
import {
  cleanStrideSyncHandoffParamsFromUrl,
  clearStrideSyncHandoffHistory,
  formatStrideSyncHandoffRun,
  readStrideSyncHandoffHistory,
  readAppliedStrideSyncHandoffs,
  readStrideSyncHandoffFromSearch,
  recordStrideSyncHandoffHistory,
  rememberAppliedStrideSyncHandoff,
  type StrideSyncHandoff,
  validateStrideSyncAutoAccept,
} from './lib/strideSyncHandoff'
import { useSettings } from './hooks/useSettings'
import { Calendar } from './pages/Calendar'
import { Dashboard } from './pages/Dashboard'
import { Progress } from './pages/Progress'
import { Settings } from './pages/Settings'
import { WorkoutLibrary } from './pages/WorkoutLibrary'
import { Zones } from './pages/Zones'

function App() {
  const [screen, setScreen] = useState<Screen>('dashboard')
  const [selectedWorkoutEntry, setSelectedWorkoutEntry] = useState<SelectedWorkoutEntry | null>(null)
  const [handoffNotice, setHandoffNotice] = useState<HandoffNotice | null>(null)
  const [, setHandoffHistoryVersion] = useState(0)
  const [, setScheduleAdjustmentVersion] = useState(0)
  const { settings, updateSettings, resetSettings } = useSettings()
  const activeProfile = getTrainingPlanProfile(settings.planId)
  const activeZones = activeProfile.id === 'manny' ? mannyZones : zones
  const activeZoneTargets = activeProfile.id === 'manny' ? mannyZoneTargets : zoneTargets
  const progressApi = useProgress(activeProfile.id, activeProfile.allWorkouts)
  const scheduleAdjustments = typeof window === 'undefined'
    ? { schemaVersion: 1 as const, planId: activeProfile.id, updatedAt: new Date(0).toISOString(), adjustments: [] }
    : readScheduleAdjustments(activeProfile.id)
  const selectedResolvedWorkout = selectedWorkoutEntry?.assignedDate
    ? resolveAdjustedWorkoutForDate(activeProfile.trainingPlan, selectedWorkoutEntry.assignedDate, scheduleAdjustments, settings.week1Start)
    : null
  const selectedWorkout = selectedResolvedWorkout?.workout ?? selectedWorkoutEntry?.workout ?? null
  const selectedProgress = selectedWorkout ? progressApi.progress.workouts[selectedWorkout.id] : undefined
  const selectedStatus = effectiveWorkoutStatus(selectedProgress)
  const [handoff, setHandoff] = useState<StrideSyncHandoff | null>(() =>
    typeof window === 'undefined' ? null : readStrideSyncHandoffFromSearch(window.location.search, activeProfile.allWorkouts, settings.week1Start),
  )
  const handoffHistory = typeof window === 'undefined'
    ? []
    : readStrideSyncHandoffHistory(window.localStorage).entries

  function recordHandoffHistory(
    nextHandoff: StrideSyncHandoff,
    mode: 'auto_accept' | 'manual_confirm',
    status: 'applied' | 'dismissed' | 'rejected' | 'duplicate',
    reason?: string,
    acceptedAt = new Date().toISOString(),
  ) {
    if (typeof window === 'undefined') return
    const changed = recordStrideSyncHandoffHistory(window.localStorage, nextHandoff, {
      acceptedAt,
      mode,
      reason,
      status,
    })
    if (changed) setHandoffHistoryVersion((version) => version + 1)
  }

  useEffect(() => {
    if (!handoff || !settings.autoAcceptStrideSyncHandoffs || typeof window === 'undefined') return

    const result = validateStrideSyncAutoAccept(handoff, {
      appliedState: readAppliedStrideSyncHandoffs(window.localStorage),
      currentProgress: handoff.workout ? progressApi.progress.workouts[handoff.workout.id] : undefined,
      planId: activeProfile.id,
      week1Start: settings.week1Start,
    })

    if (result.status === 'blocked') {
      queueMicrotask(() => {
        recordHandoffHistory(handoff, 'manual_confirm', 'rejected', result.reason)
        setHandoffNotice((current) => (
          current?.title === 'StrideSync handoff needs review' && current.detail === result.reason
            ? current
            : {
                detail: result.reason,
                title: 'StrideSync handoff needs review',
                tone: 'warning',
              }
        ))
        setHandoff((current) => (
          current && current.autoAcceptBlockReason !== result.reason
            ? { ...current, autoAcceptBlockReason: result.reason }
            : current
        ))
      })
      return
    }

    queueMicrotask(() => {
      cleanStrideSyncHandoffParams()
      setHandoff(null)

      if (result.status === 'already_applied') {
        recordHandoffHistory(handoff, 'auto_accept', 'duplicate', result.reason)
        setHandoffNotice({
          detail: result.reason,
          title: 'StrideSync handoff already handled',
          tone: 'warning',
        })
        return
      }

      const appliedAt = new Date().toISOString()
      progressApi.completeFromStrideSync(result.handoff.workout!.id, {
        appliedAt,
        identity: result.handoff.identity,
        runDistance: result.handoff.runDistance,
        runDuration: result.handoff.runDuration,
        runName: result.handoff.runName,
        runSource: result.handoff.runSource,
      })
      rememberAppliedStrideSyncHandoff(window.localStorage, result.handoff, activeProfile.id, appliedAt)
      recordHandoffHistory(result.handoff, 'auto_accept', 'applied', undefined, appliedAt)
      setHandoffNotice({
        detail: formatStrideSyncHandoffRun(result.handoff),
        title: 'Auto-completed from StrideSync',
        tone: 'success',
      })
    })
  }, [
    activeProfile.id,
    handoff,
    progressApi,
    settings.autoAcceptStrideSyncHandoffs,
    settings.week1Start,
  ])

  function switchPlan(planId: PlanId) {
    updateSettings({ planId })
    setSelectedWorkoutEntry(null)
  }

  function openWorkout(workout: Workout, assignedDate?: string) {
    setSelectedWorkoutEntry({ workout, assignedDate })
  }

  function saveScheduleAdjustments(adjustments: ScheduleAdjustment[]) {
    if (adjustments.length === 0) return
    if (adjustments.length === 1) {
      addScheduleAdjustment(activeProfile.id, adjustments[0])
    } else {
      addScheduleAdjustments(activeProfile.id, adjustments)
    }
    setScheduleAdjustmentVersion((version) => version + 1)
    const focusedAdjustment = adjustments[0]
    const adjustedWorkout = activeProfile.allWorkouts.find((workout) => workout.id === focusedAdjustment.workoutId)
    if (adjustedWorkout) {
      setSelectedWorkoutEntry({ workout: adjustedWorkout, assignedDate: focusedAdjustment.assignedDate })
    }
  }

  function undoSelectedScheduleAdjustment(adjustmentId: string, assignedDate: string, workoutId: string) {
    undoScheduleAdjustment(activeProfile.id, adjustmentId)
    setScheduleAdjustmentVersion((version) => version + 1)
    const workout = activeProfile.allWorkouts.find((entry) => entry.id === workoutId)
    if (workout) {
      setSelectedWorkoutEntry({ workout, assignedDate })
    }
  }

  function clearHandoff(recordDismissed = true) {
    if (recordDismissed && handoff) {
      recordHandoffHistory(handoff, 'manual_confirm', 'dismissed')
    }
    cleanStrideSyncHandoffParams()
    setHandoff(null)
  }

  function confirmHandoff() {
    if (!handoff?.workout) return
    recordHandoffHistory(handoff, 'manual_confirm', 'applied')
    progressApi.setStatus(handoff.workout.id, 'completed')
    clearHandoff(false)
  }

  function clearAutomationHistory() {
    if (typeof window === 'undefined') return
    if (!window.confirm('Clear StrideSync automation history? Workout progress will not be changed.')) return
    clearStrideSyncHandoffHistory(window.localStorage)
    setHandoffHistoryVersion((version) => version + 1)
  }

  return (
    <div className="app-shell">
      <button className="settings-fab" type="button" onClick={() => setScreen('settings')} aria-label="Open settings">
        <SettingsIcon size={19} aria-hidden="true" />
      </button>
      {handoff ? (
        <StrideSyncHandoffPanel
          handoff={handoff}
          onConfirm={confirmHandoff}
          onDismiss={clearHandoff}
        />
      ) : null}
      {handoffNotice ? (
        <section className={`handoff-panel handoff-panel-compact ${handoffNotice.tone === 'warning' ? 'handoff-panel-warning' : ''}`} role="status" aria-live="polite">
          <p className="eyebrow">StrideSync handoff</p>
          <h2>{handoffNotice.title}</h2>
          {handoffNotice.detail ? <p>{handoffNotice.detail}</p> : null}
          <button className="secondary-button" type="button" onClick={() => setHandoffNotice(null)}>Dismiss</button>
        </section>
      ) : null}
      {screen === 'dashboard' ? (
        <Dashboard
          profile={activeProfile}
          week1Start={settings.week1Start}
          progressApi={progressApi}
          scheduleAdjustments={scheduleAdjustments}
          onOpenWorkout={openWorkout}
          planSwitcher={<PlanSwitcher activePlanId={activeProfile.id} onChange={switchPlan} />}
        />
      ) : null}
      {screen === 'calendar' ? (
        <Calendar
          profile={activeProfile}
          week1Start={settings.week1Start}
          progressApi={progressApi}
          scheduleAdjustments={scheduleAdjustments}
          onOpenWorkout={openWorkout}
        />
      ) : null}
      {screen === 'zones' ? <Zones profile={activeProfile} zones={activeZones} /> : null}
      {screen === 'library' ? <WorkoutLibrary profile={activeProfile} /> : null}
      {screen === 'progress' ? (
        <Progress profile={activeProfile} week1Start={settings.week1Start} progressApi={progressApi} onOpenWorkout={openWorkout} />
      ) : null}
      {screen === 'settings' ? (
        <Settings
          settings={settings}
          updateSettings={updateSettings}
          resetSettings={resetSettings}
          progressApi={progressApi}
          activeProfile={activeProfile}
          automationHistory={handoffHistory}
          onClearAutomationHistory={clearAutomationHistory}
          onPlanChange={switchPlan}
        />
      ) : null}
      <BottomNav active={screen} onChange={setScreen} />
      <WorkoutDetailSheet
        workout={selectedWorkout}
        week1Start={settings.week1Start}
        zoneTargets={activeZoneTargets}
        zones={activeZones}
        status={selectedStatus}
        note={selectedProgress?.note}
        modificationSummary={selectedProgress?.modification?.summary}
        selectedFlags={selectedProgress?.flags ?? []}
        selectedResolvedWorkout={selectedResolvedWorkout}
        scheduleAdjustments={scheduleAdjustments}
        basePlan={activeProfile.trainingPlan}
        planId={activeProfile.id}
        profileId={activeProfile.id}
        onClose={() => setSelectedWorkoutEntry(null)}
        onStatus={(status) => selectedWorkout && progressApi.setStatus(selectedWorkout.id, status)}
        onSaveModification={(summary) => selectedWorkout && progressApi.saveModification(selectedWorkout.id, summary)}
        onNote={(note) => selectedWorkout && progressApi.setNote(selectedWorkout.id, note)}
        onToggleFlag={(flag) => selectedWorkout && progressApi.toggleFlag(selectedWorkout.id, flag)}
        onSaveScheduleAdjustments={saveScheduleAdjustments}
        onUndoScheduleAdjustment={undoSelectedScheduleAdjustment}
      />
    </div>
  )
}

type HandoffNotice = {
  detail?: string
  title: string
  tone: 'success' | 'warning'
}

type SelectedWorkoutEntry = {
  workout: Workout
  assignedDate?: string
}

function cleanStrideSyncHandoffParams() {
  if (typeof window === 'undefined') return
  window.history.replaceState({}, '', cleanStrideSyncHandoffParamsFromUrl(window.location.href))
}

function StrideSyncHandoffPanel({
  handoff,
  onConfirm,
  onDismiss,
}: {
  handoff: StrideSyncHandoff
  onConfirm: () => void
  onDismiss: () => void
}) {
  const runDetails = [
    formatStrideSyncHandoffRun(handoff),
    handoff.runSource,
  ].filter(Boolean)

  return (
    <section className="handoff-panel" role="status" aria-live="polite">
      <p className="eyebrow">StrideSync handoff</p>
      {handoff.error ? (
        <>
          <h2>Could not match this handoff</h2>
          <p>{handoff.error}</p>
          <p className="handoff-meta">{handoff.date} · {handoff.workoutName}</p>
          <button className="secondary-button" type="button" onClick={onDismiss}>Dismiss</button>
        </>
      ) : (
        <>
          <h2>Mark {handoff.workout?.name ?? handoff.workoutName} complete from StrideSync?</h2>
          <p>
            Planned date: <strong>{handoff.date}</strong>
            {runDetails.length ? <> · Matched run: <strong>{runDetails.join(' · ')}</strong></> : null}
          </p>
          <p className="handoff-meta">
            {handoff.autoAcceptBlockReason ? `${handoff.autoAcceptBlockReason}. ` : null}
            Nothing is completed until you confirm. This updates Half_Ass local progress only.
          </p>
          <div className="button-row">
            <button className="primary-button" type="button" onClick={onConfirm}>Mark complete</button>
            <button className="secondary-button" type="button" onClick={onDismiss}>Dismiss</button>
          </div>
        </>
      )}
    </section>
  )
}

function PlanSwitcher({ activePlanId, onChange }: { activePlanId: PlanId; onChange: (planId: PlanId) => void }) {
  return (
    <div className="plan-switcher" role="group" aria-label="Training plan athlete">
      {trainingPlanProfiles.map((profile) => (
        <button
          className={profile.id === activePlanId ? 'selected' : ''}
          type="button"
          key={profile.id}
          onClick={() => onChange(profile.id)}
        >
          {profile.athleteName}
        </button>
      ))}
    </div>
  )
}

export default App
