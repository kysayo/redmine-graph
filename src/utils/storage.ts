import type { ComboChartConfig, PieSeriesConfig, Preset, TileRef, UserSettings } from '../types'
import { getProjectId } from './urlParser'

const STORAGE_VERSION = 2

function buildStorageKey(): string {
  return `redmine-graph:settings:${getProjectId()}`
}

function generateId(prefix: string, index: number): string {
  return `${prefix}-${index}`
}

/** v1設定をv2フォーマットに移行する */
function migrateV1ToV2(parsed: UserSettings): UserSettings {
  // pieLeft/pieRight → pies のインラインマイグレーション（v1内の旧移行）
  if (!parsed.pies) {
    const arr: PieSeriesConfig[] = []
    if (parsed.pieLeft) arr.push(parsed.pieLeft)
    if (parsed.pieRight) arr.push(parsed.pieRight)
    if (arr.length > 0) parsed.pies = arr
  }

  // pies にIDを付与
  const pies = (parsed.pies ?? []).map((p, i) => p.id ? p : { ...p, id: generateId('pie', i) })
  const tables = (parsed.tables ?? []).map((t, i) => t.id ? t : { ...t, id: generateId('table', i) })
  const evmTiles = (parsed.evmTiles ?? []).map((e, i) => e.id ? e : { ...e, id: generateId('evm', i) })
  const assignmentMappings = (parsed.assignmentMappings ?? []).map((a, i) => a.id ? a : { ...a, id: generateId('assignment', i) })

  // combos[0] を既存の series[] と軸設定から生成
  const combo0: ComboChartConfig = {
    id: 'combo-0',
    series: parsed.series ?? [],
    startDate: parsed.startDate,
    hideWeekends: parsed.hideWeekends,
    yAxisLeftMin: parsed.yAxisLeftMin,
    yAxisLeftMinAuto: parsed.yAxisLeftMinAuto,
    yAxisRightMax: parsed.yAxisRightMax,
    showLabelsLeft: parsed.showLabelsLeft,
    showLabelsRight: parsed.showLabelsRight,
    weeklyMode: parsed.weeklyMode,
    anchorDay: parsed.anchorDay,
    dateFormat: parsed.dateFormat,
    chartHeight: parsed.chartHeight,
  }

  // tileOrder を生成
  const tileOrder: TileRef[] = [
    { type: 'combo', id: 'combo-0' },
    ...pies.map(p => ({ type: 'pie' as const, id: p.id! })),
    ...tables.map(t => ({ type: 'table' as const, id: t.id! })),
    ...evmTiles.map(e => ({ type: 'evm' as const, id: e.id! })),
    ...assignmentMappings.map(a => ({ type: 'assignment' as const, id: a.id! })),
  ]

  return {
    ...parsed,
    version: STORAGE_VERSION,
    combos: [combo0],
    pies,
    tables,
    evmTiles,
    assignmentMappings,
    tileOrder,
  }
}

export function loadSettings(): UserSettings | null {
  try {
    const raw = localStorage.getItem(buildStorageKey())
    if (!raw) return null
    const parsed = JSON.parse(raw) as UserSettings
    if (parsed.version !== STORAGE_VERSION) {
      // バージョン違い（v1）→ マイグレーションして返す（設定を失わない）
      return migrateV1ToV2(parsed)
    }
    // v2だが tileOrder が欠落している場合（旧バージョン保存設定との互換）→ 再構築
    if (!parsed.tileOrder) {
      const tileOrder: TileRef[] = [
        ...(parsed.combos ?? []).map(c => ({ type: 'combo' as const, id: c.id })),
        ...(parsed.pies ?? []).map(p => ({ type: 'pie' as const, id: p.id! })),
        ...(parsed.tables ?? []).map(t => ({ type: 'table' as const, id: t.id! })),
        ...(parsed.evmTiles ?? []).map(e => ({ type: 'evm' as const, id: e.id! })),
        ...(parsed.assignmentMappings ?? []).map(a => ({ type: 'assignment' as const, id: a.id! })),
        ...(parsed.journalCounts ?? []).map(j => ({ type: 'journal-count' as const, id: j.id })),
      ]
      return { ...parsed, tileOrder }
    }
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
