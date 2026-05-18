export type Zone = {
  id: string
  name: string
  bpm: string
  pace: string
  effort: string
  purpose: string
  tone: 'cyan' | 'green' | 'warning' | 'purple' | 'orange' | 'red'
}

export const lactateThresholdHr = 150
export const thresholdPace = '8:40/mi'

export const zones: Zone[] = [
  {
    id: 'z1',
    name: 'Zone 1',
    bpm: '118-128 bpm',
    pace: '11:20+/mi',
    effort: '1-2/10',
    purpose: 'Recovery, shakeouts, warmups, cooldowns.',
    tone: 'cyan',
  },
  {
    id: 'z2',
    name: 'Zone 2',
    bpm: '129-140 bpm',
    pace: '10:15-11:20/mi',
    effort: '3-4/10',
    purpose: 'Primary aerobic development zone. Most runs should happen here.',
    tone: 'green',
  },
  {
    id: 'black-hole',
    name: 'Black Hole Zone',
    bpm: '141-145 bpm',
    pace: '9:30-10:15/mi',
    effort: '4.5-5.5/10',
    purpose: 'Too hard for recovery. Too easy for quality. Avoid spending excessive time here.',
    tone: 'warning',
  },
  {
    id: 'z3',
    name: 'Zone 3',
    bpm: '146-152 bpm',
    pace: '8:40-9:20/mi',
    effort: '6-7/10',
    purpose: 'Threshold work, fast finishes, controlled tempo.',
    tone: 'purple',
  },
  {
    id: 'z4',
    name: 'Zone 4',
    bpm: '153-158 bpm',
    pace: '7:50-8:30/mi',
    effort: '7-8/10',
    purpose: 'VO2 and interval work. Use pace + RPE more than HR.',
    tone: 'orange',
  },
  {
    id: 'z5',
    name: 'Zone 5',
    bpm: '159+ bpm if reachable',
    pace: 'Faster than 7:45/mi',
    effort: '9-10/10',
    purpose: 'Strides, hill sprints, maximal efforts. Do not chase HR here.',
    tone: 'red',
  },
]

export const zoneTargets: Record<string, { bpm: string; pace: string; reminder: string }> = {
  Z1: { bpm: '118-128 bpm', pace: '11:20+/mi', reminder: 'Keep it truly relaxed.' },
  Z2: { bpm: '129-140 bpm', pace: '10:15-11:20/mi', reminder: 'Stay in the 129-140 bpm aerobic range.' },
  Z3: { bpm: '146-152 bpm', pace: '8:40-9:20/mi', reminder: 'Controlled tempo, not a race.' },
  Z4: { bpm: '153-158 bpm', pace: '7:50-8:30/mi', reminder: 'Hard reps with honest recovery; use pace and RPE more than HR.' },
  Z5: { bpm: '159+ bpm if reachable', pace: 'Faster than 7:45/mi', reminder: 'Short, sharp, and clean. Do not chase HR.' },
  Rest: { bpm: 'No target', pace: 'No target', reminder: 'Recover so the next workout works.' },
  Race: { bpm: '146-158 bpm', pace: '8:40-9:20/mi early, 7:50-8:30/mi late if strong', reminder: 'Start controlled, finish brave.' },
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
