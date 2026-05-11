import { Plus, Trash2, X } from 'lucide-react'
import { useState, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import { ProgressSummary } from '../components/ProgressSummary'
import { ZoneChips } from '../components/ZoneChips'
import type { TrainingPlanProfile, WeekPlan, Workout } from '../data/trainingPlan'
import { getWorkoutLibraryEntry } from '../data/workoutLibrary'
import type { ManualRunEntry, useProgress } from '../hooks/useProgress'
import { effectiveWorkoutStatus } from '../lib/workoutProgress'
import { getMonday, parseISODate, toISODate } from '../utils/dates'
import { getCurrentWeek, getPlanTiming, getWorkoutForDate, workoutDateLabel } from '../utils/workouts'

type ProgressApi = ReturnType<typeof useProgress>

function workoutLoad(workout: Workout) {
  const durationMinutes = Number.parseFloat(workout.duration)
  return workout.miles ?? (Number.isFinite(durationMinutes) ? durationMinutes / 10 : 0)
}

function estimatedWeekMiles(workouts: Workout[]) {
  return Math.round(workouts.reduce((total, workout) => total + workoutLoad(workout), 0))
}

function formatMiles(miles: number) {
  if (!Number.isFinite(miles)) return '0'
  return miles.toFixed(miles % 1 === 0 ? 0 : 1)
}

function formatRunDate(isoDate: string) {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(parseISODate(isoDate))
}

function isDurationInput(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return true
  return /^\d+$/.test(trimmed) || /^\d{1,2}:\d{2}(?::\d{2})?$/.test(trimmed)
}

function formatDurationFromMinutes(minutes: number) {
  if (!Number.isFinite(minutes)) return ''
  const rounded = Math.round(minutes)
  const seconds = rounded % 100
  const front = Math.floor(rounded / 100)
  if (rounded >= 100 && seconds < 60 && front > 0) {
    return `${front}:${String(seconds).padStart(2, '0')}`
  }
  return `${rounded} min`
}

function formatRunDuration(run: ManualRunEntry) {
  if (run.duration) return run.duration
  if (run.durationMinutes) return formatDurationFromMinutes(run.durationMinutes)
  return ''
}

function normalizeDurationInput(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return trimmed.includes(':') ? trimmed : `${Number.parseInt(trimmed, 10)} min`
}

function normalizePaceInput(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (trimmed.includes('/') || trimmed.toLowerCase().includes('mph')) return trimmed
  return `${trimmed}/mi`
}

function manualRunMeta(run: ManualRunEntry) {
  const details = [`${formatRunDate(run.date)} · ${formatMiles(run.distanceMiles)} mi`]
  const duration = formatRunDuration(run)
  if (duration) details.push(duration)
  if (run.pace) details.push(run.pace)
  if (run.averageHr) details.push(`${run.averageHr} bpm`)
  return details.join(' · ')
}

function isWithinRange(isoDate: string, startISO: string, endISO: string) {
  return isoDate >= startISO && isoDate <= endISO
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
  profile,
  planSwitcher,
}: {
  profile: TrainingPlanProfile
  week1Start: string
  progressApi: ProgressApi
  onOpenWorkout: (workout: Workout) => void
  planSwitcher?: ReactNode
}) {
  const { allWorkouts, trainingPlan } = profile
  const [drillWeek, setDrillWeek] = useState<number | null>(null)
  const [focusedPhase, setFocusedPhase] = useState<string | null>(null)
  const [isManualRunOpen, setIsManualRunOpen] = useState(false)
  const [manualRunName, setManualRunName] = useState('Run Ledger Entry')
  const [manualRunDate, setManualRunDate] = useState(() => toISODate(new Date()))
  const [manualRunDistance, setManualRunDistance] = useState('')
  const [manualRunTime, setManualRunTime] = useState('')
  const [manualRunPace, setManualRunPace] = useState('')
  const [manualRunHr, setManualRunHr] = useState('')
  const [selectedManualRun, setSelectedManualRun] = useState<ManualRunEntry | null>(null)
  const todayWorkout = getWorkoutForDate(new Date(), week1Start, allWorkouts)
  const today = todayWorkout ?? trainingPlan[0].days[0]
  const todayISO = toISODate(new Date())
  const weekStartISO = toISODate(getMonday(new Date()))
  const isWorkoutToday = Boolean(todayWorkout)
  const currentWeek = getCurrentWeek(week1Start, trainingPlan)
  const planTiming = getPlanTiming(week1Start, trainingPlan)
  const activeWeekNumber = planTiming.state === 'active' ? planTiming.weekNumber : null
  const activePhase = focusedPhase ?? currentWeek.phase
  const todayLibrary = getWorkoutLibraryEntry(today.type)
  const todayProgress = progressApi.progress.workouts[today.id]
  const todayStatus = effectiveWorkoutStatus(todayProgress)
  const weeklyDone = currentWeek.days.filter((workout) => effectiveWorkoutStatus(progressApi.progress.workouts[workout.id]) === 'completed').length
  const weeklyMiles = estimatedWeekMiles(currentWeek.days)
  const weeklyLongRun = currentWeek.days.find((workout) => isLongWorkout(workout))
  const weeklyQuality = currentWeek.days.filter((workout) => isQualityWorkout(workout)).length
  const compactDate = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date())
  const completedWorkouts = allWorkouts.filter((workout) => effectiveWorkoutStatus(progressApi.progress.workouts[workout.id]) === 'completed')
  const completedLoad = completedWorkouts.reduce((total, workout) => total + workoutLoad(workout), 0)
  const plannedLoad = allWorkouts.reduce((total, workout) => total + workoutLoad(workout), 0)
  const currentWeekLoad = currentWeek.days.reduce((total, workout) => total + workoutLoad(workout), 0)
  const completedWeekLoad = currentWeek.days
    .filter((workout) => effectiveWorkoutStatus(progressApi.progress.workouts[workout.id]) === 'completed')
    .reduce((total, workout) => total + workoutLoad(workout), 0)
  const manualRunsThisWeek = (progressApi.progress.manualRuns ?? []).filter((run) => isWithinRange(run.date, weekStartISO, todayISO))
  const manualWeekMiles = manualRunsThisWeek.reduce((total, run) => total + run.distanceMiles, 0)
  const loggedWeekMiles = completedWeekLoad + manualWeekMiles
  const loadPercent = plannedLoad > 0 ? Math.round((completedLoad / plannedLoad) * 100) : 0
  const weeklyLoadPercent = currentWeekLoad > 0 ? Math.round((loggedWeekMiles / currentWeekLoad) * 100) : 0
  const statusCounts = {
    completed: progressApi.summary.completed,
    modified: progressApi.summary.modified,
    skipped: progressApi.summary.skipped,
  }
  const loggedTotal = statusCounts.completed + statusCounts.skipped
  const upcomingCount = Math.max(allWorkouts.length - loggedTotal, 0)
  const phaseGroups = trainingPlan.reduce<Record<string, WeekPlan[]>>((groups, week) => {
    groups[week.phase] = [...(groups[week.phase] ?? []), week]
    return groups
  }, {})
  const selectedWeek = drillWeek ? trainingPlan.find((week) => week.week === drillWeek) : null
  const activePhaseWeeks = phaseGroups[activePhase] ?? phaseGroups[currentWeek.phase] ?? []
  const distanceOrDuration = today.miles ? `${today.miles} mi` : today.duration
  const workoutTileLabel = isWorkoutToday ? `${today.dayName} · Today` : `${workoutDateLabel(today, week1Start)} · Week ${today.week}`
  const todayNote = todayProgress?.note?.trim()
  const todayFlags = todayProgress?.flags ?? []
  const circumference = 2 * Math.PI * 42
  const ringOffset = circumference - (progressApi.summary.percentage / 100) * circumference
  const manualRunError = manualRunDistance && Number.parseFloat(manualRunDistance) <= 0
    ? 'Distance needs to be above 0.'
    : !isDurationInput(manualRunTime)
      ? 'Use time like 8:49, 1:02:15, or plain minutes.'
      : ''

  function addManualRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const distanceMiles = Number.parseFloat(manualRunDistance)
    const averageHr = manualRunHr ? Math.round(Number.parseFloat(manualRunHr)) : undefined
    if (!Number.isFinite(distanceMiles) || distanceMiles <= 0 || !isDurationInput(manualRunTime)) return

    progressApi.addManualRun({
      date: isWithinRange(manualRunDate, weekStartISO, todayISO) ? manualRunDate : todayISO,
      name: manualRunName.trim() || 'Run Ledger Entry',
      distanceMiles,
      duration: normalizeDurationInput(manualRunTime),
      pace: normalizePaceInput(manualRunPace),
      averageHr: averageHr && averageHr > 0 ? averageHr : undefined,
    })
    setManualRunName('Run Ledger Entry')
    setManualRunDate(todayISO)
    setManualRunDistance('')
    setManualRunTime('')
    setManualRunPace('')
    setManualRunHr('')
    setIsManualRunOpen(false)
  }

  return (
    <main className="screen">
      <header className="dashboard-command-center">
        <img className="dashboard-banner-art" src="/tx_meltdown_banner.PNG" alt="Texas Meltdown half marathon banner" />
        <div className="dashboard-banner-status">
          <p className="eyebrow">Training dashboard</p>
          <strong>{profile.athleteName} · {compactDate}</strong>
          <span>{planTiming.headerText}</span>
        </div>
        {planSwitcher}
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
      <ProgressSummary
        summary={progressApi.summary}
        currentWeek={planTiming.summaryValue}
        currentWeekLabel={planTiming.summaryLabel}
        currentWeekTone={planTiming.state === 'active' ? todayLibrary.color : 'gray'}
        currentWeekActive={planTiming.state === 'active'}
      />
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
            <div className="progress-track" aria-hidden="true"><span style={{ width: `${Math.min(weeklyLoadPercent, 100)}%` }} /></div>
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
                  const status = effectiveWorkoutStatus(progressApi.progress.workouts[workout.id])
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
              const completed = weeks.flatMap((week) => week.days).filter((workout) => effectiveWorkoutStatus(progressApi.progress.workouts[workout.id]) === 'completed').length
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
                  const weekDone = week.days.filter((workout) => effectiveWorkoutStatus(progressApi.progress.workouts[workout.id]) === 'completed').length
                  const weekPercent = Math.round((weekDone / 7) * 100)
                  return (
                    <button className={week.week === activeWeekNumber ? 'phase-week-tile current' : 'phase-week-tile'} key={week.week} type="button" onClick={() => setDrillWeek(week.week)}>
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
      <button className={`dashboard-workout-tile ${todayLibrary.color}`} type="button" onClick={() => onOpenWorkout(today)}>
        <span className="workout-tile-topline">
          <span>{workoutTileLabel}</span>
          {todayStatus ? <em className={`status-pill ${todayStatus}`}>{todayStatus}</em> : <em>Tap for details</em>}
        </span>
        <strong>{today.name}</strong>
        <span className="workout-tile-quick-facts">
          <span>{distanceOrDuration}</span>
          <span>{today.targetBpm}</span>
        </span>
        <span className="workout-tile-goal">{todayLibrary.what}</span>
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
          <span><small>Logged</small><strong>{formatMiles(loggedWeekMiles)} mi</strong></span>
          <span><small>Planned</small><strong>{weeklyMiles} mi</strong></span>
          <span><small>Long run</small><strong>{weeklyLongRun?.miles ?? 0} mi</strong></span>
          <span><small>Quality</small><strong>{weeklyQuality}</strong></span>
        </div>
        <section className="run-ledger" aria-label="Run Ledger manual entries">
          <div className="run-ledger-header">
            <div>
              <p className="eyebrow">Run Ledger</p>
              <strong>{formatMiles(manualWeekMiles)} manual mi this week</strong>
            </div>
            <button className="icon-button run-ledger-toggle" type="button" onClick={() => setIsManualRunOpen((open) => !open)} aria-label={isManualRunOpen ? 'Close manual run form' : 'Add manual run'}>
              <Plus size={19} />
            </button>
          </div>
          {isManualRunOpen ? (
            <form className="manual-run-form" onSubmit={addManualRun}>
              <label>
                <span>Run name</span>
                <input value={manualRunName} onChange={(event) => setManualRunName(event.target.value)} />
              </label>
              <div className="manual-run-grid">
                <label>
                  <span>Date</span>
                  <input type="date" min={weekStartISO} max={todayISO} value={manualRunDate} onChange={(event) => setManualRunDate(event.target.value)} />
                </label>
                <label>
                  <span>Distance</span>
                  <input type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="3.25" value={manualRunDistance} onChange={(event) => setManualRunDistance(event.target.value)} required />
                </label>
                <label>
                  <span>Time</span>
                  <input inputMode="text" placeholder="8:49" value={manualRunTime} onChange={(event) => setManualRunTime(event.target.value)} aria-invalid={Boolean(manualRunError && !isDurationInput(manualRunTime))} />
                </label>
                <label>
                  <span>Pace (min/mi)</span>
                  <input inputMode="text" placeholder="9:45/mi" value={manualRunPace} onChange={(event) => setManualRunPace(event.target.value)} />
                </label>
                <label>
                  <span>Avg HR</span>
                  <input type="number" inputMode="numeric" min="40" max="230" step="1" placeholder="142" value={manualRunHr} onChange={(event) => setManualRunHr(event.target.value)} />
                </label>
              </div>
              {manualRunError ? <p className="form-hint danger">{manualRunError}</p> : <p className="form-hint">Counts toward logged miles from Monday through today.</p>}
              <button className="primary-button" type="submit">Add run</button>
            </form>
          ) : null}
          {manualRunsThisWeek.length ? (
            <div className="run-ledger-list">
              {manualRunsThisWeek.map((run) => (
                <article className="run-ledger-row" key={run.id}>
                  <button className="run-ledger-open" type="button" onClick={() => setSelectedManualRun(run)}>
                    <strong>{run.name}</strong>
                    <span>{manualRunMeta(run)}</span>
                  </button>
                  <button className="run-ledger-delete" type="button" onClick={() => progressApi.removeManualRun(run.id)} aria-label={`Remove ${run.name}`}>
                    <Trash2 size={16} />
                  </button>
                </article>
              ))}
            </div>
          ) : null}
        </section>
        <div className="dashboard-day-list">
          {currentWeek.days.map((workout) => {
            const status = effectiveWorkoutStatus(progressApi.progress.workouts[workout.id])
            const library = getWorkoutLibraryEntry(workout.type)
            const isTodayWorkout = isWorkoutToday && workout.id === today.id
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
      {selectedManualRun ? (
        <div className="sheet-backdrop" role="presentation" onClick={() => setSelectedManualRun(null)}>
          <section className="detail-sheet manual-run-detail-sheet" role="dialog" aria-modal="true" aria-labelledby="manual-run-detail-title" onClick={(event) => event.stopPropagation()}>
            <button className="icon-button close-button" type="button" onClick={() => setSelectedManualRun(null)} aria-label="Close manual run details">
              <X size={21} />
            </button>
            <p className="eyebrow">Run Ledger</p>
            <h2 id="manual-run-detail-title">{selectedManualRun.name}</h2>
            <div className="manual-run-detail-grid">
              <span><small>Date</small>{formatRunDate(selectedManualRun.date)}</span>
              <span><small>Distance</small>{formatMiles(selectedManualRun.distanceMiles)} mi</span>
              <span><small>Time</small>{formatRunDuration(selectedManualRun) || '-'}</span>
              <span><small>Pace</small>{selectedManualRun.pace ?? '-'}</span>
              <span><small>Avg HR</small>{selectedManualRun.averageHr ? `${selectedManualRun.averageHr} bpm` : '-'}</span>
              <span><small>Logged</small>{new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(selectedManualRun.createdAt))}</span>
            </div>
            <button
              className="danger-button"
              type="button"
              onClick={() => {
                progressApi.removeManualRun(selectedManualRun.id)
                setSelectedManualRun(null)
              }}
            >
              <Trash2 size={18} /> Delete entry
            </button>
          </section>
        </div>
      ) : null}
    </main>
  )
}
