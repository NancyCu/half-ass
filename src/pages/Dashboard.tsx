import { TodayWorkoutCard } from '../components/TodayWorkoutCard'
import { WeekCard } from '../components/WeekCard'
import { ProgressSummary } from '../components/ProgressSummary'
import { trainingPlan, type Workout } from '../data/trainingPlan'
import type { useProgress } from '../hooks/useProgress'
import { getCurrentWeek, getCurrentWeekNumber, getWorkoutForDate, workoutDate } from '../utils/workouts'

type ProgressApi = ReturnType<typeof useProgress>

export function Dashboard({
  week1Start,
  progressApi,
  onOpenWorkout,
}: {
  week1Start: string
  progressApi: ProgressApi
  onOpenWorkout: (workout: Workout) => void
}) {
  const today = getWorkoutForDate(new Date(), week1Start) ?? trainingPlan[0].days[0]
  const currentWeek = getCurrentWeek(week1Start)
  const currentWeekNumber = getCurrentWeekNumber(week1Start)
  const todayProgress = progressApi.progress.workouts[today.id]
  const weeklyDone = currentWeek.days.filter((workout) => progressApi.progress.workouts[workout.id]?.status === 'completed').length
  const todayDate = workoutDate(today, week1Start)
  const compactDate = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(todayDate)

  return (
    <main className="screen">
      <div className="dashboard-visual-strip">
        <div className="date-stack">
          <span>{today.dayName}</span>
          <strong>{compactDate}</strong>
          <em>Week {today.week} · {today.phase}</em>
        </div>
        <span className="weekly-count">{weeklyDone}/7 this week</span>
      </div>
      <TodayWorkoutCard
        workout={today}
        week1Start={week1Start}
        status={todayProgress?.status}
        note={todayProgress?.note}
        selectedFlags={todayProgress?.flags ?? []}
        onStatus={(status) => progressApi.setStatus(today.id, status)}
        onNote={(note) => progressApi.setNote(today.id, note)}
        onToggleFlag={(flag) => progressApi.toggleFlag(today.id, flag)}
      />
      <ProgressSummary summary={progressApi.summary} currentWeek={currentWeekNumber} />
      <WeekCard week={currentWeek} week1Start={week1Start} progress={progressApi.progress} onOpenWorkout={onOpenWorkout} />
    </main>
  )
}
