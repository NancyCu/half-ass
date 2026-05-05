import { Download, Upload } from 'lucide-react'
import { ThemeToggle } from '../components/ThemeToggle'
import type { useProgress } from '../hooks/useProgress'
import type { SettingsState } from '../hooks/useSettings'
import { raceDateFromWeek1, week1FromRaceDate } from '../utils/dates'

type ProgressApi = ReturnType<typeof useProgress>

export function Settings({
  settings,
  updateSettings,
  resetSettings,
  progressApi,
}: {
  settings: SettingsState
  updateSettings: (patch: Partial<SettingsState>) => void
  resetSettings: () => void
  progressApi: ProgressApi
}) {
  function exportProgress() {
    const blob = new Blob([JSON.stringify(progressApi.progress, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'half-marathon-progress.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  async function importProgress(file?: File) {
    if (!file) return
    const text = await file.text()
    progressApi.importProgress(JSON.parse(text))
  }

  function resetAll() {
    if (window.confirm('Reset all settings and progress?')) {
      progressApi.resetProgress()
      resetSettings()
    }
  }

  return (
    <main className="screen">
      <header className="screen-header">
        <p className="eyebrow">Plan setup</p>
        <h1>Settings</h1>
      </header>
      <section className="settings-panel">
        <label>
          <span>Set Week 1 start date</span>
          <input
            type="date"
            value={settings.week1Start}
            onChange={(event) => updateSettings({ week1Start: event.target.value, raceDate: raceDateFromWeek1(event.target.value) })}
          />
        </label>
        <label>
          <span>Race date</span>
          <input type="date" value={settings.raceDate} onChange={(event) => updateSettings({ raceDate: event.target.value })} />
        </label>
        <button className="secondary-button full-width" type="button" onClick={() => updateSettings({ week1Start: week1FromRaceDate(settings.raceDate) })}>
          Align plan to race date
        </button>
      </section>
      <section className="settings-panel">
        <h2>Theme</h2>
        <ThemeToggle theme={settings.theme} onChange={(theme) => updateSettings({ theme })} />
      </section>
      <section className="settings-panel">
        <h2>Data</h2>
        <div className="button-row">
          <button className="secondary-button" type="button" onClick={exportProgress}>
            <Download size={18} /> Export JSON
          </button>
          <label className="secondary-button file-button">
            <Upload size={18} /> Import JSON
            <input type="file" accept="application/json" onChange={(event) => void importProgress(event.target.files?.[0])} />
          </label>
        </div>
        <button className="danger-button" type="button" onClick={resetAll}>Reset all data</button>
      </section>
    </main>
  )
}
