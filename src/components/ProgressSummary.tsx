import type { useProgress } from '../hooks/useProgress'

type Summary = ReturnType<typeof useProgress>['summary']

const metrics = [
  { key: 'complete', label: 'Complete', tone: 'cyan' },
  { key: 'done', label: 'Workouts done', tone: 'green' },
  { key: 'week', label: 'Current week', tone: 'magenta' },
  { key: 'longest', label: 'Longest run', tone: 'gold' },
] as const

export function ProgressSummary({ summary, currentWeek }: { summary: Summary; currentWeek: number }) {
  const values = {
    complete: `${summary.percentage}%`,
    done: summary.completed,
    week: currentWeek,
    longest: summary.longestRun ? `${summary.longestRun} mi` : '-',
  }

  return (
    <section className="summary-grid" aria-label="Progress summary">
      {metrics.map((metric) => (
        <div className={`stat-card ${metric.tone}`} key={metric.key}>
          <span className="stat-icon" aria-hidden="true" />
          <strong>{values[metric.key]}</strong>
          <p>{metric.label}</p>
        </div>
      ))}
    </section>
  )
}
