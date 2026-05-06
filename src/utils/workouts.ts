import { allWorkouts, trainingPlan, type Workout } from '../data/trainingPlan'
import { zoneTargets, zones } from '../data/zones'
import { addDays, daysBetween, formatFriendlyDate, parseISODate, toISODate } from './dates'

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

export function getWorkoutSegments(workout: Workout): WorkoutSegment[] {
  return workout.steps.map((step) => {
    const zone = zoneForStep(step)
    const target = zone ? zoneTargets[zone] : null
    const zoneDetail = zone ? zones.find((entry) => entry.id === zone.toLowerCase()) : null

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
  return addDays(parseISODate(week1StartISO), (workout.week - 1) * 7 + (workout.day - 1))
}

export function workoutDateLabel(workout: Workout, week1StartISO: string) {
  return formatFriendlyDate(workoutDate(workout, week1StartISO))
}

export function workoutISO(workout: Workout, week1StartISO: string) {
  return toISODate(workoutDate(workout, week1StartISO))
}

export function getWorkoutForDate(date: Date, week1StartISO: string) {
  const offset = daysBetween(parseISODate(week1StartISO), date)
  if (offset < 0 || offset >= allWorkouts.length) return null
  const week = Math.floor(offset / 7) + 1
  const day = (offset % 7) + 1
  return allWorkouts.find((workout) => workout.week === week && workout.day === day) ?? null
}

export function getCurrentWeekNumber(week1StartISO: string) {
  const offset = daysBetween(parseISODate(week1StartISO), new Date())
  if (offset < 0) return 1
  if (offset > 104) return 15
  return Math.floor(offset / 7) + 1
}

export function getPlanTiming(week1StartISO: string, date = new Date()) {
  const offset = daysBetween(parseISODate(week1StartISO), date)

  if (offset < 0) {
    return {
      state: 'before' as const,
      weekNumber: null,
      summaryValue: 'Soon',
      summaryLabel: 'Start',
      headerText: `Starts ${formatFriendlyDate(parseISODate(week1StartISO))}`,
    }
  }

  if (offset >= allWorkouts.length) {
    return {
      state: 'after' as const,
      weekNumber: null,
      summaryValue: 'Done',
      summaryLabel: 'Plan',
      headerText: 'Plan complete',
    }
  }

  const weekNumber = Math.floor(offset / 7) + 1
  const week = trainingPlan.find((entry) => entry.week === weekNumber) ?? trainingPlan[0]

  return {
    state: 'active' as const,
    weekNumber,
    summaryValue: weekNumber,
    summaryLabel: 'Week',
    headerText: `Week ${weekNumber} · ${week.phase}`,
  }
}

export function getCurrentWeek(week1StartISO: string) {
  const week = getCurrentWeekNumber(week1StartISO)
  return trainingPlan.find((entry) => entry.week === week) ?? trainingPlan[0]
}

export function copyWorkoutText(workout: Workout, week1StartISO: string) {
  return [
    workout.name,
    `Date: ${workoutDateLabel(workout, week1StartISO)}`,
    `Week ${workout.week}, ${workout.dayName}`,
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
