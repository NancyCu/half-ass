const zoneTone: Record<string, string> = {
  Z1: 'zone-chip-z1',
  Z2: 'zone-chip-z2',
  Z3: 'zone-chip-z3',
  Z4: 'zone-chip-z4',
  Z5: 'zone-chip-z5',
}

export function ZoneChips({ zones, compact = false }: { zones: string; compact?: boolean }) {
  const parts = zones.match(/Z\d/g) ?? [zones]

  return (
    <span className={compact ? 'zone-chip-row compact' : 'zone-chip-row'} aria-label={zones}>
      {parts.map((zone) => (
        <strong className={`zone-chip ${zoneTone[zone] ?? 'zone-chip-z2'}`} key={zone}>
          {zone}
        </strong>
      ))}
    </span>
  )
}
