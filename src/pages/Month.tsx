import { ChevronLeft, ChevronRight, LocateFixed } from 'lucide-react'
import { useMemo, useState } from 'react'
import { allWorkouts, type Workout } from '../data/trainingPlan'
import { getWorkoutLibraryEntry } from '../data/workoutLibrary'
import type { useProgress } from '../hooks/useProgress'
import { addDays, daysBetween, parseISODate, toISODate } from '../utils/dates'
import { workoutDate } from '../utils/workouts'

type ProgressApi = ReturnType<typeof useProgress>

type CalendarDay = {
  date: Date
  iso: string
  workout: Workout | null
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

function buildMonthDays(monthDate: Date, week1Start: string): CalendarDay[] {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const firstGridDate = addDays(firstOfMonth, -((firstOfMonth.getDay() + 6) % 7))
  const firstPlanDate = parseISODate(week1Start)
  const lastPlanDate = addDays(firstPlanDate, allWorkouts.length - 1)
  const workoutByISO = new Map(allWorkouts.map((workout) => [toISODate(workoutDate(workout, week1Start)), workout]))
  const todayISO = toISODate(new Date())

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(firstGridDate, index)
    const iso = toISODate(date)
    return {
      date,
      iso,
      workout: workoutByISO.get(iso) ?? null,
      inTrainingRange: daysBetween(firstPlanDate, date) >= 0 && daysBetween(date, lastPlanDate) >= 0,
      isToday: iso === todayISO,
    }
  })
}

export function Month({
  week1Start,
  progressApi,
  onOpenWorkout,
}: {
  week1Start: string
  progressApi: ProgressApi
  onOpenWorkout: (workout: Workout) => void
}) {
  const [visibleMonth, setVisibleMonth] = useState(() => new Date())
  const monthDays = useMemo(() => buildMonthDays(visibleMonth, week1Start), [visibleMonth, week1Start])
  const monthWorkouts = useMemo(
    () => monthDays.filter((day) => day.date.getMonth() === visibleMonth.getMonth() && day.workout),
    [monthDays, visibleMonth],
  )
  const completed = monthWorkouts.filter((day) => day.workout && progressApi.progress.workouts[day.workout.id]?.status === 'completed').length
  const longRuns = monthWorkouts.filter((day) => day.workout?.type.includes('long')).length
  const totalMiles = monthWorkouts.reduce((sum, day) => sum + (day.workout?.miles ?? 0), 0)
  const todayMonth = monthKey(new Date())

  function shiftMonth(offset: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  return (
    <main className="screen">
      <header className="screen-header split-header">
        <div>
          <p className="eyebrow">Month view</p>
          <h1>{monthLabel(visibleMonth)}</h1>
        </div>
        <button className="icon-button month-today-button" type="button" onClick={() => setVisibleMonth(new Date())} aria-label="Jump to this month">
          <LocateFixed size={20} aria-hidden="true" />
        </button>
      </header>

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
            const status = workout ? progressApi.progress.workouts[workout.id]?.status : undefined
            return (
              <button
                className={['month-day', day.date.getMonth() === visibleMonth.getMonth() ? '' : 'outside-month', day.isToday ? 'today' : '', library?.color ?? 'empty', status ?? ''].filter(Boolean).join(' ')}
                key={day.iso}
                type="button"
                disabled={!workout}
                onClick={() => workout && onOpenWorkout(workout)}
              >
                <span className="month-date-number">{day.date.getDate()}</span>
                {workout ? (
                  <>
                    <strong className="month-workout-name">{workout.name}</strong>
                    {status ? <span className="month-status-dot" aria-label={status} /> : null}
                  </>
                ) : (
                  <span className="month-day-type">{day.inTrainingRange ? 'No run' : 'Open'}</span>
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
          const status = progressApi.progress.workouts[workout.id]?.status
          return (
            <button className={`month-agenda-card ${library.color}`} key={workout.id} type="button" onClick={() => onOpenWorkout(workout)}>
              <span className="agenda-date">{new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(day.date)}</span>
              <span className="type-badge">{library.name}</span>
              <strong>{workout.name}</strong>
              <span className="agenda-meta">
                <span>{workout.miles ? `${workout.miles} mi` : workout.duration}</span>
                <span>{workout.targetBpm}</span>
                <span>{workout.targetPace}</span>
                <span>{workout.zone}</span>
              </span>
              <em>{workout.steps.slice(0, 2).join(' · ')}</em>
              {status ? <span className={`status-pill ${status}`}>{status}</span> : null}
            </button>
          )
        })}
      </section>
    </main>
  )
}
