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

function App() {
  const [screen, setScreen] = useState<Screen>('dashboard')
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null)
  const { settings, updateSettings, resetSettings } = useSettings()
  const activeProfile = getTrainingPlanProfile(settings.planId)
  const activeZones = activeProfile.id === 'manny' ? mannyZones : zones
  const activeZoneTargets = activeProfile.id === 'manny' ? mannyZoneTargets : zoneTargets
  const progressApi = useProgress(activeProfile.id, activeProfile.allWorkouts)
  const selectedProgress = selectedWorkout ? progressApi.progress.workouts[selectedWorkout.id] : undefined

  function switchPlan(planId: PlanId) {
    updateSettings({ planId })
    setSelectedWorkout(null)
  }

  return (
    <div className="app-shell">
      <button className="settings-fab" type="button" onClick={() => setScreen('settings')} aria-label="Open settings">
        <SettingsIcon size={19} aria-hidden="true" />
      </button>
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
