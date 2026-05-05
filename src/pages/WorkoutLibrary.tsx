import { workoutLibrary } from '../data/workoutLibrary'

export function WorkoutLibrary() {
  return (
    <main className="screen">
      <header className="screen-header">
        <p className="eyebrow">Workout definitions</p>
        <h1>Library</h1>
      </header>
      <div className="library-list">
        {workoutLibrary.map((entry) => (
          <article className={`library-card ${entry.color}`} key={entry.type}>
            <div className="zone-topline">
              <div>
                <span className="type-badge">{entry.zone}</span>
                <h2>{entry.name}</h2>
              </div>
              <span className="library-icon" aria-hidden="true" />
            </div>
            <p>{entry.what}</p>
            <dl className="library-facts">
              <div><dt>BPM</dt><dd>{entry.bpm}</dd></div>
              <div><dt>Pace</dt><dd>{entry.pace}</dd></div>
              <div><dt>Avoid</dt><dd>{entry.avoid}</dd></div>
            </dl>
          </article>
        ))}
      </div>
    </main>
  )
}
