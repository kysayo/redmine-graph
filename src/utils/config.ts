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

// data属性からデフォルトのユーザー設定を生成する
export function buildDefaultSettings(container: HTMLElement): UserSettings {
  const left = (container.dataset.comboLeft as 'daily' | 'cumulative') ?? 'daily'
  const right = (container.dataset.comboRight as 'daily' | 'cumulative') ?? 'cumulative'

  return {
    version: 1,
    startDate: (() => {
      const d = new Date()
      d.setDate(d.getDate() - 14)
      return d.toISOString().slice(0, 10)
    })(),
    hideWeekends: false,
    pieLeft: { groupBy: 'status_id' },
    pieRight: { groupBy: 'tracker_id' },
    series: [
      {
        id: 'series-0',
        label: '発生チケット数',
        dateField: 'created_on',
        statusIds: [],
        chartType: 'bar',
        yAxisId: 'left',
        aggregation: left,
        color: '#93c5fd',
      },
      {
        id: 'series-1',
        label: '完了チケット数',
        dateField: 'closed_on',
        statusIds: [],
        chartType: 'line',
        yAxisId: 'right',
        aggregation: right,
        color: '#3b82f6',
      },
    ],
  }
}
