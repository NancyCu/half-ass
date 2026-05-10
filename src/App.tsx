import { useState } from 'react'
import { Settings as SettingsIcon } from 'lucide-react'
import { BottomNav, type Screen } from './components/BottomNav'
import { WorkoutDetailSheet } from './components/WorkoutDetailSheet'
import { getTrainingPlanProfile, trainingPlanProfiles, type PlanId, type Workout } from './data/trainingPlan'
import { mannyZoneTargets, mannyZones, zoneTargets, zones } from './data/zones'
import { useProgress } from './hooks/useProgress'
import { useSettings } from './hooks/useSettings'
import { Calendar } from './pages/Calendar'
import { Dashboard } from './pages/Dashboard'
import { Progress } from './pages/Progress'
import { Settings } from './pages/Settings'
import { WorkoutLibrary } from './pages/WorkoutLibrary'
import { Zones } from './pages/Zones'
import { parseISODate } from './utils/dates'
import { getWorkoutForDate } from './utils/workouts'

type StrideSyncHandoff = {
  date: string
  error?: string
  runDistance?: string
  runDuration?: string
  runName?: string
  source?: string
  workout: Workout | null
  workoutName: string
}

function App() {
  const [screen, setScreen] = useState<Screen>('dashboard')
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null)
  const { settings, updateSettings, resetSettings } = useSettings()
  const activeProfile = getTrainingPlanProfile(settings.planId)
  const activeZones = activeProfile.id === 'manny' ? mannyZones : zones
  const activeZoneTargets = activeProfile.id === 'manny' ? mannyZoneTargets : zoneTargets
  const progressApi = useProgress(activeProfile.id, activeProfile.allWorkouts)
  const selectedProgress = selectedWorkout ? progressApi.progress.workouts[selectedWorkout.id] : undefined
  const [handoff, setHandoff] = useState<StrideSyncHandoff | null>(() =>
    readStrideSyncHandoff(activeProfile.allWorkouts, settings.week1Start),
  )

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
        status={selectedProgress?.status}
        note={selectedProgress?.note}
        selectedFlags={selectedProgress?.flags ?? []}
        onClose={() => setSelectedWorkout(null)}
        onStatus={(status) => selectedWorkout && progressApi.setStatus(selectedWorkout.id, status)}
        onNote={(note) => selectedWorkout && progressApi.setNote(selectedWorkout.id, note)}
        onToggleFlag={(flag) => selectedWorkout && progressApi.toggleFlag(selectedWorkout.id, flag)}
      />
    </div>
  )
}

function readStrideSyncHandoff(workouts: Workout[], week1Start: string): StrideSyncHandoff | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  if (params.get('source') !== 'stridesync' || params.get('action') !== 'completeWorkout') return null

  const date = params.get('date') ?? ''
  const workoutName = params.get('workoutName') ?? 'Workout'
  const workout = date ? getWorkoutForDate(parseISODate(date), week1Start, workouts) : null
  const namesMatch = !workout || !workoutName || normalizeName(workout.name) === normalizeName(workoutName)

  return {
    date,
    error: workout && namesMatch ? undefined : 'Could not match this handoff to a planned workout.',
    runDistance: params.get('runDistance') ?? undefined,
    runDuration: params.get('runDuration') ?? undefined,
    runName: params.get('runName') ?? undefined,
    source: params.get('runSource') ?? undefined,
    workout: workout && namesMatch ? workout : null,
    workoutName,
  }
}

function cleanStrideSyncHandoffParams() {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  for (const key of ['source', 'action', 'date', 'workoutId', 'workoutName', 'runName', 'runDistance', 'runDuration', 'runSource']) {
    url.searchParams.delete(key)
  }
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
}

function normalizeName(value: string) {
  return value.trim().toLowerCase()
}

function formatOptionalMiles(value?: string) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? `${numericValue.toFixed(2)} mi` : null
}

function formatOptionalMinutes(value?: string) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? `${Math.round(numericValue)} min` : null
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
    handoff.runName,
    formatOptionalMiles(handoff.runDistance),
    formatOptionalMinutes(handoff.runDuration),
    handoff.source,
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
          <p className="handoff-meta">Nothing is completed until you confirm. This updates Half_Ass local progress only.</p>
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
