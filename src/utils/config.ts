import type { GraphConfig, TeamPreset, UserSettings } from '../types'

export function readConfig(container: HTMLElement): GraphConfig {
  return {
    comboLeft: (container.dataset.comboLeft as GraphConfig['comboLeft']) ?? 'cumulative',
    comboRight: (container.dataset.comboRight as GraphConfig['comboRight']) ?? 'daily',
    pieGroupBy: container.dataset.pieGroupBy ?? 'status',
  }
}

// data-team-presets 属性からチームプリセットを読み込む
export function readTeamPresets(container: HTMLElement): TeamPreset[] {
  const raw = container.getAttribute('data-team-presets')
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (p): p is TeamPreset => typeof p?.name === 'string' && p?.settings != null
    )
  } catch {
    return []
  }
}

// data属性からデフォルトのユーザー設定を生成する（v2フォーマット）
export function buildDefaultSettings(_container: HTMLElement): UserSettings {
  return {
    version: 2,
    combos: [],
    pies: [],
    tileOrder: [],
  }
}
