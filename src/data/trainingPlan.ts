import { getWorkoutLibraryEntry, type WorkoutType } from './workoutLibrary'
import { zoneTargets } from './zones'

export type Workout = {
  id: string
  week: number
  day: number
  dayName: string
  name: string
  duration: string
  miles?: number
  type: WorkoutType
  targetBpm: string
  targetPace: string
  zone: string
  steps: string[]
  notes: string
  phase: string
  weekLabel?: string
}

export type WeekPlan = {
  week: number
  phase: string
  label?: 'Recovery Week' | 'Taper Week' | 'Race Week'
  days: Workout[]
}

type WorkoutInput = {
  name: string
  duration: string
  miles?: number
  type: WorkoutType
  zone: string
  steps: string[]
  notes?: string
}

const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const z1CrossTrainNote = 'Optional cross-training is allowed only if it stays easy and low stress.'

const foundationRunNumbers: Record<string, number> = {
  '30-20': 3,
  '35-25': 4,
  '40-30': 5,
  '45-35': 6,
}

const recoveryRunNumbers: Record<number, number> = {
  25: 2,
  35: 4,
  40: 5,
  45: 6,
  50: 7,
}

const fastFinishRunNumbers: Record<string, number> = {
  '35-20-10': 3,
  '40-25-10': 4,
  '42-25-12': 5,
}

const tempoRunNumbers: Record<string, number> = {
  '44-24': 4,
  '48-28': 5,
  '52-32': 7,
}

const cruiseIntervalRunNumbers: Record<number, number> = {
  5: 1,
  8: 2,
}

const hillRepetitionRunNumbers: Record<string, number> = {
  '35-10-30 secs-90 secs': 4,
  '39-12-30 secs-90 secs': 5,
  '39-8-1 min-2 mins': 6,
}

const shortIntervalRunNumbers: Record<string, number> = {
  '30-5-1 min-2 mins': 2,
  '33-6-1 min-2 mins': 4,
  '39-6-1.5 mins-2.5 mins': 5,
  '45-10-1 min-2 mins': 6,
  '47-8-1.5 mins-2.5 mins': 7,
}

const longIntervalRunNumbers: Record<string, number> = {
  '35-5-2 mins-2 mins': 1,
  '39-3-5 mins-3 mins': 3,
  '47-4-5 mins-3 mins': 4,
}

const longRunNumbers: Record<number, number> = {
  6: 1,
  7: 2,
  8: 3,
  10: 5,
  12: 7,
}

const longFastFinishNumbers: Record<string, number> = {
  '10-8.5-1': 1,
  '12-10.5-1': 2,
  '14-12-1.5': 3,
}

const longTempoRepeatNumbers: Record<string, number> = {
  '10-8': 1,
  '12-10': 2,
}

function targetsFor(zone: string, type: WorkoutType) {
  if (type === 'race') return zoneTargets.Race
  if (type === 'rest') return zoneTargets.Rest
  if (zone.includes('Z5')) return zoneTargets.Z5
  if (zone.includes('Z4')) return zoneTargets.Z4
  if (zone.includes('Z3')) return zoneTargets.Z3
  if (zone === 'Z1') return zoneTargets.Z1
  return zoneTargets.Z2
}

function phaseForWeek(week: number) {
  if (week <= 6) return 'Base Phase'
  if (week <= 13) return 'Peak Phase'
  return 'Taper Phase'
}

function labelForWeek(week: number): WeekPlan['label'] | undefined {
  if ([3, 6, 9, 12].includes(week)) return 'Recovery Week'
  if (week === 15) return 'Race Week'
  if (week === 14) return 'Taper Week'
  return undefined
}

function timedWorkout(
  name: string,
  minutes: number,
  type: WorkoutType,
  zone: string,
  steps: string[],
  notes?: string,
): WorkoutInput {
  return {
    name,
    duration: `${minutes} min`,
    type,
    zone,
    steps,
    notes,
  }
}

function distanceWorkout(
  name: string,
  miles: number,
  type: WorkoutType,
  zone: string,
  steps: string[],
  notes?: string,
): WorkoutInput {
  return {
    name,
    duration: `${miles} mi`,
    miles,
    type,
    zone,
    steps,
    notes,
  }
}

const z1All = (minutes: number) => timedWorkout(
  `Recovery Run ${recoveryRunNumbers[minutes] ?? minutes}`,
  minutes,
  'recovery',
  'Z1',
  [`${minutes} mins entirely in Zone 1`],
  z1CrossTrainNote,
)

const easy = (minutes: number, zone2Minutes: number) => timedWorkout(
  `Foundation Run ${foundationRunNumbers[`${minutes}-${zone2Minutes}`] ?? minutes}`,
  minutes,
  'foundation',
  'Z1/Z2',
  ['5 mins Zone 1', `${zone2Minutes} mins Zone 2`, '5 mins Zone 1'],
  z1CrossTrainNote,
)

