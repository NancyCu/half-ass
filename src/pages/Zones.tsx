import { ZoneCard } from '../components/ZoneCard'
import { lactateThresholdHr, thresholdPace, zones } from '../data/zones'

export function Zones() {
  return (
    <main className="screen">
      <header className="screen-header">
        <p className="eyebrow">80/20 targets</p>
        <h1>Zone Control</h1>
      </header>
      <section className="threshold-panel">
        <div>
          <span>Lactate Threshold HR</span>
          <strong>{lactateThresholdHr} bpm</strong>
        </div>
        <div>
          <span>Threshold Pace</span>
          <strong>{thresholdPace}</strong>
        </div>
      </section>
      <div className="zone-list">
        {zones.map((zone) => <ZoneCard key={zone.id} zone={zone} />)}
      </div>
    </main>
  )
}
