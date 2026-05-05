export type Zone = {
  id: string
  name: string
  bpm: string
  pace: string
  effort: string
  purpose: string
  tone: 'cyan' | 'green' | 'warning' | 'purple' | 'orange' | 'red'
}

export const lactateThresholdHr = 161
export const thresholdPace = '8:19/mi'

export const zones: Zone[] = [
  {
    id: 'z1',
    name: 'Zone 1',
    bpm: '121-129 bpm',
    pace: 'Slower than 11:30/mi',
    effort: '1-2',
    purpose: 'Recovery and very easy aerobic work',
    tone: 'cyan',
  },
  {
    id: 'z2',
    name: 'Zone 2',
    bpm: '130-143 bpm',
    pace: '10:45-11:30/mi',
    effort: '3-4',
    purpose: 'Main easy endurance zone',
    tone: 'green',
  },
  {
    id: 'black-hole',
    name: 'Black Hole',
    bpm: '144-154 bpm',
    pace: 'Between easy and tempo',
    effort: '4.5-5',
    purpose: 'Not easy enough for recovery, not hard enough for quality work. Easy days should avoid this zone.',
    tone: 'warning',
  },
  {
    id: 'z3',
    name: 'Zone 3',
    bpm: '155-161 bpm',
    pace: '8:19/mi tempo pace',
    effort: '5.5-6',
    purpose: 'Tempo / threshold',
    tone: 'purple',
  },
  {
    id: 'z4',
    name: 'Zone 4',
    bpm: '164-169 bpm',
    pace: '7:30-8:00/mi',
    effort: '7-8',
    purpose: 'VO2max intervals',
    tone: 'orange',
  },
  {
    id: 'z5',
    name: 'Zone 5',
    bpm: '171+ bpm',
    pace: 'Faster than 7:15/mi',
    effort: '9-10',
    purpose: 'Speed / short hard bursts',
    tone: 'red',
  },
]

export const zoneTargets: Record<string, { bpm: string; pace: string; reminder: string }> = {
  Z1: { bpm: '121-129 bpm', pace: 'Slower than 11:30/mi', reminder: 'Keep it truly relaxed.' },
  Z2: { bpm: '130-143 bpm', pace: '10:45-11:30/mi', reminder: 'Stay under 143 bpm.' },
  Z3: { bpm: '155-161 bpm', pace: '8:19/mi tempo pace', reminder: 'Controlled tempo, not a race.' },
  Z4: { bpm: '164-169 bpm', pace: '7:30-8:00/mi', reminder: 'Hard reps with honest recovery.' },
  Z5: { bpm: '171+ bpm', pace: 'Faster than 7:15/mi', reminder: 'Short, sharp, and clean.' },
  Rest: { bpm: 'No target', pace: 'No target', reminder: 'Recover so the next workout works.' },
  Race: { bpm: '155-169 bpm', pace: '8:15-8:45/mi', reminder: 'Start controlled, finish brave.' },
}
