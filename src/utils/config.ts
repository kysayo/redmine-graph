import type { GraphConfig } from '../types'

export function readConfig(container: HTMLElement): GraphConfig {
  return {
    comboLeft: (container.dataset.comboLeft as GraphConfig['comboLeft']) ?? 'cumulative',
    comboRight: (container.dataset.comboRight as GraphConfig['comboRight']) ?? 'daily',
    pieGroupBy: container.dataset.pieGroupBy ?? 'status',
  }
}
