import type { CSSProperties } from 'react'
import type { useProgress } from '../hooks/useProgress'
import type { WorkoutLibraryEntry } from '../data/workoutLibrary'

type Summary = ReturnType<typeof useProgress>['summary']
type AccentTone = WorkoutLibraryEntry['color'] | 'magenta'

const metrics = [
  { key: 'complete', label: 'Complete', tone: 'cyan' },
  { key: 'done', label: 'Done', tone: 'green' },
  { key: 'week', label: 'Week', tone: 'magenta' },
  { key: 'longest', label: 'Long', tone: 'gold' },
] as const

function progressColor(percent: number) {
  const clamped = Math.max(0, Math.min(100, percent)) / 100
  const start = { r: 255, g: 59, b: 112 }
  const end = { r: 66, g: 247, b: 155 }
  const r = Math.round(start.r + (end.r - start.r) * clamped)
  const g = Math.round(start.g + (end.g - start.g) * clamped)
  const b = Math.round(start.b + (end.b - start.b) * clamped)
  return `rgb(${r}, ${g}, ${b})`
}

export function ProgressSummary({
  summary,
  currentWeek,
  currentWeekTone = 'magenta',
}: {
  summary: Summary
  currentWeek: number
  currentWeekTone?: AccentTone
}) {
  const completeTone = progressColor(summary.percentage)
  const values = {
    complete: `${summary.percentage}%`,
    done: summary.completed,
    week: currentWeek,
    longest: summary.longestRun ? `${summary.longestRun} mi` : '-',
  }

  return (
    <section className="summary-grid" aria-label="Progress summary">
      {metrics.map((metric) => {
        const style = metric.key === 'complete'
          ? { '--tone': completeTone } as CSSProperties
          : undefined
        const className = metric.key === 'week'
          ? `stat-card current-week ${currentWeekTone}`
          : metric.key === 'complete'
            ? 'stat-card progress-complete'
            : `stat-card ${metric.tone}`

        return (
          <div className={className} style={style} key={metric.key}>
            <span className="stat-icon" aria-hidden="true" />
            <strong>{values[metric.key]}</strong>
            <p>{metric.label}</p>
          </div>
        )
      })}
    </section>
  )
}