const fastFinish = (minutes: number, zone2Minutes: number, zone3Minutes: number) => timedWorkout(
  `Fast Finish Run ${fastFinishRunNumbers[`${minutes}-${zone2Minutes}-${zone3Minutes}`] ?? minutes}`,
  minutes,
  'fast-finish',
  'Z1/Z2/Z3',
  ['5 mins Zone 1', `${zone2Minutes} mins Zone 2`, `${zone3Minutes} mins Zone 3`],
)

const tempo = (minutes: number, zone3Minutes: number) => timedWorkout(
  `Tempo Run ${tempoRunNumbers[`${minutes}-${zone3Minutes}`] ?? minutes}`,
  minutes,
  'tempo',
  'Z1/Z2/Z3',
  ['5 mins Zone 1', '5 mins Zone 2', `${zone3Minutes} mins Zone 3`, '5 mins Zone 2', '5 mins Zone 1'],
)

const cruise = (minutes: number, repeatMinutes: number) => timedWorkout(
  `Cruise Interval Run ${cruiseIntervalRunNumbers[repeatMinutes] ?? repeatMinutes}`,
  minutes,
  'cruise',
  'Z1/Z2/Z3',
  ['5 mins Zone 1', '5 mins Zone 2', `4 sets of (${repeatMinutes} mins Zone 3 / 3 mins Zone 1 recovery)`, '5 mins Zone 2', '5 mins Zone 1'],
)

const shortSpeed = (minutes: number, sets: number, work: string, recovery: string, uphill = false) => timedWorkout(
  uphill
    ? `Hill Repetition Run ${hillRepetitionRunNumbers[`${minutes}-${sets}-${work}-${recovery}`] ?? sets}`
    : `Short Interval Run ${shortIntervalRunNumbers[`${minutes}-${sets}-${work}-${recovery}`] ?? sets}`,
  minutes,
  uphill ? 'hills' : 'short-interval',
  'Z1/Z2/Z5',
  ['5 mins Zone 1', '5 mins Zone 2', `${sets} sets of (${work} ${uphill ? 'uphill ' : ''}Zone 5 / ${recovery} Zone 1 recovery)`, '5 mins Zone 1'],
)

const z4Intervals = (minutes: number, sets: number, work: string, recovery: string) => timedWorkout(
  `Long Interval Run ${longIntervalRunNumbers[`${minutes}-${sets}-${work}-${recovery}`] ?? sets}`,
  minutes,
  'long-interval',
  'Z1/Z2/Z4',
  ['5 mins Zone 1', '5 mins Zone 2', `${sets} sets of (${work} Zone 4 / ${recovery} Zone 1 recovery)`, '5 mins Zone 1'],
)

const mixedInterval = timedWorkout(
  '46 min Mixed Interval Run',
  46,
  'mixed-interval',
  'Z1/Z2/Z3/Z4/Z5',
  [
    '5 mins Zone 1',
    '5 mins Zone 2',
    '1.5 mins Zone 5',
    '2 mins Zone 1',
    '5 mins Zone 4',
    '2 mins Zone 1',
    '10 mins Zone 3',
    '2 mins Zone 1',
    '5 mins Zone 4',
    '2 mins Zone 1',
    '1.5 mins Zone 5',
    '5 mins Zone 1',
  ],
)

const longRun = (miles: number, middleMiles: number, finishStep = '0.5 mile Zone 1') => distanceWorkout(
  `Long Run ${longRunNumbers[miles] ?? miles}`,
  miles,
  'long-run',
  'Z1/Z2',
  ['1 mile Zone 1', `${middleMiles} miles Zone 2`, finishStep],
)

const longProgression = (miles: number, zone2Miles: number, zone3Miles: number) => distanceWorkout(
  `Long Run with Fast Finish ${longFastFinishNumbers[`${miles}-${zone2Miles}-${zone3Miles}`] ?? miles}`,
  miles,
  'long-fast-finish',
  'Z1/Z2/Z3',
  ['0.5 mile Zone 1', `${zone2Miles} miles Zone 2`, `${zone3Miles} ${zone3Miles === 1 ? 'mile' : 'miles'} Zone 3`],
)

const longTempoRepeats = (miles: number, sets: number) => distanceWorkout(
  `Long Run with Tempo Repeats ${longTempoRepeatNumbers[`${miles}-${sets}`] ?? sets}`,
  miles,
  'long-speed-play',
  'Z1/Z2/Z3',
  ['0.5 mile Zone 1', '1 mile Zone 2', `${sets} sets of (0.25 mile Zone 3 / 0.75 mile Zone 2 recovery)`, '0.5 mile Zone 1'],
)

const raceDay = distanceWorkout(
  'Race Day: Half Marathon',
  13.1,
  'race',
  'Z3/Z4',
  ['Half Marathon'],
  'Start controlled, stay composed through the middle miles, and race the final stretch if HR and legs agree.',
)

