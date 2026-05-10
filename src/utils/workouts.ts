import { allWorkouts, trainingPlan, type WeekPlan, type Workout } from '../data/trainingPlan'
import { zoneTargets, zones, type Zone } from '../data/zones'
import { addDays, daysBetween, formatFriendlyDate, parseISODate, toISODate } from './dates'

const prePlanFoundationDateKeys = new Set(['2026-05-09', '2026-05-10'])
const prePlanDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export type WorkoutSegment = {
  step: string
  zone: string
  targetBpm: string
  targetPace: string
  purpose: string
}

function zoneForStep(step: string) {
  const match = step.match(/(?:Zone\s*|Z)([1-5])/i)
  return match ? `Z${match[1]}` : null
}

export function getWorkoutSegments(workout: Workout, targets = zoneTargets, zoneList: Zone[] = zones): WorkoutSegment[] {
  return workout.steps.map((step) => {
    const zone = zoneForStep(step)
    const target = zone ? targets[zone] : null
    const zoneDetail = zone ? zoneList.find((entry) => entry.id === zone.toLowerCase()) : null

    return {
      step,
      zone: zone ?? workout.zone,
      targetBpm: target?.bpm ?? workout.targetBpm,
      targetPace: target?.pace ?? workout.targetPace,
      purpose: zoneDetail?.purpose ?? target?.reminder ?? workout.notes,
    }
  })
}

export function workoutDate(workout: Workout, week1StartISO: string) {
  if (workout.plannedDateKey) return parseISODate(workout.plannedDateKey)
  return addDays(parseISODate(week1StartISO), (workout.week - 1) * 7 + (workout.day - 1))
}

export function workoutDateLabel(workout: Workout, week1StartISO: string) {
  return formatFriendlyDate(workoutDate(workout, week1StartISO))
}

export function workoutISO(workout: Workout, week1StartISO: string) {
  return toISODate(workoutDate(workout, week1StartISO))
}

export function getWorkoutForDate(date: Date, week1StartISO: string, workouts: Workout[] = allWorkouts) {
  const prePlanWorkout = getPrePlanWorkoutForDate(date, workouts)
  if (prePlanWorkout) return prePlanWorkout

  const offset = daysBetween(parseISODate(week1StartISO), date)
  if (offset < 0 || offset >= workouts.length) return null
  const week = Math.floor(offset / 7) + 1
  const day = (offset % 7) + 1
  return workouts.find((workout) => workout.week === week && workout.day === day) ?? null
}

export function getPrePlanWorkoutForDate(date: Date, workouts: Workout[] = allWorkouts): Workout | null {
  const dateKey = toISODate(date)
  if (!prePlanFoundationDateKeys.has(dateKey)) return null

  const template = workouts.find((workout) => (
    workout.name === 'Foundation Run 5'
    && workout.duration === '40 min'
    && workout.type === 'foundation'
  ))
  if (!template) return null

  return {
    ...template,
    id: `preplan-${dateKey}-foundation-run-5`,
    week: 0,
    day: 0,
    dayName: prePlanDayNames[date.getDay()],
    phase: 'Pre-plan',
    weekLabel: undefined,
    plannedDateKey: dateKey,
    isPrePlan: true,
    notes: `Pre-plan shakeout. ${template.notes}`,
  }
}

export function getCurrentWeekNumber(week1StartISO: string, workouts: Workout[] = allWorkouts) {
  const offset = daysBetween(parseISODate(week1StartISO), new Date())
  if (offset < 0) return 1
  if (offset > workouts.length - 1) return Math.ceil(workouts.length / 7)
  return Math.floor(offset / 7) + 1
}

export function getPlanTiming(week1StartISO: string, plan: WeekPlan[] = trainingPlan, date = new Date()) {
  const offset = daysBetween(parseISODate(week1StartISO), date)
  const workoutCount = plan.reduce((total, week) => total + week.days.length, 0)

  if (offset < 0) {
    return {
      state: 'before' as const,
      weekNumber: null,
      summaryValue: 'Soon',
      summaryLabel: 'Start',
      headerText: `Starts ${formatFriendlyDate(parseISODate(week1StartISO))}`,
    }
  }

  if (offset >= workoutCount) {
    return {
      state: 'after' as const,
      weekNumber: null,
      summaryValue: 'Done',
      summaryLabel: 'Plan',
      headerText: 'Plan complete',
    }
  }

  const weekNumber = Math.floor(offset / 7) + 1
  const week = plan.find((entry) => entry.week === weekNumber) ?? plan[0]

  return {
    state: 'active' as const,
    weekNumber,
    summaryValue: weekNumber,
    summaryLabel: 'Week',
    headerText: `Week ${weekNumber} · ${week.phase}`,
  }
}

export function getCurrentWeek(week1StartISO: string, plan: WeekPlan[] = trainingPlan) {
  const week = getCurrentWeekNumber(week1StartISO, plan.flatMap((entry) => entry.days))
  return plan.find((entry) => entry.week === week) ?? plan[0]
}

export function copyWorkoutText(workout: Workout, week1StartISO: string) {
  const planLabel = workout.isPrePlan ? `Pre-plan, ${workout.dayName}` : `Week ${workout.week}, ${workout.dayName}`
  return [
    workout.name,
    `Date: ${workoutDateLabel(workout, week1StartISO)}`,
    planLabel,
    `Time / Distance: ${workout.miles ? `${workout.miles} mi` : workout.duration}`,
    `Target HR: ${workout.targetBpm}`,
    `Target pace: ${workout.targetPace}`,
    `Zones: ${workout.zone}`,
    '',
    'Steps:',
    ...workout.steps.map((step) => `- ${step}`),
    '',
    `Note: ${workout.notes}`,
  ].join('\n')
}
