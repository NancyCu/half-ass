export type WorkoutType =
  | 'foundation'
  | 'recovery'
  | 'fast-finish'
  | 'speed-play'
  | 'hills'
  | 'cruise'
  | 'tempo'
  | 'short-interval'
  | 'long-interval'
  | 'mixed-interval'
  | 'long-run'
  | 'long-speed-play'
  | 'long-fast-finish'
  | 'rest'
  | 'race'

export type WorkoutLibraryEntry = {
  type: WorkoutType
  name: string
  color: 'cyan' | 'green' | 'purple' | 'orange' | 'gold' | 'gray' | 'race'
  zone: string
  what: string
  bpm: string
  pace: string
  avoid: string
}

export const workoutLibrary: WorkoutLibraryEntry[] = [
  {
    type: 'long-run',
    name: 'Long Run',
    color: 'gold',
    zone: 'Z1/Z2',
    what: 'The weekly endurance anchor. Aerobic volume first, ego nowhere.',
    bpm: 'Mostly 129-140 bpm after an easy Zone 1 start.',
    pace: 'Usually 10:15-11:20/mi, slower if HR climbs.',
    avoid: 'Do not race the long run or sit in the black hole for miles.',
  },
  {
    type: 'foundation',
    name: 'Foundation Run',
    color: 'cyan',
    zone: 'Z1/Z2',
    what: 'A steady aerobic run that builds durability without draining the legs.',
    bpm: 'Warm up in Z1, then live mostly at 129-140 bpm.',
    pace: 'Usually 10:15-11:20/mi once settled.',
    avoid: 'Do not drift into 141-145 bpm just because the pace feels easy.',
  },
  {
    type: 'recovery',
    name: 'Recovery Run',
    color: 'green',
    zone: 'Z1',
    what: 'A short shakeout used to absorb training and keep the habit alive.',
    bpm: '118-128 bpm.',
    pace: '11:20+/mi.',
    avoid: 'Do not turn recovery into secret endurance work.',
  },
  {
    type: 'fast-finish',
    name: 'Fast Finish Run',
    color: 'purple',
    zone: 'Z1/Z2/Z3',
    what: 'An easy run that finishes with controlled tempo pressure.',
    bpm: 'Mostly 129-140 bpm, final block 146-152 bpm.',
    pace: 'Easy at 10:15-11:20/mi, final block around 8:40-9:20/mi.',
    avoid: 'Do not start the fast part early.',
  },
  {
    type: 'speed-play',
    name: 'Speed Play Run',
    color: 'orange',
    zone: 'Z4/Z5 with Z1 recovery',
    what: 'Short faster repeats that build leg speed without a formal track session.',
    bpm: 'Reps can touch 153-159+ bpm if reachable; recover back toward Z1.',
    pace: 'Reps around 7:50-8:30/mi or faster when short.',
    avoid: 'Do not shorten the easy recoveries.',
  },
  {
    type: 'hills',
    name: 'Hill Repetition Run',
    color: 'orange',
    zone: 'Z5 hills',
    what: 'Short uphill reps for power, form, and neuromuscular snap.',
    bpm: 'Hard uphill effort; 159+ bpm may appear near the end of reps if reachable.',
    pace: 'Run by effort on the hill, not flat-ground pace.',
    avoid: 'Do not sprint with sloppy form or race the downhill.',
  },
  {
    type: 'cruise',
    name: 'Cruise Interval Run',
    color: 'purple',
    zone: 'Z3',
    what: 'Repeated threshold blocks with short easy recoveries.',
    bpm: 'Work blocks at 146-152 bpm.',
    pace: '8:40-9:20/mi on the work blocks.',
    avoid: 'Do not turn the first rep into a time trial.',
  },
  {
    type: 'tempo',
    name: 'Tempo Run',
    color: 'purple',
    zone: 'Z3',
    what: 'One sustained controlled block near threshold.',
    bpm: '146-152 bpm.',
    pace: '8:40-9:20/mi.',
    avoid: 'Do not chase Zone 4. Tempo should feel repeatable.',
  },
  {
    type: 'short-interval',
    name: 'Short Interval Run',
    color: 'orange',
    zone: 'Z5',
    what: 'One-minute hard repeats for speed and efficiency.',
    bpm: 'Reps can reach 159+ bpm if reachable.',
    pace: 'Faster than 7:45/mi when terrain allows.',
    avoid: 'Do not jog the warmup too fast.',
  },
  {
    type: 'long-interval',
    name: 'Long Interval Run',
    color: 'orange',
    zone: 'Z4',
    what: 'Longer VO2max repeats with enough recovery to keep quality high.',
    bpm: '153-158 bpm on reps.',
    pace: '7:50-8:30/mi on reps.',
    avoid: 'Do not force the pace if HR will not recover.',
  },
  {
    type: 'mixed-interval',
    name: 'Mixed Interval Run 2',
    color: 'orange',
    zone: 'Z3/Z4/Z5',
    what: 'A ladder-style quality workout mixing short speed, VO2, and tempo.',
    bpm: 'Z5 for short bursts, Z4 for longer reps, Z3 for tempo.',
    pace: 'Use each zone target instead of one fixed pace.',
    avoid: 'Do not let the whole session blur into medium-hard.',
  },
  {
    type: 'long-speed-play',
    name: 'Long Run with Speed Play',
    color: 'gold',
    zone: 'Z2 with short Z4/Z5 surges',
    what: 'A long aerobic run with brief controlled surges to keep the legs awake.',
    bpm: 'Most miles at 129-140 bpm; surges may climb briefly.',
    pace: 'Easy long-run pace with short faster pickups.',
    avoid: 'Do not let the surges wreck the long-run purpose.',
  },
  {
    type: 'long-fast-finish',
    name: 'Long Run with Fast Finish',
    color: 'gold',
    zone: 'Z2/Z3',
    what: 'A long run that closes with race-specific pressure.',
    bpm: 'Mostly 129-140 bpm, final miles 146-152 bpm.',
    pace: 'Long-run easy pace, then 8:40-9:20/mi finish.',
    avoid: 'Do not run the middle miles in the black hole.',
  },
  {
    type: 'rest',
    name: 'Rest / Cross-train',
    color: 'gray',
    zone: 'Rest',
    what: 'A recovery day. Optional easy mobility, walking, or low-stress cross-training.',
    bpm: 'No run target.',
    pace: 'No run target.',
    avoid: 'Do not sneak in intensity because the plan looks light.',
  },
  {
    type: 'race',
    name: 'Race Day',
    color: 'race',
    zone: 'Z3/Z4',
    what: 'The half marathon. Controlled early, focused late.',
    bpm: 'Begin closer to Z3, allow Z4 late if you are still composed.',
    pace: 'Start conservative around threshold pace effort.',
    avoid: 'Do not donate the race in the first 5K.',
  },
]

export function getWorkoutLibraryEntry(type: WorkoutType) {
  return workoutLibrary.find((entry) => entry.type === type) ?? workoutLibrary[0]
}
