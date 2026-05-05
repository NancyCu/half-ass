import type { Zone } from '../data/zones'

export function ZoneCard({ zone }: { zone: Zone }) {
  const isZoneTwo = zone.id === 'z2'
  const isBlackHole = zone.id === 'black-hole'

  return (
    <section className={`zone-card ${zone.tone} ${isZoneTwo ? 'primary-zone' : ''} ${isBlackHole ? 'black-hole-zone' : ''}`}>
      <div className="zone-topline">
        <h2>{zone.name}</h2>
        <span className="zone-badge">Effort {zone.effort}</span>
      </div>
      <dl className="zone-facts">
        <div>
          <dt>BPM</dt>
          <dd>{zone.bpm}</dd>
        </div>
        <div>
          <dt>Pace</dt>
          <dd>{zone.pace}</dd>
        </div>
      </dl>
      <p>{isBlackHole ? 'Not easy enough for easy days. Not hard enough for quality work.' : zone.purpose}</p>
    </section>
  )
}
