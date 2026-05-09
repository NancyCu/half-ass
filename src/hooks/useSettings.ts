import { useEffect, useState } from 'react'
import type { PlanId } from '../data/trainingPlan'
import { defaultWeek1Start, raceDateFromWeek1 } from '../utils/dates'

const STORAGE_KEY = 'half_ass_training_settings_v1'

export type ThemeMode = 'dark' | 'print'

export type SettingsState = {
  planId: PlanId
  week1Start: string
  raceDate: string
  theme: ThemeMode
}

function defaultSettings(): SettingsState {
  const week1Start = defaultWeek1Start()
  return {
    planId: 'mikey',
    week1Start,
    raceDate: raceDateFromWeek1(week1Start),
    theme: 'dark',
  }
}

function readSettings(): SettingsState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultSettings()
    return { ...defaultSettings(), ...(JSON.parse(raw) as Partial<SettingsState>) }
  } catch {
    return defaultSettings()
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<SettingsState>(() => {
    if (typeof window === 'undefined') return defaultSettings()
    return readSettings()
  })

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    document.documentElement.dataset.theme = settings.theme
  }, [settings])

  function updateSettings(patch: Partial<SettingsState>) {
    setSettings((current) => ({ ...current, ...patch }))
  }

  function resetSettings() {
    setSettings(defaultSettings())
  }

  return { settings, updateSettings, resetSettings }
}
