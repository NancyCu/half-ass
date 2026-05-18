import { getWorkoutLibraryEntry, type WorkoutType } from './workoutLibrary'
import { mannyZoneTargets, zoneTargets } from './zones'

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
  plannedDateKey?: string
  isPrePlan?: boolean
}

export type WeekPlan = {
  week: number
  phase: string
  label?: 'Recovery Week' | 'Taper Week' | 'Race Week'
  days: Workout[]
}

export type PlanId = 'mikey' | 'manny'

export type TrainingPlanProfile = {
  id: PlanId
  athleteName: string
  title: string
  description: string
  lactateThresholdHr: number
  thresholdPace: string
  trainingPlan: WeekPlan[]
  allWorkouts: Workout[]
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
  '60-50': 5,
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

function targetsFor(zone: string, type: WorkoutType, targets = zoneTargets) {
  if (type === 'race') return targets.Race
  if (type === 'rest') return targets.Rest
  if (zone.includes('Z5')) return targets.Z5
  if (zone.includes('Z4')) return targets.Z4
  if (zone.includes('Z3')) return targets.Z3
  if (zone === 'Z1') return targets.Z1
  return targets.Z2
}

function mikeyPhaseForWeek(week: number) {
  if (week <= 6) return 'Base Phase'
  if (week <= 13) return 'Peak Phase'
  return 'Taper Phase'
}

function mikeyLabelForWeek(week: number): WeekPlan['label'] | undefined {
  if ([3, 6, 9, 12].includes(week)) return 'Recovery Week'
  if (week === 15) return 'Race Week'
  if (week === 14) return 'Taper Week'
  return undefined
}

function mannyPhaseForWeek(week: number) {
  if (week <= 5) return 'Base Building'
  if (week <= 12) return 'Peak Development'
  return 'Taper and Race'
}

function mannyLabelForWeek(week: number): WeekPlan['label'] | undefined {
  if ([5, 9].includes(week)) return 'Recovery Week'
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

const mannyFoundation75 = timedWorkout(
  'Modified Foundation Run',
  75,
  'foundation',
  'Z1/Z2',
  ['5 mins Zone 1', '65 mins Zone 2', '5 mins Zone 1'],
  'Weight-loss edition foundation run: complete the full 75 minutes to support fat oxidation and the IL-6 adaptation trigger.',
)

const mannyFoundation40 = timedWorkout(
  'Foundation Run',
  40,
  'foundation',
  'Z1/Z2',
  ['5 mins Zone 1', '30 mins Zone 2', '5 mins Zone 1'],
  z1CrossTrainNote,
)

const mannyFoundation30 = timedWorkout(
  'Foundation Run',
  30,
  'foundation',
  'Z1/Z2',
  ['5 mins Zone 1', '20 mins Zone 2', '5 mins Zone 1'],
  z1CrossTrainNote,
)

const fastFinish = (minutes: number, zone2Minutes: number, zone3Minutes: number) => timedWorkout(
  `Fast Finish Run ${fastFinishRunNumbers[`${minutes}-${zone2Minutes}-${zone3Minutes}`] ?? minutes}`,
  minutes,
  'fast-finish',
  'Z1/Z2/Z3',
  ['5 mins Zone 1', `${zone2Minutes} mins Zone 2`, `${zone3Minutes} mins Zone 3`],
)

const mannyFastFinish = (number: number, minutes: number, zone2Minutes: number, zone3Minutes: number) => timedWorkout(
  `Fast Finish ${number}`,
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

const mannyTempo = (number: number, zone3Minutes: number) => timedWorkout(
  `Tempo Run ${number}`,
  20 + zone3Minutes,
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

const mannyCruise = (number: number, repeatMinutes: number) => timedWorkout(
  `Cruise Int. ${number}`,
  20 + (4 * repeatMinutes) + 12,
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

const mannySpeedPlay = (number: number, sets: number, workMinutes: number, zone: 'Z4' | 'Z5') => timedWorkout(
  `Speed Play ${number}`,
  15 + sets * (workMinutes + 2),
  'speed-play',
  `Z1/Z2/${zone}`,
  ['5 mins Zone 1', '5 mins Zone 2', `${sets} sets of (${workMinutes} min ${zone === 'Z4' ? 'Zone 4' : 'Zone 5'} / 2 mins Zone 1 recovery)`, '5 mins Zone 1'],
)

const mannyHillReps = (number: number, sets: number, work: string, recovery: string) => timedWorkout(
  `Hill Reps ${number}`,
  15 + sets * (work.includes('30') ? 2 : 3),
  'hills',
  'Z1/Z2/Z5',
  ['5 mins Zone 1', '5 mins Zone 2', `${sets} sets of (${work} uphill Zone 5 / ${recovery} Zone 1 recovery)`, '5 mins Zone 1'],
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

const mannyRaceDay = distanceWorkout(
  'HALF MARATHON',
  13.1,
  'race',
  'Z3/Z4',
  ['Maintain Zone 3 for the first 10 miles', 'If strong, progress into high Zone 3 / low Zone 4 for the final 5K', 'Save Zone 5 for the final 400 meters only'],
  'Race day: stay controlled early, then progress only if the body and heart rate are steady.',
)

const offDay = timedWorkout(
  'Off',
  0,
  'rest',
  'Rest',
  ['No scheduled workout'],
  'Full rest day. Keep it easy so the next workout can do its job.',
)

const weeklyWorkouts: WorkoutInput[][] = [
  [
    easy(60, 50),
    fastFinish(35, 20, 10),
    easy(60, 50),
    easy(60, 50),
    shortSpeed(33, 6, '1 min', '2 mins'),
    easy(60, 50),
    longRun(7, 5.5),
  ],
  [
    easy(60, 50),
    fastFinish(42, 25, 12),
    easy(45, 35),
    easy(60, 50),
    z4Intervals(35, 5, '2 mins', '2 mins'),
    easy(60, 50),
    longRun(8, 6.5),
  ],
  [
    easy(60, 50),
    fastFinish(40, 25, 10),
    easy(60, 50),
    easy(60, 50),
    shortSpeed(33, 6, '1 min', '2 mins'),
    easy(60, 50),
    longRun(6, 4.5),
  ],
  [
    easy(60, 50),
    fastFinish(40, 25, 10),
    z1All(45),
    easy(45, 35),
    shortSpeed(39, 12, '30 secs', '90 secs', true),
    z1All(40),
    longRun(10, 8.5),
  ],
  [
    easy(60, 50),
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
    easy(60, 50),
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

const mannyWeeklyWorkouts: WorkoutInput[][] = [
  [mannyFoundation75, z1All(30), mannySpeedPlay(2, 5, 1, 'Z5'), mannyFoundation75, mannyFastFinish(2, 30, 20, 5), easy(60, 50), mannyFoundation75],
  [mannyFoundation75, z1All(30), mannySpeedPlay(3, 4, 2, 'Z4'), mannyFoundation75, mannyFastFinish(3, 35, 20, 10), longRun(7, 5.5), mannyFoundation75],
  [mannyFoundation75, z1All(35), mannyHillReps(1, 6, '30 secs', '90 secs'), mannyFoundation75, mannyTempo(1, 15), longRun(8, 6.5), mannyFoundation75],
  [mannyFoundation75, z1All(35), mannySpeedPlay(4, 6, 1, 'Z5'), mannyFoundation75, mannyFastFinish(4, 40, 25, 10), longRun(9, 7.5), mannyFoundation75],
  [mannyFoundation75, z1All(20), mannyFoundation40, mannyFoundation75, z1All(20), longRun(6, 4.5), mannyFoundation75],
  [mannyFoundation75, z1All(40), mannySpeedPlay(5, 5, 2, 'Z4'), mannyFoundation75, mannyTempo(2, 18), longRun(10, 8.5), mannyFoundation75],
  [mannyFoundation75, z1All(40), mannyHillReps(2, 8, '30 secs', '90 secs'), mannyFoundation75, mannyCruise(1, 5), longRun(11, 9.5), mannyFoundation75],
  [mannyFoundation75, z1All(45), mannySpeedPlay(7, 6, 2, 'Z4'), mannyFoundation75, mannyTempo(3, 20), longRun(12, 10.5), mannyFoundation75],
  [mannyFoundation75, z1All(20), mannyFoundation40, mannyFoundation75, z1All(25), longRun(7, 5.5), mannyFoundation75],
  [mannyFoundation75, z1All(45), mannyHillReps(3, 6, '1 min', '2 mins'), mannyFoundation75, mannyCruise(2, 8), longRun(13, 11.5), mannyFoundation75],
  [mannyFoundation75, z1All(50), mannySpeedPlay(10, 7, 2, 'Z4'), mannyFoundation75, mannyTempo(5, 28), longRun(14, 12.5), mannyFoundation75],
  [mannyFoundation75, z1All(50), mannySpeedPlay(12, 8, 2, 'Z4'), mannyFoundation75, mannyCruise(3, 10), longRun(15, 13.5), mannyFoundation75],
  [mannyFoundation75, z1All(30), mannySpeedPlay(5, 5, 2, 'Z4'), mannyFoundation75, mannyTempo(3, 20), longRun(10, 8.5), mannyFoundation75],
  [mannyFoundation40, z1All(25), mannySpeedPlay(2, 5, 1, 'Z5'), mannyFoundation40, z1All(20), longRun(7, 5.5), mannyFoundation40],
  [z1All(20), mannyFoundation30, mannySpeedPlay(1, 3, 2, 'Z4'), offDay, z1All(20), mannyRaceDay, offDay],
]

function workoutFromInput(
  input: WorkoutInput,
  week: number,
  dayIndex: number,
  phaseForPlan: (week: number) => string,
  labelForPlan: (week: number) => WeekPlan['label'] | undefined,
  targets = zoneTargets,
): Workout {
  const workoutTargets = targetsFor(input.zone, input.type, targets)
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
    targetBpm: workoutTargets.bpm,
    targetPace: workoutTargets.pace,
    zone: input.zone,
    steps: input.steps,
    notes: input.notes ?? `${libraryEntry.what} ${workoutTargets.reminder}`,
    phase: phaseForPlan(week),
    weekLabel: labelForPlan(week),
  }
}

function buildTrainingPlan(
  workouts: WorkoutInput[][],
  phaseForPlan: (week: number) => string,
  labelForPlan: (week: number) => WeekPlan['label'] | undefined,
  targets = zoneTargets,
) {
  return workouts.map((days, index) => {
    const week = index + 1
    return {
      week,
      phase: phaseForPlan(week),
      label: labelForPlan(week),
      days: days.map((workout, dayIndex) => workoutFromInput(workout, week, dayIndex, phaseForPlan, labelForPlan, targets)),
    }
  })
}

export const trainingPlan: WeekPlan[] = buildTrainingPlan(weeklyWorkouts, mikeyPhaseForWeek, mikeyLabelForWeek)
export const allWorkouts = trainingPlan.flatMap((week) => week.days)
export const mannyTrainingPlan: WeekPlan[] = buildTrainingPlan(mannyWeeklyWorkouts, mannyPhaseForWeek, mannyLabelForWeek, mannyZoneTargets)
export const mannyAllWorkouts = mannyTrainingPlan.flatMap((week) => week.days)

export const trainingPlanProfiles: TrainingPlanProfile[] = [
  {
    id: 'mikey',
    athleteName: 'Mikey',
    title: '15-Week Level 2 Half Marathon Training Plan',
    description: 'Texas Meltdown 80/20 plan with beta-blocker adjusted zones.',
    lactateThresholdHr: 150,
    thresholdPace: '8:40/mi',
    trainingPlan,
    allWorkouts,
  },
  {
    id: 'manny',
    athleteName: 'Manny',
    title: '15-Week Level 3 Half Marathon Training Plan: Weight Loss Edition',
    description: 'Higher-volume 80/20 plan with 75-minute foundation runs and Manny-specific HR zones.',
    lactateThresholdHr: 167,
    thresholdPace: 'Zone 3: 160-167 bpm',
    trainingPlan: mannyTrainingPlan,
    allWorkouts: mannyAllWorkouts,
  },
]

export function getTrainingPlanProfile(planId: PlanId) {
  return trainingPlanProfiles.find((profile) => profile.id === planId) ?? trainingPlanProfiles[0]
}