const weeklyWorkouts: WorkoutInput[][] = [
  [
    easy(40, 30),
    fastFinish(35, 20, 10),
    easy(40, 30),
    easy(40, 30),
    shortSpeed(33, 6, '1 min', '2 mins'),
    easy(40, 30),
    longRun(7, 5.5),
  ],
  [
    easy(40, 30),
    fastFinish(42, 25, 12),
    easy(45, 35),
    easy(40, 30),
    z4Intervals(35, 5, '2 mins', '2 mins'),
    easy(40, 30),
    longRun(8, 6.5),
  ],
  [
    easy(40, 30),
    fastFinish(40, 25, 10),
    easy(40, 30),
    easy(40, 30),
    shortSpeed(33, 6, '1 min', '2 mins'),
    easy(40, 30),
    longRun(6, 4.5),
  ],
  [
    easy(40, 30),
    fastFinish(40, 25, 10),
    z1All(45),
    easy(45, 35),
    shortSpeed(39, 12, '30 secs', '90 secs', true),
    z1All(40),
    longRun(10, 8.5),
  ],
  [
    easy(40, 30),
    fastFinish(42, 25, 12),
    z1All(45),
    easy(45, 35),
    shortSpeed(39, 8, '1 min', '2 mins', true),
    z1All(45),
    longRun(12, 10.5),
  ],
  [
    z1All(40),
    fastFinish(40, 25, 10),
    z1All(40),
    easy(40, 30),
    shortSpeed(35, 10, '30 secs', '90 secs', true),
    z1All(40),
    longRun(8, 6.5),
  ],
  [
    easy(45, 35),
    cruise(52, 5),
    z1All(45),
    easy(45, 35),
    shortSpeed(45, 10, '1 min', '2 mins'),
    z1All(45),
    longTempoRepeats(10, 8),
  ],
  [
    z1All(45),
    tempo(44, 24),
    z1All(45),
    easy(45, 35),
    shortSpeed(47, 8, '1.5 mins', '2.5 mins'),
    z1All(50),
    longTempoRepeats(12, 10),
  ],
  [
    z1All(40),
    cruise(52, 5),
    z1All(40),
    easy(45, 35),
    shortSpeed(39, 6, '1.5 mins', '2.5 mins'),
    z1All(40),
    longProgression(10, 8.5, 1),
  ],
  [
    easy(45, 35),
    tempo(48, 28),
    z1All(45),
    easy(45, 35),
    z4Intervals(39, 3, '5 mins', '3 mins'),
    z1All(45),
    longTempoRepeats(12, 10),
  ],
  [
    z1All(45),
    cruise(64, 8),
    z1All(45),
    easy(45, 35),
    z4Intervals(47, 4, '5 mins', '3 mins'),
    z1All(45),
    longProgression(12, 10.5, 1),
  ],
  [
    z1All(40),
    tempo(44, 24),
    z1All(40),
    easy(45, 35),
    z4Intervals(39, 3, '5 mins', '3 mins'),
    z1All(40),
    longTempoRepeats(10, 8),
  ],
  [
    easy(45, 35),
    tempo(52, 32),
    z1All(45),
    easy(45, 35),
    mixedInterval,
    z1All(45),
    longProgression(14, 12, 1.5),
  ],
  [
    z1All(40),
    tempo(48, 28),
    z1All(40),
    easy(35, 25),
    mixedInterval,
    z1All(35),
    longTempoRepeats(10, 8),
  ],
  [
    z1All(25),
    fastFinish(42, 25, 12),
    easy(35, 25),
    easy(30, 20),
    shortSpeed(30, 5, '1 min', '2 mins'),
    timedWorkout('Recovery Run 2', 25, 'recovery', 'Z1', ['25 mins entirely in Zone 1']),
    raceDay,
  ],
]

function workoutFromInput(input: WorkoutInput, week: number, dayIndex: number): Workout {
  const targets = targetsFor(input.zone, input.type)
  const libraryEntry = getWorkoutLibraryEntry(input.type)

  return {
    id: `w${week}-d${dayIndex + 1}`,
    week,
    day: dayIndex + 1,
    dayName: dayNames[dayIndex],
    name: input.name,
    duration: input.duration,
    miles: input.miles,
    type: input.type,
    targetBpm: targets.bpm,
    targetPace: targets.pace,
    zone: input.zone,
    steps: input.steps,
    notes: input.notes ?? `${libraryEntry.what} ${targets.reminder}`,
    phase: phaseForWeek(week),
    weekLabel: labelForWeek(week),
  }
}

export const trainingPlan: WeekPlan[] = weeklyWorkouts.map((days, index) => {
  const week = index + 1
  return {
    week,
    phase: phaseForWeek(week),
    label: labelForWeek(week),
    days: days.map((workout, dayIndex) => workoutFromInput(workout, week, dayIndex)),
  }
})

export const allWorkouts = trainingPlan.flatMap((week) => week.days)
