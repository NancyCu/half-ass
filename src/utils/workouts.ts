import { allWorkouts, trainingPlan, type Workout } from '../data/trainingPlan'
import { addDays, daysBetween, formatFriendlyDate, parseISODate, toISODate } from './dates'

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
