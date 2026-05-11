import { useEffect, useState } from 'react'
import { Settings as SettingsIcon } from 'lucide-react'
import { BottomNav, type Screen } from './components/BottomNav'
import { WorkoutDetailSheet } from './components/WorkoutDetailSheet'
import { getTrainingPlanProfile, trainingPlanProfiles, type PlanId, type Workout } from './data/trainingPlan'
import { mannyZoneTargets, mannyZones, zoneTargets, zones } from './data/zones'
import { useProgress } from './hooks/useProgress'
import { effectiveWorkoutStatus } from './lib/workoutProgress'
import {
  cleanStrideSyncHandoffParamsFromUrl,
  formatStrideSyncHandoffRun,
  readAppliedStrideSyncHandoffs,
  readStrideSyncHandoffFromSearch,
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
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null)
  const [handoffNotice, setHandoffNotice] = useState<string | null>(null)
  const { settings, updateSettings, resetSettings } = useSettings()
  const activeProfile = getTrainingPlanProfile(settings.planId)
  const activeZones = activeProfile.id === 'manny' ? mannyZones : zones
  const activeZoneTargets = activeProfile.id === 'manny' ? mannyZoneTargets : zoneTargets
  const progressApi = useProgress(activeProfile.id, activeProfile.allWorkouts)
  const selectedProgress = selectedWorkout ? progressApi.progress.workouts[selectedWorkout.id] : undefined
  const selectedStatus = effectiveWorkoutStatus(selectedProgress)
  const [handoff, setHandoff] = useState<StrideSyncHandoff | null>(() =>
    typeof window === 'undefined' ? null : readStrideSyncHandoffFromSearch(window.location.search, activeProfile.allWorkouts, settings.week1Start),
  )

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
        setHandoffNotice(result.reason)
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
      setHandoffNotice(`Completed from StrideSync: ${formatStrideSyncHandoffRun(result.handoff)}`)
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
    setSelectedWorkout(null)
  }

  function clearHandoff() {
    cleanStrideSyncHandoffParams()
    setHandoff(null)
  }

  function confirmHandoff() {
    if (!handoff?.workout) return
    progressApi.setStatus(handoff.workout.id, 'completed')
    clearHandoff()
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
        <section className="handoff-panel handoff-panel-compact" role="status" aria-live="polite">
          <p className="eyebrow">StrideSync handoff</p>
          <h2>{handoffNotice}</h2>
          <button className="secondary-button" type="button" onClick={() => setHandoffNotice(null)}>Dismiss</button>
        </section>
      ) : null}
      {screen === 'dashboard' ? (
        <Dashboard
          profile={activeProfile}
          week1Start={settings.week1Start}
          progressApi={progressApi}
          onOpenWorkout={setSelectedWorkout}
          planSwitcher={<PlanSwitcher activePlanId={activeProfile.id} onChange={switchPlan} />}
        />
      ) : null}
      {screen === 'calendar' ? (
        <Calendar profile={activeProfile} week1Start={settings.week1Start} progressApi={progressApi} onOpenWorkout={setSelectedWorkout} />
      ) : null}
      {screen === 'zones' ? <Zones profile={activeProfile} zones={activeZones} /> : null}
      {screen === 'library' ? <WorkoutLibrary profile={activeProfile} /> : null}
      {screen === 'progress' ? (
        <Progress profile={activeProfile} week1Start={settings.week1Start} progressApi={progressApi} onOpenWorkout={setSelectedWorkout} />
      ) : null}
      {screen === 'settings' ? (
        <Settings
          settings={settings}
          updateSettings={updateSettings}
          resetSettings={resetSettings}
          progressApi={progressApi}
          activeProfile={activeProfile}
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
        onClose={() => setSelectedWorkout(null)}
        onStatus={(status) => selectedWorkout && progressApi.setStatus(selectedWorkout.id, status)}
        onSaveModification={(summary) => selectedWorkout && progressApi.saveModification(selectedWorkout.id, summary)}
        onNote={(note) => selectedWorkout && progressApi.setNote(selectedWorkout.id, note)}
        onToggleFlag={(flag) => selectedWorkout && progressApi.toggleFlag(selectedWorkout.id, flag)}
      />
    </div>
  )
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
