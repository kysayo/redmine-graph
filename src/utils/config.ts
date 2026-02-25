import type { GraphConfig, UserSettings } from '../types'

export function readConfig(container: HTMLElement): GraphConfig {
  return {
    comboLeft: (container.dataset.comboLeft as GraphConfig['comboLeft']) ?? 'cumulative',
    comboRight: (container.dataset.comboRight as GraphConfig['comboRight']) ?? 'daily',
    pieGroupBy: container.dataset.pieGroupBy ?? 'status',
  }
}

// data属性からデフォルトのユーザー設定を生成する
export function buildDefaultSettings(container: HTMLElement): UserSettings {
  const left = (container.dataset.comboLeft as 'daily' | 'cumulative') ?? 'daily'
  const right = (container.dataset.comboRight as 'daily' | 'cumulative') ?? 'cumulative'

  return {
    version: 1,
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
