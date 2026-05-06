import { useState, type CSSProperties } from 'react'
import { ProgressSummary } from '../components/ProgressSummary'
import { ZoneChips } from '../components/ZoneChips'
import { allWorkouts, trainingPlan, type Workout } from '../data/trainingPlan'
import { getWorkoutLibraryEntry } from '../data/workoutLibrary'
import type { useProgress } from '../hooks/useProgress'
import { getCurrentWeek, getCurrentWeekNumber, getWorkoutForDate } from '../utils/workouts'

type ProgressApi = ReturnType<typeof useProgress>

function workoutLoad(workout: Workout) {
  const durationMinutes = Number.parseFloat(workout.duration)
  return workout.miles ?? (Number.isFinite(durationMinutes) ? durationMinutes / 10 : 0)
}

function estimatedWeekMiles(workouts: Workout[]) {
  return Math.round(workouts.reduce((total, workout) => total + workoutLoad(workout), 0))
}

function isLongWorkout(workout: Workout) {
  return workout.type.includes('long')
}

function isQualityWorkout(workout: Workout) {
  return !['foundation', 'recovery', 'rest'].includes(workout.type) && !isLongWorkout(workout)
}

function progressColor(percent: number) {
  const clamped = Math.max(0, Math.min(100, percent)) / 100
  const start = { r: 255, g: 59, b: 112 }
  const end = { r: 66, g: 247, b: 155 }
  const r = Math.round(start.r + (end.r - start.r) * clamped)
  const g = Math.round(start.g + (end.g - start.g) * clamped)
  const b = Math.round(start.b + (end.b - start.b) * clamped)
  return `rgb(${r}, ${g}, ${b})`
}

