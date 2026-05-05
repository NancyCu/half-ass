import { useState } from 'react'
import { BottomNav, type Screen } from './components/BottomNav'
import { WorkoutDetailSheet } from './components/WorkoutDetailSheet'
import type { Workout } from './data/trainingPlan'
import { useProgress } from './hooks/useProgress'
import { useSettings } from './hooks/useSettings'
import { Dashboard } from './pages/Dashboard'
import { Month } from './pages/Month'
import { Plan } from './pages/Plan'
import { Progress } from './pages/Progress'
import { Settings } from './pages/Settings'
import { WorkoutLibrary } from './pages/WorkoutLibrary'
import { Zones } from './pages/Zones'

function App() {
  const [screen, setScreen] = useState<Screen>('dashboard')
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null)
  const progressApi = useProgress()
  const { settings, updateSettings, resetSettings } = useSettings()
  const selectedProgress = selectedWorkout ? progressApi.progress.workouts[selectedWorkout.id] : undefined

  return (
    <div className="app-shell">
      {screen === 'dashboard' ? (
        <Dashboard week1Start={settings.week1Start} progressApi={progressApi} onOpenWorkout={setSelectedWorkout} />
      ) : null}
      {screen === 'plan' ? (
        <Plan week1Start={settings.week1Start} progressApi={progressApi} onOpenWorkout={setSelectedWorkout} />
      ) : null}
      {screen === 'month' ? (
        <Month week1Start={settings.week1Start} progressApi={progressApi} onOpenWorkout={setSelectedWorkout} />
      ) : null}
      {screen === 'zones' ? <Zones /> : null}
      {screen === 'library' ? <WorkoutLibrary /> : null}
      {screen === 'progress' ? (
        <Progress week1Start={settings.week1Start} progressApi={progressApi} onOpenWorkout={setSelectedWorkout} />
      ) : null}
      {screen === 'settings' ? (
        <Settings settings={settings} updateSettings={updateSettings} resetSettings={resetSettings} progressApi={progressApi} />
      ) : null}
      <BottomNav active={screen} onChange={setScreen} />
      <WorkoutDetailSheet
        workout={selectedWorkout}
        week1Start={settings.week1Start}
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

export default App
