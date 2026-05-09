import { ZoneCard } from '../components/ZoneCard'
import type { TrainingPlanProfile } from '../data/trainingPlan'
import type { Zone } from '../data/zones'

export function Zones({ profile, zones }: { profile: TrainingPlanProfile; zones: Zone[] }) {
  return (
    <main className="screen">
      <header className="screen-header">
        <p className="eyebrow">{profile.athleteName} · 80/20 targets</p>
        <h1>Zone Control</h1>
      </header>
      <section className="threshold-panel">
        <div>
          <span>Lactate Threshold HR</span>
          <strong>{profile.lactateThresholdHr} bpm</strong>
        </div>
        <div>
          <span>Threshold Pace</span>
          <strong>{profile.thresholdPace}</strong>
        </div>
      </section>
      <div className="zone-list">
        {zones.map((zone) => <ZoneCard key={zone.id} zone={zone} />)}
      </div>
    </main>
  )
}