export function Dashboard({
  week1Start,
  progressApi,
  onOpenWorkout,
}: {
  week1Start: string
  progressApi: ProgressApi
  onOpenWorkout: (workout: Workout) => void
}) {
  const [drillWeek, setDrillWeek] = useState<number | null>(null)
  const [focusedPhase, setFocusedPhase] = useState<string | null>(null)
  const today = getWorkoutForDate(new Date(), week1Start) ?? trainingPlan[0].days[0]
  const currentWeek = getCurrentWeek(week1Start)
  const currentWeekNumber = getCurrentWeekNumber(week1Start)
  const activePhase = focusedPhase ?? currentWeek.phase
  const todayLibrary = getWorkoutLibraryEntry(today.type)
  const todayProgress = progressApi.progress.workouts[today.id]
  const weeklyDone = currentWeek.days.filter((workout) => progressApi.progress.workouts[workout.id]?.status === 'completed').length
  const weeklyMiles = estimatedWeekMiles(currentWeek.days)
  const weeklyLongRun = currentWeek.days.find((workout) => isLongWorkout(workout))
  const weeklyQuality = currentWeek.days.filter((workout) => isQualityWorkout(workout)).length
  const compactDate = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date())
  const completedWorkouts = allWorkouts.filter((workout) => progressApi.progress.workouts[workout.id]?.status === 'completed')
  const completedLoad = completedWorkouts.reduce((total, workout) => total + workoutLoad(workout), 0)
  const plannedLoad = allWorkouts.reduce((total, workout) => total + workoutLoad(workout), 0)
  const currentWeekLoad = currentWeek.days.reduce((total, workout) => total + workoutLoad(workout), 0)
  const completedWeekLoad = currentWeek.days
    .filter((workout) => progressApi.progress.workouts[workout.id]?.status === 'completed')
    .reduce((total, workout) => total + workoutLoad(workout), 0)
  const loadPercent = plannedLoad > 0 ? Math.round((completedLoad / plannedLoad) * 100) : 0
  const weeklyLoadPercent = currentWeekLoad > 0 ? Math.round((completedWeekLoad / currentWeekLoad) * 100) : 0
  const statusCounts = {
    completed: progressApi.summary.completed,
    modified: progressApi.summary.modified,
    skipped: progressApi.summary.skipped,
  }
  const loggedTotal = statusCounts.completed + statusCounts.modified + statusCounts.skipped
  const upcomingCount = Math.max(allWorkouts.length - loggedTotal, 0)
  const phaseGroups = trainingPlan.reduce<Record<string, typeof trainingPlan>>((groups, week) => {
    groups[week.phase] = [...(groups[week.phase] ?? []), week]
    return groups
  }, {})
  const selectedWeek = drillWeek ? trainingPlan.find((week) => week.week === drillWeek) : null
  const activePhaseWeeks = phaseGroups[activePhase] ?? phaseGroups[currentWeek.phase] ?? []
  const distanceOrDuration = today.miles ? `${today.miles} mi` : today.duration
  const todayNote = todayProgress?.note?.trim()
  const todayFlags = todayProgress?.flags ?? []
  const circumference = 2 * Math.PI * 42
  const ringOffset = circumference - (progressApi.summary.percentage / 100) * circumference

  return (
    <main className="screen">
      <header className="dashboard-command-center">
        <img className="dashboard-banner-art" src="/tx_meltdown_banner.PNG" alt="Texas Meltdown half marathon banner" />
        <div className="dashboard-banner-status">
          <p className="eyebrow">Training dashboard</p>
          <strong>{compactDate}</strong>
          <span>Week {currentWeekNumber} · {currentWeek.phase}</span>
        </div>
        <div
          className="dashboard-ring"
          style={{ '--progress-tone': progressColor(progressApi.summary.percentage) } as CSSProperties}
          aria-label={`${progressApi.summary.percentage}% complete`}
        >
          <svg viewBox="0 0 100 100" role="img" aria-hidden="true">
            <circle cx="50" cy="50" r="42" />
            <circle cx="50" cy="50" r="42" style={{ strokeDasharray: circumference, strokeDashoffset: ringOffset }} />
          </svg>
          <strong>{progressApi.summary.percentage}%</strong>
          <span>done</span>
        </div>
      </header>
      <ProgressSummary summary={progressApi.summary} currentWeek={currentWeekNumber} currentWeekTone={todayLibrary.color} />
      <section className="dashboard-analytics-panel">
        <div className="analytics-panel-header">
          <div>
            <p className="eyebrow">Status in progress</p>
            <h2>Plan analytics</h2>
          </div>
          <span className="weekly-count">{weeklyDone}/7 this week</span>
        </div>
        <div className="analytics-progress-stack">
          <div>
            <span>Weekly load</span>
            <strong>{weeklyLoadPercent}%</strong>
            <div className="progress-track" aria-hidden="true"><span style={{ width: `${weeklyLoadPercent}%` }} /></div>
          </div>
          <div>
            <span>Plan load</span>
            <strong>{loadPercent}%</strong>
            <div className="progress-track magenta" aria-hidden="true"><span style={{ width: `${loadPercent}%` }} /></div>
          </div>
        </div>
        <div className="phase-drilldown" aria-label="Phase completion drilldown">
          {selectedWeek ? (
            <article className="phase-chart-card drill-card">
              <div className="phase-card-header">
                <div>
                  <p className="eyebrow">{selectedWeek.phase}</p>
                  <h3>Week {selectedWeek.week} by day</h3>
                </div>
                <div className="chart-action-row">
                  <button className="chart-back-button" type="button" onClick={() => setDrillWeek(null)}>Back</button>
                  <button className="chart-back-button" type="button" onClick={() => { setDrillWeek(null); setFocusedPhase('all') }}>All phases</button>
                </div>
              </div>
              <div className="day-drill-chart" aria-label={`Week ${selectedWeek.week} day drilldown`}>
                {selectedWeek.days.map((workout) => {
                  const status = progressApi.progress.workouts[workout.id]?.status
                  const height = status === 'completed' ? 100 : status === 'modified' ? 72 : status === 'skipped' ? 34 : 16
                  return (
                    <button className={status ? `day-drill-bar ${status}` : 'day-drill-bar'} key={workout.id} type="button" onClick={() => onOpenWorkout(workout)}>
                      <i style={{ height: `${height}%` }} />
                      <small>{workout.dayName.slice(0, 3)}</small>
                      <span>{workout.name}</span>
                    </button>
                  )
                })}
              </div>
            </article>
          ) : focusedPhase === 'all' ? (
            Object.entries(phaseGroups).map(([phase, weeks]) => {
              const completed = weeks.flatMap((week) => week.days).filter((workout) => progressApi.progress.workouts[workout.id]?.status === 'completed').length
              const total = weeks.length * 7
              const phaseName = phase.replace(' Phase', '')
              return (
                <article className="phase-chart-card" key={phase}>
                  <div className="phase-card-header">
                    <div>
                      <p className="eyebrow">{phase}</p>
                      <h3>{weeks[0].week}-{weeks[weeks.length - 1].week}</h3>
                    </div>
                    <span>{completed}/{total}</span>
                  </div>
                  <button className="phase-focus-button" type="button" onClick={() => setFocusedPhase(phase)}>View {phaseName}</button>
                </article>
              )
            })
          ) : (
            <article className="phase-chart-card">
              <div className="phase-card-header">
                <div>
                  <p className="eyebrow">{activePhase}</p>
                  <h3>{activePhaseWeeks[0]?.week}-{activePhaseWeeks[activePhaseWeeks.length - 1]?.week}</h3>
                </div>
                <button className="chart-back-button" type="button" onClick={() => setFocusedPhase('all')}>All phases</button>
              </div>
              <div className="phase-week-grid" aria-label={`${activePhase} weekly completion chart`}>
                {activePhaseWeeks.map((week) => {
                  const weekDone = week.days.filter((workout) => progressApi.progress.workouts[workout.id]?.status === 'completed').length
                  const weekPercent = Math.round((weekDone / 7) * 100)
                  return (
                    <button className={week.week === currentWeekNumber ? 'phase-week-tile current' : 'phase-week-tile'} key={week.week} type="button" onClick={() => setDrillWeek(week.week)}>
                      <span>Week {week.week}</span>
                      <strong>{weekDone}/7</strong>
                      <i aria-hidden="true"><em style={{ width: `${weekPercent}%` }} /></i>
                    </button>
                  )
                })}
              </div>
            </article>
          )}
        </div>
        <div className="status-distribution" aria-label="Workout status distribution">
          <span className="completed" style={{ flexGrow: Math.max(statusCounts.completed, 0.25) }}>Completed {statusCounts.completed}</span>
          <span className="modified" style={{ flexGrow: Math.max(statusCounts.modified, 0.25) }}>Modified {statusCounts.modified}</span>
          <span className="skipped" style={{ flexGrow: Math.max(statusCounts.skipped, 0.25) }}>Skipped {statusCounts.skipped}</span>
          <span className="upcoming" style={{ flexGrow: Math.max(upcomingCount, 0.25) }}>Upcoming {upcomingCount}</span>
        </div>
      </section>
      <button className="dashboard-workout-tile" type="button" onClick={() => onOpenWorkout(today)}>
        <span className="workout-tile-topline">
          <span>{today.dayName} · Today</span>
          {todayProgress?.status ? <em className={`status-pill ${todayProgress.status}`}>{todayProgress.status}</em> : <em>Tap for details</em>}
        </span>
        <strong>{today.name}</strong>
        <span className="workout-tile-quick-facts">
          <span>{distanceOrDuration}</span>
          <span>{today.targetBpm}</span>
        </span>
        {todayNote || todayFlags.length ? (
          <span className="workout-tile-notes compact">
            {todayNote ? <span>{todayNote}</span> : null}
            {todayFlags.length ? <span>{todayFlags.join(' · ')}</span> : null}
          </span>
        ) : null}
      </button>
      <section className="dashboard-week-strip lively-week-card" aria-label="This week at a glance">
        <div className="analytics-panel-header">
          <div>
            <p className="eyebrow">{currentWeek.phase}</p>
            <h2>Week {currentWeek.week}</h2>
          </div>
          <span className="mini-progress">{weeklyDone}/7 done</span>
        </div>
        <div className="block-summary-strip" aria-label={`Week ${currentWeek.week} summary`}>
          <span><small>Miles</small><strong>{weeklyMiles}</strong></span>
          <span><small>Long run</small><strong>{weeklyLongRun?.miles ?? 0} mi</strong></span>
          <span><small>Quality</small><strong>{weeklyQuality}</strong></span>
        </div>
        <div className="dashboard-day-list">
          {currentWeek.days.map((workout) => {
            const status = progressApi.progress.workouts[workout.id]?.status
            const library = getWorkoutLibraryEntry(workout.type)
            const isTodayWorkout = workout.id === today.id
            return (
              <button className={`dashboard-day-row ${library.color} ${status ?? ''} ${isTodayWorkout ? 'today-workout' : ''}`} key={workout.id} type="button" onClick={() => onOpenWorkout(workout)}>
                <span className="dashboard-day-date">{workout.dayName.slice(0, 3)}</span>
                <strong>{workout.name}</strong>
                <span className="dashboard-day-duration">{workout.miles ? `${workout.miles} mi` : workout.duration}</span>
                <ZoneChips zones={workout.zone} compact />
                {isTodayWorkout ? <span className="today-workout-badge">Today</span> : null}
                {status ? <em className={`status-dot ${status}`} aria-label={status} /> : null}
              </button>
            )
          })}
        </div>
      </section>
    </main>
  )
}
