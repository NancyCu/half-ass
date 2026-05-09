import { useMemo, useState } from 'react'
import type { TrainingPlanProfile } from '../data/trainingPlan'
import { workoutLibrary } from '../data/workoutLibrary'

export function WorkoutLibrary({ profile }: { profile: TrainingPlanProfile }) {
  const [selectedType, setSelectedType] = useState(workoutLibrary[0]?.type)
  const selectedEntry = workoutLibrary.find((entry) => entry.type === selectedType) ?? workoutLibrary[0]
  const variantsByType = useMemo(() => {
    return profile.allWorkouts.reduce<Record<string, typeof profile.allWorkouts>>((groups, workout) => {
      groups[workout.type] = [...(groups[workout.type] ?? []), workout]
      return groups
    }, {})
  }, [profile])
  const selectedVariants = selectedEntry ? variantsByType[selectedEntry.type] ?? [] : []
  const selectedVariantNames = [...new Set(selectedVariants.map((workout) => workout.name))]

  return (
    <main className="screen">
      <header className="screen-header">
        <p className="eyebrow">{profile.athleteName} · Workout definitions</p>
        <h1>Library</h1>
      </header>
      <div className="library-stack">
        <div className="library-index" aria-label="Workout types">
          {workoutLibrary.map((entry) => {
            const variants = variantsByType[entry.type] ?? []
            return (
              <button
                className={selectedEntry?.type === entry.type ? `library-index-card selected ${entry.color}` : `library-index-card ${entry.color}`}
                key={entry.type}
                type="button"
                onClick={() => setSelectedType(entry.type)}
              >
                <span className="type-badge">{entry.zone}</span>
                <strong>{entry.name}</strong>
                <em>{variants.length || 1} planned</em>
              </button>
            )
          })}
        </div>
        {selectedEntry ? (
          <article className={`library-card library-detail-card ${selectedEntry.color}`} key={selectedEntry.type}>
            <div className="zone-topline">
              <div>
                <span className="type-badge">{selectedEntry.zone}</span>
                <h2>{selectedEntry.name}</h2>
              </div>
              <span className="library-icon" aria-hidden="true" />
            </div>
            <p>{selectedEntry.what}</p>
            <dl className="library-facts">
              <div><dt>BPM</dt><dd>{selectedEntry.bpm}</dd></div>
              <div><dt>Pace</dt><dd>{selectedEntry.pace}</dd></div>
              <div><dt>Avoid</dt><dd>{selectedEntry.avoid}</dd></div>
            </dl>
            {selectedVariants.length ? (
              <div className="library-variant-list" aria-label={`${selectedEntry.name} plan variants`}>
                <p className="eyebrow">Plan versions</p>
                <div>
                  {selectedVariantNames.slice(0, 8).map((name) => (
                    <span key={name}>{name}</span>
                  ))}
                </div>
              </div>
            ) : null}
          </article>
        ) : null}
      </div>
    </main>
  )
}
