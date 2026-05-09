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

export const mannyZones: Zone[] = [
  { id: 'z1', name: 'Zone 1', bpm: '125-134 bpm', pace: 'Recovery effort', effort: '1-2', purpose: 'Recovery and warm-up', tone: 'cyan' },
  { id: 'z2', name: 'Zone 2', bpm: '135-149 bpm', pace: 'Comfortable aerobic', effort: '3-4', purpose: 'Fat-burning sweet spot', tone: 'green' },
  { id: 'black-hole', name: 'Black Hole', bpm: '150-159 bpm', pace: 'Between easy and threshold', effort: '4.5-5', purpose: 'Avoid this middle-ground intensity on easy days.', tone: 'warning' },
  { id: 'z3', name: 'Zone 3', bpm: '160-167 bpm', pace: 'Somewhat hard', effort: '5.5-6', purpose: 'Threshold / ventilatory threshold', tone: 'purple' },
  { id: 'z4', name: 'Zone 4', bpm: '170-175 bpm', pace: 'Hard', effort: '7-8', purpose: 'VO2max capacity building', tone: 'orange' },
  { id: 'z5', name: 'Zone 5', bpm: '177+ bpm', pace: 'Extremely hard', effort: '9-10', purpose: 'Neuromuscular speed and power', tone: 'red' },
]

export const mannyZoneTargets: Record<string, { bpm: string; pace: string; reminder: string }> = {
  Z1: { bpm: '125-134 bpm', pace: 'Recovery effort', reminder: 'Keep it truly relaxed.' },
  Z2: { bpm: '135-149 bpm', pace: 'Comfortable aerobic', reminder: 'Stay in the fat-burning sweet spot.' },
  Z3: { bpm: '160-167 bpm', pace: 'Somewhat hard', reminder: 'Controlled threshold, not a race.' },
  Z4: { bpm: '170-175 bpm', pace: 'Hard interval effort', reminder: 'Use pace/RPE early while HR catches up.' },
  Z5: { bpm: '177+ bpm', pace: 'Extremely hard', reminder: 'Short, sharp, and clean.' },
  Rest: { bpm: 'No target', pace: 'No target', reminder: 'Recover so the next workout works.' },
  Race: { bpm: '160-175 bpm', pace: 'Progress by HR and RPE', reminder: 'Zone 3 first, Zone 4 late only if strong.' },
}
