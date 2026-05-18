import { ChevronLeft, ChevronRight, LocateFixed } from 'lucide-react'
import { useMemo, useState } from 'react'
import { WeekCard } from '../components/WeekCard'
import { ZoneChips } from '../components/ZoneChips'
import type { TrainingPlanProfile, WeekPlan, Workout } from '../data/trainingPlan'
import { getWorkoutLibraryEntry } from '../data/workoutLibrary'
import type { useProgress } from '../hooks/useProgress'
import {
  resolveAdjustedWorkoutForDate,
  type ResolvedAdjustedWorkout,
  type ScheduleAdjustmentState,
} from '../lib/scheduleAdjustments'
import { effectiveWorkoutStatus } from '../lib/workoutProgress'
import { addDays, daysBetween, parseISODate, toISODate } from '../utils/dates'
import { getCurrentWeekNumber, getPrePlanWorkoutForDate } from '../utils/workouts'

type ProgressApi = ReturnType<typeof useProgress>
type CalendarMode = 'week' | 'month' | 'block' | 'full'

type CalendarDay = {
  date: Date
  iso: string
  workout: Workout | null
  resolved: ResolvedAdjustedWorkout | null
  inTrainingRange: boolean
  isToday: boolean
}

const weekDayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function monthKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}`
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(date)
}

function buildMonthDays(monthDate: Date, week1Start: string, profile: TrainingPlanProfile, adjustments: ScheduleAdjustmentState): CalendarDay[] {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const firstGridDate = addDays(firstOfMonth, -((firstOfMonth.getDay() + 6) % 7))
  const firstPlanDate = parseISODate(week1Start)
  const { allWorkouts, trainingPlan } = profile
  const lastPlanDate = addDays(firstPlanDate, allWorkouts.length - 1)
  const todayISO = toISODate(new Date())

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(firstGridDate, index)
    const iso = toISODate(date)
    const prePlanWorkout = getPrePlanWorkoutForDate(date, allWorkouts)
    const resolved = prePlanWorkout ? null : resolveAdjustedWorkoutForDate(trainingPlan, iso, adjustments, week1Start)
    const workout = prePlanWorkout ?? resolved?.workout ?? null
    return {
      date,
      iso,
      workout,
      resolved,
      inTrainingRange: Boolean(workout) || Boolean(prePlanWorkout) || (daysBetween(firstPlanDate, date) >= 0 && daysBetween(date, lastPlanDate) >= 0),
      isToday: iso === todayISO,
    }
  })
}

function phaseClass(week: WeekPlan) {
  if (week.label === 'Race Week') return 'race-week'
  if (week.label === 'Recovery Week') return 'recovery-week'
  if (week.label === 'Taper Week') return 'taper-week'
  if (week.phase.toLowerCase().includes('peak')) return 'peak-week'
  return 'base-week'
}

const timedRunPaceEstimate: Partial<Record<Workout['type'], number>> = {
  foundation: 11.1,
  recovery: 12.5,
  'fast-finish': 10.3,
  tempo: 9.6,
  cruise: 9.6,
  hills: 10.8,
  'short-interval': 10.6,
  'long-interval': 9.8,
  'mixed-interval': 9.4,
}

function estimatedWorkoutMiles(workout: Workout) {
  if (workout.miles) return workout.miles

  const minutes = Number.parseInt(workout.duration, 10)
  const pace = timedRunPaceEstimate[workout.type]
  return Number.isFinite(minutes) && pace ? minutes / pace : 0
}

function weekMiles(week: WeekPlan) {
  return Math.round(week.days.reduce((sum, workout) => sum + estimatedWorkoutMiles(workout), 0))
}

function keyWorkout(week: WeekPlan) {
  return week.days.find((workout) => isLongWorkout(workout))
    ?? week.days.find((workout) => isQualityWorkout(workout))
    ?? week.days[0]
}

function completedCount(week: WeekPlan, progressApi: ProgressApi) {
  return week.days.filter((workout) => effectiveWorkoutStatus(progressApi.progress.workouts[workout.id]) === 'completed').length
}

function isLongWorkout(workout: Workout) {
  return workout.type.includes('long')
}

function isQualityWorkout(workout: Workout) {
  return !['foundation', 'recovery', 'rest'].includes(workout.type) && !isLongWorkout(workout)
}

export function Calendar({
  profile,
  week1Start,
  progressApi,
  scheduleAdjustments,
  onOpenWorkout,
}: {
  profile: TrainingPlanProfile
  week1Start: string
  progressApi: ProgressApi
  scheduleAdjustments: ScheduleAdjustmentState
  onOpenWorkout: (workout: Workout, assignedDate?: string) => void
}) {
  const { allWorkouts, trainingPlan } = profile
  const currentWeek = getCurrentWeekNumber(week1Start, allWorkouts)
  const currentBlock = Math.floor((currentWeek - 1) / 4)
  const [mode, setMode] = useState<CalendarMode>('month')
  const [visibleMonth, setVisibleMonth] = useState(() => new Date())
  const [selectedRoadmapWeek, setSelectedRoadmapWeek] = useState<WeekPlan | null>(null)

  const monthDays = useMemo(() => buildMonthDays(visibleMonth, week1Start, profile, scheduleAdjustments), [profile, scheduleAdjustments, visibleMonth, week1Start])
  const monthWorkouts = useMemo(
    () => monthDays.filter((day) => day.date.getMonth() === visibleMonth.getMonth() && day.workout),
    [monthDays, visibleMonth],
  )
  const currentWeekPlan = useMemo(
    () => trainingPlan.find((week) => week.week === currentWeek) ?? trainingPlan[0],
    [currentWeek, trainingPlan],
  )
  const blockWeeks = useMemo(() => trainingPlan.slice(currentBlock * 4, currentBlock * 4 + 4), [currentBlock, trainingPlan])

  const completed = monthWorkouts.filter((day) => day.workout && effectiveWorkoutStatus(progressApi.progress.workouts[day.workout.id]) === 'completed').length
  const longRuns = monthWorkouts.filter((day) => day.workout && isLongWorkout(day.workout)).length
  const totalMiles = monthWorkouts.reduce((sum, day) => sum + (day.workout?.miles ?? 0), 0)
  const todayMonth = monthKey(new Date())
  const title = mode === 'month' ? monthLabel(visibleMonth) : 'Training Calendar'

  function shiftMonth(offset: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  return (
    <main className="screen">
      <header className="screen-header split-header">
        <div>
          <p className="eyebrow">{profile.athleteName} · 15-week plan</p>
          <h1>{title}</h1>
        </div>
        {mode === 'month' ? (
          <button className="icon-button month-today-button" type="button" onClick={() => setVisibleMonth(new Date())} aria-label="Jump to this month">
            <LocateFixed size={20} aria-hidden="true" />
          </button>
        ) : null}
      </header>

      <div className="segmented-control sticky-control calendar-view-control" role="group" aria-label="Calendar layout">
        <button className={mode === 'week' ? 'selected' : ''} type="button" onClick={() => { setSelectedRoadmapWeek(null); setMode('week') }}>Week</button>
        <button className={mode === 'month' ? 'selected' : ''} type="button" onClick={() => { setSelectedRoadmapWeek(null); setMode('month') }}>Month</button>
        <button className={mode === 'block' ? 'selected' : ''} type="button" onClick={() => { setSelectedRoadmapWeek(null); setMode('block') }}>4-week</button>
        <button className={mode === 'full' ? 'selected' : ''} type="button" onClick={() => setMode('full')}>Full</button>
      </div>

      {mode === 'month' ? (
        <>
          <section className="month-hero" aria-label="Monthly training summary">
            <div><span>Done</span><strong>{completed}/{monthWorkouts.length}</strong></div>
            <div><span>Long runs</span><strong>{longRuns}</strong></div>
            <div><span>Planned miles</span><strong>{totalMiles.toFixed(totalMiles % 1 === 0 ? 0 : 1)}</strong></div>
          </section>

          <div className="month-controls" aria-label="Month navigation">
            <button type="button" onClick={() => shiftMonth(-1)} aria-label="Previous month"><ChevronLeft size={18} aria-hidden="true" /></button>
            <span>{monthLabel(visibleMonth)}</span>
            <button type="button" onClick={() => shiftMonth(1)} aria-label="Next month"><ChevronRight size={18} aria-hidden="true" /></button>
          </div>

          <section className="month-panel" aria-label={`${monthLabel(visibleMonth)} workouts`}>
            <div className="month-weekdays" aria-hidden="true">
              {weekDayLabels.map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}
            </div>
            <div className="month-grid">
              {monthDays.map((day) => {
                const workout = day.workout
                const library = workout ? getWorkoutLibraryEntry(workout.type) : null
                const status = workout ? effectiveWorkoutStatus(progressApi.progress.workouts[workout.id]) : undefined
                const adjustment = day.resolved?.adjustment ?? null
                const adjustmentBadge = day.resolved?.isSkipped
                  ? 'Skipped'
                  : day.resolved?.isCrossTraining
                    ? 'Cross-train'
                    : adjustment?.action === 'moved' && adjustment.assignedDate === day.iso
                      ? 'Moved here'
                      : adjustment && adjustment.originalDate === day.iso
                        ? 'Moved'
                        : null
                return (
                  <button
                    className={['month-day', day.date.getMonth() === visibleMonth.getMonth() ? '' : 'outside-month', day.isToday ? 'today' : '', library?.color ?? 'empty', status ?? '', adjustmentBadge ? 'adjusted' : '', day.resolved?.isSkipped ? 'schedule-skipped' : '', day.resolved?.isCrossTraining ? 'cross-training' : ''].filter(Boolean).join(' ')}
                    key={day.iso}
                    type="button"
                    disabled={!workout}
                    onClick={() => workout && onOpenWorkout(workout, day.iso)}
                  >
                    <span className="month-date-number">{day.date.getDate()}</span>
                    {workout ? (
                      <>
                        <strong className="month-workout-name">{workout.name}</strong>
                        {status === 'completed' ? <span className="month-status-dot" aria-label={status} /> : null}
                        {status === 'modified' ? <em className="month-status-mod">MOD</em> : null}
                        {adjustmentBadge ? <em className={`schedule-badge ${day.resolved?.isSkipped ? 'skipped' : day.resolved?.isCrossTraining ? 'cross-train' : 'moved'}`}>{adjustmentBadge}</em> : null}
                      </>
                    ) : (
                      <span className="month-day-type">{day.resolved?.adjustment?.action === 'moved' ? 'Moved' : day.inTrainingRange ? 'No run' : 'Open'}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </section>

          <section className="month-agenda" aria-label="Monthly workout details">
            <div className="month-section-heading">
              <p className="eyebrow">All details</p>
              <h2>{monthKey(visibleMonth) === todayMonth ? 'This month up front' : 'Month at a glance'}</h2>
            </div>
            {monthWorkouts.map((day) => {
              if (!day.workout) return null
              const workout = day.workout
              const library = getWorkoutLibraryEntry(workout.type)
              const status = effectiveWorkoutStatus(progressApi.progress.workouts[workout.id])
              const adjustment = day.resolved?.adjustment ?? null
              const adjustmentBadge = day.resolved?.isSkipped
                ? 'Skipped'
                : day.resolved?.isCrossTraining
                  ? 'Cross-train'
                  : adjustment?.action === 'moved'
                    ? 'Moved here'
                    : null
              return (
                <button className={`month-agenda-card ${library.color} ${adjustmentBadge ? 'adjusted' : ''}`} key={`${day.iso}-${workout.id}`} type="button" onClick={() => onOpenWorkout(workout, day.iso)}>
                  <span className="agenda-date">{new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(day.date)}</span>
                  <span className="type-badge">{library.name}</span>
                  <strong>{workout.name}</strong>
                  <span className="agenda-meta">
                    <span>{workout.miles ? `${workout.miles} mi` : workout.duration}</span>
                    <span>{workout.targetBpm}</span>
                    <span>{workout.targetPace}</span>
                    <span><ZoneChips zones={workout.zone} /></span>
                  </span>
                  <em>{workout.steps.slice(0, 2).join(' · ')}</em>
                  {status ? <span className={`status-pill ${status}`}>{status}</span> : null}
                  {adjustmentBadge ? <span className={`schedule-pill ${day.resolved?.isSkipped ? 'skipped' : day.resolved?.isCrossTraining ? 'cross-train' : 'moved'}`}>{adjustmentBadge}</span> : null}
                </button>
              )
            })}
          </section>
        </>
      ) : null}

      {mode === 'week' ? (
        <WeekCard week={currentWeekPlan} week1Start={week1Start} progress={progressApi.progress} onOpenWorkout={onOpenWorkout} />
      ) : null}

      {mode === 'block' ? (
        <section className="calendar-block-list" aria-label="4-week training block">
          <div className="month-section-heading">
            <p className="eyebrow">Current block</p>
            <h2>Weeks {blockWeeks[0]?.week}-{blockWeeks[blockWeeks.length - 1]?.week}</h2>
          </div>
          {blockWeeks.map((week) => {
            const completed = completedCount(week, progressApi)
            return (
              <section className={`calendar-block-card ${phaseClass(week)}`} key={week.week}>
                <div className="week-header">
                  <div>
                    <p className="eyebrow">{week.phase}</p>
                    <h2>Week {week.week}</h2>
                  </div>
                  <div className="week-stack">
                    {week.label ? <span className="week-label">{week.label}</span> : null}
                    <span className="mini-progress">{completed}/7 done</span>
                  </div>
                </div>
                <div className="block-summary-strip" aria-label={`Week ${week.week} summary`}>
                  <span><small>Miles</small><strong>{weekMiles(week)}</strong></span>
                  <span><small>Long run</small><strong>{week.days.find((workout) => isLongWorkout(workout))?.miles ?? 0} mi</strong></span>
                  <span><small>Quality</small><strong>{week.days.filter((workout) => isQualityWorkout(workout)).length}</strong></span>
                </div>
                <div className="block-day-list">
                  {week.days.map((workout) => {
                    const library = getWorkoutLibraryEntry(workout.type)
                    const status = effectiveWorkoutStatus(progressApi.progress.workouts[workout.id])
                    return (
                      <button className={`block-day-row ${library.color}`} key={workout.id} type="button" onClick={() => onOpenWorkout(workout)}>
                        <span className="block-day-date">{workout.dayName.slice(0, 3)}</span>
                        <strong>{workout.name}</strong>
                        <span>{workout.miles ? `${workout.miles} mi` : workout.duration}</span>
                        <ZoneChips zones={workout.zone} compact />
                        {status ? <em className={`status-dot ${status}`} aria-label={status} /> : null}
                      </button>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </section>
      ) : null}

      {mode === 'full' ? (
        <section className="roadmap-list" aria-label="Full 15-week training roadmap">
          <div className="month-section-heading">
            <p className="eyebrow">Program roadmap</p>
            <h2>{selectedRoadmapWeek ? `Week ${selectedRoadmapWeek.week} details` : '15 weeks at a glance'}</h2>
          </div>
          {selectedRoadmapWeek ? (
            <div className="roadmap-detail-flow">
              <button className="secondary-button roadmap-back-button" type="button" onClick={() => setSelectedRoadmapWeek(null)}>
                <ChevronLeft size={18} aria-hidden="true" /> Back to 15 weeks
              </button>
              <WeekCard week={selectedRoadmapWeek} week1Start={week1Start} progress={progressApi.progress} onOpenWorkout={onOpenWorkout} />
            </div>
          ) : trainingPlan.map((week) => {
            const keyRun = keyWorkout(week)
            const completed = completedCount(week, progressApi)
            return (
              <section className={`roadmap-week-card ${phaseClass(week)} ${week.week === currentWeek ? 'current-week' : ''}`} key={week.week}>
                <button className="roadmap-week-drill" type="button" onClick={() => setSelectedRoadmapWeek(week)}>
                  <span>
                    <p className="eyebrow">{week.phase}</p>
                    <h2>Week {week.week}</h2>
                  </span>
                  <span className="roadmap-meter" aria-label={`${completed} of 7 workouts done`}>
                    {week.days.map((workout) => {
                      const library = getWorkoutLibraryEntry(workout.type)
                      const status = effectiveWorkoutStatus(progressApi.progress.workouts[workout.id])
                      return <i className={`${library.color} ${status ?? ''}`} key={workout.id} />
                    })}
                  </span>
                  <span className="roadmap-facts">
                    <span><small>Miles</small><strong>{weekMiles(week)}</strong></span>
                    <span><small>Key run</small><strong>{keyRun.name}</strong></span>
                    <span><small>Target</small><strong>{keyRun.miles ? `${keyRun.miles} mi` : keyRun.duration}</strong></span>
                  </span>
                </button>
                <button className="secondary-button roadmap-open-button" type="button" onClick={() => onOpenWorkout(keyRun)}>
                  Open key run
                </button>
              </section>
            )
          })}
        </section>
      ) : null}
    </main>
  )
}
