import type { Preset, UserSettings } from '../types'
import { getProjectId } from './urlParser'

const STORAGE_VERSION = 1

function buildStorageKey(): string {
  return `redmine-graph:settings:${getProjectId()}`
}

export function loadSettings(): UserSettings | null {
  try {
    const raw = localStorage.getItem(buildStorageKey())
    if (!raw) return null
    const parsed = JSON.parse(raw) as UserSettings
    if (parsed.version !== STORAGE_VERSION) return null
    return parsed
  } catch {
    return null
  }
}

export function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(buildStorageKey(), JSON.stringify(settings))
  } catch {
    // ストレージが使えない環境では無視
  }
}

const PRESETS_KEY = 'redmine-graph:presets'

export function loadPresets(): Preset[] {
  try {
    const raw = localStorage.getItem(PRESETS_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Preset[]
  } catch {
    return []
  }
}

export function savePresets(presets: Preset[]): void {
  try {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets))
  } catch {
    // ストレージが使えない環境では無視
  }
}
