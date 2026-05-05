import type { ThemeMode } from '../hooks/useSettings'

export function ThemeToggle({ theme, onChange }: { theme: ThemeMode; onChange: (theme: ThemeMode) => void }) {
  return (
    <div className="segmented-control" role="group" aria-label="Theme">
      <button className={theme === 'dark' ? 'selected' : ''} type="button" onClick={() => onChange('dark')}>
        Dark neon
      </button>
      <button className={theme === 'print' ? 'selected' : ''} type="button" onClick={() => onChange('print')}>
        Print light
      </button>
    </div>
  )
}
