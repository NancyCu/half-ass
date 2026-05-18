import { Download, Upload } from 'lucide-react'
import { ThemeToggle } from '../components/ThemeToggle'
import { trainingPlanProfiles, type PlanId, type TrainingPlanProfile } from '../data/trainingPlan'
import type { useProgress } from '../hooks/useProgress'
import type { SettingsState } from '../hooks/useSettings'
import type { ScheduleHandoffHistoryEntry } from '../lib/strideSyncScheduleHandoff'
import type { StrideSyncHandoffHistoryEntry } from '../lib/strideSyncHandoff'
import { raceDateFromWeek1, week1FromRaceDate } from '../utils/dates'

type ProgressApi = ReturnType<typeof useProgress>

export function Settings({
  settings,
  updateSettings,
  resetSettings,
  progressApi,
  activeProfile,
  automationHistory,
  scheduleHandoffHistory,
  onClearAutomationHistory,
  onClearScheduleHandoffHistory,
  onPlanChange,
}: {
  settings: SettingsState
  updateSettings: (patch: Partial<SettingsState>) => void
  resetSettings: () => void
  progressApi: ProgressApi
  activeProfile: TrainingPlanProfile
  automationHistory: StrideSyncHandoffHistoryEntry[]
  scheduleHandoffHistory: ScheduleHandoffHistoryEntry[]
  onClearAutomationHistory: () => void
  onClearScheduleHandoffHistory: () => void
  onPlanChange: (planId: PlanId) => void
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
        <h2>Plan athlete</h2>
        <div className="plan-slider" role="group" aria-label="Active training plan">
          {trainingPlanProfiles.map((profile) => (
            <button
              className={settings.planId === profile.id ? 'selected' : ''}
              type="button"
              key={profile.id}
              onClick={() => onPlanChange(profile.id)}
            >
              <strong>{profile.athleteName}</strong>
              <span>{profile.id === 'manny' ? 'Level 3' : 'Original'}</span>
            </button>
          ))}
        </div>
        <p className="settings-note">{activeProfile.description}</p>
      </section>
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
        <h2>StrideSync handoffs</h2>
        <label className="toggle-setting">
          <input
            checked={settings.autoAcceptStrideSyncHandoffs}
            type="checkbox"
            onChange={(event) => updateSettings({ autoAcceptStrideSyncHandoffs: event.target.checked })}
          />
          <span>
            <strong>Auto-accept trusted StrideSync handoffs</strong>
            <em>Only handoffs from StrideSync with matching date/workout are applied automatically. Review-level or invalid handoffs still require confirmation.</em>
          </span>
        </label>
        <details className="automation-history">
          <summary>
            <span>
              <strong>StrideSync automation history</strong>
              <em>{automationHistory.length ? `${Math.min(automationHistory.length, 10)} recent receipt${automationHistory.length === 1 ? '' : 's'}` : 'No automation receipts yet'}</em>
            </span>
          </summary>
          {automationHistory.length ? (
            <>
              <div className="automation-history-list">
                {automationHistory.slice(0, 10).map((entry) => (
                  <article className="automation-history-row" key={entry.id}>
                    <div>
                      <strong>{historyTitle(entry)}</strong>
                      <span>{historyMeta(entry)}</span>
                      {entry.reason ? <em>{entry.reason}</em> : null}
                    </div>
                    <span className={`automation-status-pill ${entry.status}`}>{historyStatus(entry)}</span>
                  </article>
                ))}
              </div>
              <button className="secondary-button full-width" type="button" onClick={onClearAutomationHistory}>
                Clear automation history
              </button>
            </>
          ) : (
            <p className="settings-note">Receipts stay in this browser only and do not affect workout progress.</p>
          )}
        </details>
        <details className="automation-history">
          <summary>
            <span>
              <strong>Schedule handoff history</strong>
              <em>{scheduleHandoffHistory.length ? `${Math.min(scheduleHandoffHistory.length, 10)} recent receipt${scheduleHandoffHistory.length === 1 ? '' : 's'}` : 'No schedule sends yet'}</em>
            </span>
          </summary>
          {scheduleHandoffHistory.length ? (
            <>
              <div className="automation-history-list">
                {scheduleHandoffHistory.slice(0, 10).map((entry) => (
                  <article className="automation-history-row" key={entry.id}>
                    <div>
                      <strong>{scheduleHistoryTitle(entry)}</strong>
                      <span>{scheduleHistoryMeta(entry)}</span>
                      <em>{scheduleHistoryNote(entry)}</em>
                    </div>
                    <span className={`automation-status-pill ${entry.status}`}>{scheduleHistoryStatus(entry)}</span>
                  </article>
                ))}
              </div>
              <button className="secondary-button full-width" type="button" onClick={onClearScheduleHandoffHistory}>
                Clear schedule handoff history
              </button>
            </>
          ) : (
            <p className="settings-note">Schedule handoff receipts stay in this browser only and cannot confirm whether StrideSync applied the change.</p>
          )}
        </details>
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

function historyTitle(entry: StrideSyncHandoffHistoryEntry) {
  const runName = entry.runName?.trim() || entry.workoutName
  return entry.status === 'applied'
    ? `Completed from StrideSync: ${runName}`
    : `StrideSync handoff: ${runName}`
}

function historyMeta(entry: StrideSyncHandoffHistoryEntry) {
  return [
    entry.date,
    formatMiles(entry.runDistance),
    formatMinutes(entry.runDuration),
    entry.runSource,
  ].filter(Boolean).join(' · ')
}

function historyStatus(entry: StrideSyncHandoffHistoryEntry) {
  if (entry.status === 'applied') return entry.mode === 'auto_accept' ? 'Auto accepted' : 'Manual'
  if (entry.status === 'dismissed') return 'Dismissed'
  if (entry.status === 'rejected') return 'Rejected'
  if (entry.status === 'duplicate') return 'Duplicate'
  return 'Undone'
}

function scheduleHistoryTitle(entry: ScheduleHandoffHistoryEntry) {
  return entry.summary
}

function scheduleHistoryMeta(entry: ScheduleHandoffHistoryEntry) {
  return [scheduleHistoryStatus(entry), formatHistoryDateTime(entry.updatedAt)].filter(Boolean).join(' · ')
}

function scheduleHistoryNote(entry: ScheduleHandoffHistoryEntry) {
  if (entry.status === 'opened') {
    return entry.attemptCount > 1
      ? `Opened ${entry.attemptCount} times from this browser. This phone cannot confirm whether StrideSync applied it.`
      : 'Open StrideSync to apply. This phone cannot confirm whether StrideSync applied it.'
  }
  if (entry.status === 'copied') return 'Link copied locally. Open StrideSync to apply. This phone cannot confirm whether StrideSync applied it.'
  if (entry.status === 'dismissed') return 'Dismissed locally. This phone cannot confirm whether StrideSync applied it.'
  if (entry.status === 'superseded') return 'Older handoff kept for reference only.'
  return 'Generated locally. This phone cannot confirm whether StrideSync applied it.'
}

function scheduleHistoryStatus(entry: ScheduleHandoffHistoryEntry) {
  if (entry.status === 'opened') return 'Sent to StrideSync'
  if (entry.status === 'copied') return 'Link copied'
  if (entry.status === 'dismissed') return 'Dismissed'
  if (entry.status === 'superseded') return 'Superseded'
  return 'Generated'
}

function formatMiles(value?: string) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? `${numericValue.toFixed(2)} mi` : null
}

function formatMinutes(value?: string) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? `${Math.round(numericValue)} min` : null
}

function formatHistoryDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
