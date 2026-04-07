import { useCallback, useEffect, useMemo, useState } from 'react'
import { AssignmentMappingPanel } from './components/AssignmentMappingPanel'
import { ComboChart } from './components/ComboChart'
import { CrossTable } from './components/CrossTable'
import { EvmTile } from './components/EvmTile'
import { GraphSettingsPanel, mergePresetSettings } from './components/GraphSettingsPanel'
import { JournalCollectorTile } from './components/JournalCollectorTile'
import { JournalCountTile } from './components/JournalCountTile'
import { TileCard } from './components/TileCard'
import { HBarChart } from './components/HBarChart'
import { PieChart } from './components/PieChart'
import { SummaryCards } from './components/SummaryCards'
import type { CrossTableConfig, FilterField, FilterFieldOption, JournalCollectorConfig, JournalCountConfig, PieDataPoint, PieSeriesConfig, RedmineIssue, RedmineStatus, SeriesCondition, StackedBarDataPoint, UserSettings } from './types'
import { buildDefaultSettings, readTeamPresets } from './utils/config'
import { generatePieDummyData, generateSeriesDummyData } from './utils/dummyData'
import { fetchFilterFieldOptions, getAvailableColumnFilterFields, getAvailableDateFilterFields, getAvailableFilterFields } from './utils/filterValues'
import { aggregateCrossTable, aggregateEVM, aggregateIssues, aggregatePie, aggregateStackedBar } from './utils/issueAggregator'
import type { EVMAggregateResult } from './utils/issueAggregator'
import { computeEvmRegression } from './utils/evmRegression'
import type { EvmRegressionResult } from './utils/evmRegression'
import { FALLBACK_STATUSES, fetchAllIssues, fetchIssueDescription, fetchIssueStatuses, getStatusesFromPage } from './utils/redmineApi'
import { buildElapsedDaysBucketFilter, buildRedmineFilterUrl } from './utils/redmineFilterUrl'
import { loadSettings, saveSettings } from './utils/storage'
import { setHolidays } from './utils/dateUtils'
import { getProjectId } from './utils/urlParser'

interface Props {
  container: HTMLElement
}

interface IssueState {
  loading: boolean
  issues: RedmineIssue[] | null
  error: string | null
  fetchedCount: number
  totalCount: number | null
}

export function App({ container }: Props) {
  const apiKey = useMemo(() => container.dataset.apiKey ?? '', [container])
  const teamPresets = useMemo(() => readTeamPresets(container), [container])
  const projectId = useMemo(() => getProjectId(), [])
  const rawSearch = window.location.search

  // 祝日チケットID（data-holidays-issue-id 属性）から祝日リストを取得してセット
  const holidaysIssueId = useMemo(() => {
    const raw = container.dataset.holidaysIssueId
    return raw ? Number(raw) : null
  }, [container])

  // チームプリセット自動追従：ページロード時に適用済みプリセットを再適用
  useEffect(() => {
    if (!settings.appliedTeamPreset || teamPresets.length === 0) return
    const preset = teamPresets.find(tp => tp.name === settings.appliedTeamPreset)
    if (!preset) return
    const applied: UserSettings = {
      ...mergePresetSettings(settings, preset.settings),
      appliedTeamPreset: settings.appliedTeamPreset,
    }
    setSettings(applied)
    saveSettings(applied)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!holidaysIssueId) return
    fetchIssueDescription(holidaysIssueId, apiKey)
      .then(desc => {
        const parsed: unknown = JSON.parse(desc.trim())
        if (Array.isArray(parsed)) setHolidays(parsed as string[])
      })
      .catch(() => { /* フェッチ・パース失敗時は祝日なしで動作 */ })
  }, [holidaysIssueId, apiKey])

  // ユーザー設定（localStorageから初期化、なければdata属性からデフォルト生成）
  const [settings, setSettings] = useState<UserSettings>(() => {
    return loadSettings() ?? buildDefaultSettings(container)
  })

  // Redmineのステータス一覧
  const [statuses, setStatuses] = useState<RedmineStatus[]>([])
  const [statusesLoading, setStatusesLoading] = useState(true)

  // 絞り込み条件のフィールド一覧（window.availableFilters から取得）
  const [filterFields, setFilterFields] = useState<FilterField[]>([])
  // 日付型フィールド一覧（「特殊な日付」集計軸の選択肢）
  const [dateFilterFields, setDateFilterFields] = useState<FilterField[]>([])

  // クロス集計テーブルの列フィールド用（list + date）
  const [columnFilterFields, setColumnFilterFields] = useState<FilterField[]>([])

  // 取得済みチケット一覧（系列設定変更時に再集計するためstateで保持）
  const [issueState, setIssueState] = useState<IssueState>({
    loading: false,
    issues: null,
    error: null,
    fetchedCount: 0,
    totalCount: null,
  })

  // Graphセクションが開かれたときにフェッチを開始するフラグ
  const [shouldFetch, setShouldFetch] = useState(false)

  // クロス集計テーブルのフィールド選択肢（行/列フィールドのすべての値。0件行/列表示のため）
  const [crossTableFieldOptions, setCrossTableFieldOptions] = useState<Record<string, FilterFieldOption[]>>({})

  // fieldset#graph-section の折り畳み制御（Redmine の toggleFieldset に依存しない独自実装）
  useEffect(() => {
    const fieldset = document.getElementById('graph-section')
    if (!fieldset) {
      // 開発環境など graph-section がない場合は即フェッチ
      setShouldFetch(true)
      return
    }
    if (!fieldset.classList.contains('collapsed')) {
      // 既に展開済み
      setShouldFetch(true)
      return
    }

    const legend = fieldset.querySelector('legend')
    if (!legend) {
      // legend がない場合は MutationObserver で監視（フォールバック）
      const observer = new MutationObserver(() => {
        if (!fieldset.classList.contains('collapsed')) {
          setShouldFetch(true)
          observer.disconnect()
        }
      })
      observer.observe(fieldset, { attributes: true, attributeFilter: ['class'] })
      return () => observer.disconnect()
    }

    // Redmine の toggleFieldset に依存せず自前でトグルを制御
    // onclick 属性（toggleFieldset(this)）を退避して削除し、二重トグルを防ぐ
    const origOnclick = legend.getAttribute('onclick')
    legend.removeAttribute('onclick')

    let fetched = false
    const handleToggle = () => {
      const isCollapsed = fieldset.classList.contains('collapsed')
      fieldset.classList.toggle('collapsed')
      legend.classList.toggle('icon-collapsed', !isCollapsed)
      legend.classList.toggle('icon-expanded', isCollapsed)
      const div = fieldset.querySelector<HTMLElement>(':scope > div')
      if (div) {
        if (isCollapsed) {
          div.classList.remove('hidden')
          div.style.removeProperty('display')
          if (!fetched) { fetched = true; setShouldFetch(true) }
        } else {
          div.classList.add('hidden')
        }
      }
    }

    legend.addEventListener('click', handleToggle)
    return () => {
      legend.removeEventListener('click', handleToggle)
      if (origOnclick) legend.setAttribute('onclick', origOnclick)
    }
  }, [])

  useEffect(() => {
    if (!shouldFetch) return
    // フィルタフィールド一覧を取得（window.availableFilters から）
    setFilterFields(getAvailableFilterFields())
    setDateFilterFields(getAvailableDateFilterFields())
    setColumnFilterFields(getAvailableColumnFilterFields())
    const pageStatuses = getStatusesFromPage()
    if (pageStatuses !== null) {
      setStatuses(pageStatuses)
      setStatusesLoading(false)
      return
    }
    fetchIssueStatuses(apiKey)
      .then(setStatuses)
      .catch(() => setStatuses(FALLBACK_STATUSES))
      .finally(() => setStatusesLoading(false))
  }, [apiKey, shouldFetch])

  // クロス集計テーブルの行/列フィールドの全選択肢を取得（0件行/列を表示するため）
  useEffect(() => {
    if (!shouldFetch) return
    const tables = settings.tables ?? []
    const fields = new Set<string>()
    for (const t of tables) {
      if (t.rowGroupBy) fields.add(t.rowGroupBy)
      if (t.colGroupBy) fields.add(t.colGroupBy)
      for (const sec of t.colSections ?? []) {
        if (sec.colGroupBy) fields.add(sec.colGroupBy)
      }
    }
    Promise.all(
      Array.from(fields).map(field =>
        fetchFilterFieldOptions(field, apiKey).then(opts => ({ field, opts })).catch(() => null)
      )
    ).then(results => {
      const next: Record<string, FilterFieldOption[]> = {}
      for (const r of results) {
        if (r) next[r.field] = r.opts
      }
      setCrossTableFieldOptions(prev => {
        const merged = { ...prev, ...next }
        return merged
      })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.tables, shouldFetch, apiKey])

  useEffect(() => {
    if (!shouldFetch) return
    setIssueState({ loading: true, issues: null, error: null, fetchedCount: 0, totalCount: null })
    fetchAllIssues(projectId, rawSearch, apiKey, (progress) => {
      setIssueState(prev => ({
        ...prev,
        fetchedCount: progress.fetched,
        totalCount: progress.total,
      }))
    })
      .then((issues) => setIssueState({ loading: false, issues, error: null, fetchedCount: issues.length, totalCount: issues.length }))
      .catch((e: Error) => {
        // 開発環境などRedmineに接続できない場合はnullのまま（ダミーデータでフォールバック）
        setIssueState({ loading: false, issues: null, error: e.message, fetchedCount: 0, totalCount: null })
      })
  }, [projectId, rawSearch, apiKey, shouldFetch])

  const handleSettingsChange = useCallback((next: UserSettings) => {
    setSettings(next)
    saveSettings(next)
  }, [])

  const handleResetSettings = useCallback(() => {
    const defaults = buildDefaultSettings(container)
    setSettings(defaults)
    saveSettings(defaults)
  }, [container])

  const getFieldOptions = useCallback(
    (fieldKey: string) => fetchFilterFieldOptions(fieldKey, apiKey),
    [apiKey]
  )

  const handlePieSliceClick = useCallback((pie: PieSeriesConfig, slice: PieDataPoint) => {
    if (pie.groupBy === 'elapsed_days') {
      const bucket = pie.elapsedDaysBuckets?.find(b => b.label === slice.name)
      if (!bucket) return
      const url = buildRedmineFilterUrl(
        window.location.pathname,
        window.location.search,
        buildElapsedDaysBucketFilter(bucket, pie.elapsedDaysBaseField, pie.elapsedDaysMode),
        pie.conditions
      )
      window.open(url, '_blank', 'noopener')
      return
    }
    if (!slice.filterValues?.length) return
    const url = buildRedmineFilterUrl(
      window.location.pathname,
      window.location.search,
      { field: pie.groupBy, operator: '=', values: slice.filterValues },
      pie.conditions
    )
    window.open(url, '_blank', 'noopener')
  }, [])

  const handleBarSegmentClick = useCallback((
    pie: PieSeriesConfig,
    _name: string,
    mainFilterValues: string[] | undefined,
    segmentName: string,
    segmentFilterValues: string[] | undefined
  ) => {
    // colorRulesでグループ化されたセグメントの場合、グループ内の全ステータスIDをURLフィルタに使用する
    // （segmentFilterValuesは実際に観測されたIDのみのため、グループ定義の全IDを使用しないと漏れが生じる）
    let effectiveSegmentFilterValues = segmentFilterValues
    if (pie.colorBy === 'status_id' && pie.colorRules?.length) {
      const rule = pie.colorRules.find(r => r.name === segmentName)
      if (rule && statuses.length > 0) {
        const allGroupIds = rule.values.flatMap(statusName => {
          const s = statuses.find(st => st.name === statusName)
          return s ? [String(s.id)] : []
        })
        if (allGroupIds.length > 0) {
          effectiveSegmentFilterValues = allGroupIds
        }
      }
    }
    const url = buildRedmineFilterUrl(
      window.location.pathname,
      window.location.search,
      mainFilterValues?.length ? { field: pie.groupBy, operator: '=', values: mainFilterValues } : undefined,
      [
        ...(pie.conditions ?? []),
        ...(effectiveSegmentFilterValues?.length && pie.colorBy ? [{ field: pie.colorBy, operator: '=' as const, values: effectiveSegmentFilterValues }] : []),
      ]
    )
    window.open(url, '_blank', 'noopener')
  }, [statuses])

  const handleBarLabelClick = useCallback((
    pie: PieSeriesConfig,
    _name: string,
    mainFilterValues: string[] | undefined,
  ) => {
    const url = buildRedmineFilterUrl(
      window.location.pathname,
      window.location.search,
      mainFilterValues?.length ? { field: pie.groupBy, operator: '=', values: mainFilterValues } : undefined,
      pie.conditions ?? []
    )
    window.open(url, '_blank', 'noopener')
  }, [])

  function crossTableFieldCond(
    fieldKey: string,
    key: string,
    filterValues: string[],
    groupRules?: import('./types').PieGroupRule[]
  ): import('./types').SeriesCondition[] {
    // colKeyはインデックス文字列（multi-section）またはルール名（single-section）の両方に対応
    const ruleIdx = parseInt(key)
    const rule = (!isNaN(ruleIdx) && groupRules) ? groupRules[ruleIdx] : groupRules?.find(r => r.name === key)

    // 日付フィールド用条件（dateCondition が設定されている場合）
    if (rule?.dateCondition) {
      const { op, value } = rule.dateCondition
      if (op === 'empty') return [{ field: fieldKey, operator: '!*', values: [] }]
      if (op === 'not_empty') return [{ field: fieldKey, operator: '*', values: [] }]
      // 今日の JST 日付を取得
      const now = new Date()
      const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
      const today = jst.toISOString().slice(0, 10)
      let refDate = value === 'today' ? today : (value ?? today)
      let urlOp: import('./types').SeriesCondition['operator']
      if (op === '<') {
        // Redmine に strict < がないため、<= (yesterday) に変換
        const d = new Date(refDate)
        d.setDate(d.getDate() - 1)
        refDate = d.toISOString().slice(0, 10)
        urlOp = '<='
      } else if (op === '>') {
        // > を >= (tomorrow) に変換
        const d = new Date(refDate)
        d.setDate(d.getDate() + 1)
        refDate = d.toISOString().slice(0, 10)
        urlOp = '>='
      } else {
        urlOp = op
      }
      return [{ field: fieldKey, operator: urlOp, values: [refDate] }]
    }

    const isNoData = rule?.values.includes('(No data)') && filterValues.length === 0
    if (isNoData) return [{ field: fieldKey, operator: '!*', values: [] }]
    return filterValues.length ? [{ field: fieldKey, operator: '=', values: filterValues }] : []
  }

  function andCondFiltersFromMap(andCondFvs: Record<string, string[]>): SeriesCondition[] {
    return Object.entries(andCondFvs).map(([field, values]) => ({ field, operator: '=' as const, values }))
  }

  function andDateCondFiltersFromRules(
    groupRules: import('./types').PieGroupRule[] | undefined,
    key: string
  ): SeriesCondition[] {
    const ruleIdx = parseInt(key)
    const rule = (!isNaN(ruleIdx) && groupRules) ? groupRules[ruleIdx] : groupRules?.find(r => r.name === key)
    if (!rule?.andConditions) return []
    const result: SeriesCondition[] = []
    for (const cond of rule.andConditions) {
      if (!cond.dateCondition) continue
      const { op, value } = cond.dateCondition
      if (op === 'empty') { result.push({ field: cond.field, operator: '!*', values: [] }); continue }
      if (op === 'not_empty') { result.push({ field: cond.field, operator: '*', values: [] }); continue }
      const now = new Date()
      const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
      const today = jst.toISOString().slice(0, 10)
      let refDate = value === 'today' ? today : (value ?? today)
      let urlOp: SeriesCondition['operator']
      if (op === '<') {
        const d = new Date(refDate); d.setDate(d.getDate() - 1); refDate = d.toISOString().slice(0, 10); urlOp = '<='
      } else if (op === '>') {
        const d = new Date(refDate); d.setDate(d.getDate() + 1); refDate = d.toISOString().slice(0, 10); urlOp = '>='
      } else {
        urlOp = op as SeriesCondition['operator']
      }
      result.push({ field: cond.field, operator: urlOp, values: [refDate] })
    }
    return result
  }

  const handleCrossTableCellClick = useCallback((
    table: CrossTableConfig,
    rowKey: string,
    colKey: string,
    rowFilterValues: string[],
    colFilterValues: string[],
    rowAndCondFvs: Record<string, string[]>,
    colAndCondFvs: Record<string, string[]>,
    sectionIndex?: number,
    sectionColGroupByPerKey?: Record<string, string>,
  ) => {
    const section = sectionIndex != null ? table.colSections?.[sectionIndex] : undefined
    const colGroupBy = (sectionColGroupByPerKey?.[colKey] ?? section?.colGroupBy) ?? table.colGroupBy
    const colGroupRules = section?.colGroupRules ?? table.colGroupRules
    const sectionConds = section?.conditions ?? []
    const url = buildRedmineFilterUrl(
      window.location.pathname,
      window.location.search,
      undefined,
      [
        ...(table.conditions ?? []),
        ...sectionConds,
        ...crossTableFieldCond(table.rowGroupBy, rowKey, rowFilterValues, table.rowGroupRules),
        ...andCondFiltersFromMap(rowAndCondFvs),
        ...andDateCondFiltersFromRules(table.rowGroupRules, rowKey),
        ...crossTableFieldCond(colGroupBy, colKey, colFilterValues, colGroupRules),
        ...andCondFiltersFromMap(colAndCondFvs),
        ...andDateCondFiltersFromRules(colGroupRules, colKey),
      ]
    )
    window.open(url, '_blank', 'noopener')
  }, [])

  const handleCrossTableRowTotalClick = useCallback((
    table: CrossTableConfig,
    rowKey: string,
    rowFilterValues: string[],
    rowAndCondFvs: Record<string, string[]>
  ) => {
    const url = buildRedmineFilterUrl(
      window.location.pathname,
      window.location.search,
      undefined,
      [
        ...(table.conditions ?? []),
        ...crossTableFieldCond(table.rowGroupBy, rowKey, rowFilterValues, table.rowGroupRules),
        ...andCondFiltersFromMap(rowAndCondFvs),
      ]
    )
    window.open(url, '_blank', 'noopener')
  }, [])

  const handleCrossTableColTotalClick = useCallback((
    table: CrossTableConfig,
    colKey: string,
    colFilterValues: string[],
    colAndCondFvs: Record<string, string[]>,
    sectionIndex?: number,
    sectionColGroupByPerKey?: Record<string, string>,
  ) => {
    const section = sectionIndex != null ? table.colSections?.[sectionIndex] : undefined
    const colGroupBy = (sectionColGroupByPerKey?.[colKey] ?? section?.colGroupBy) ?? table.colGroupBy
    const colGroupRules = section?.colGroupRules ?? table.colGroupRules
    const sectionConds = section?.conditions ?? []
    const url = buildRedmineFilterUrl(
      window.location.pathname,
      window.location.search,
      undefined,
      [
        ...(table.conditions ?? []),
        ...sectionConds,
        ...crossTableFieldCond(colGroupBy, colKey, colFilterValues, colGroupRules),
        ...andCondFiltersFromMap(colAndCondFvs),
        ...andDateCondFiltersFromRules(colGroupRules, colKey),
      ]
    )
    window.open(url, '_blank', 'noopener')
  }, [])

  const handleCrossTableGrandTotalClick = useCallback((table: CrossTableConfig) => {
    const url = buildRedmineFilterUrl(
      window.location.pathname,
      window.location.search,
      undefined,
      table.conditions ?? []
    )
    window.open(url, '_blank', 'noopener')
  }, [])

  const handleSummaryCardClick = useCallback((conditions: SeriesCondition[]) => {
    const url = buildRedmineFilterUrl(
      window.location.pathname,
      window.location.search,
      undefined,
      conditions
    )
    window.open(url, '_blank', 'noopener')
  }, [])

  // 複数2軸グラフ用データ（combos配列の長さ分を集計）
  const combosData = useMemo(() => {
    return (settings.combos ?? []).map(combo => {
      // startWeeksAgo が設定されている場合は今日からN週前を動的に計算
      let startDate = combo.startDate
      if (combo.startWeeksAgo != null && combo.startWeeksAgo > 0) {
        const d = new Date()
        d.setDate(d.getDate() - combo.startWeeksAgo * 7)
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        startDate = `${y}-${m}-${day}`
      }
      const options = {
        startDate,
        hideWeekends: combo.hideWeekends ?? false,
        weeklyMode: combo.weeklyMode ?? false,
        anchorDay: combo.anchorDay ?? 1,
        futureWeeks: (combo.showFuture ?? false) ? (combo.futureWeeks ?? 1) : 0,
      }
      if (issueState.issues !== null) {
        return aggregateIssues(issueState.issues, combo.series, options)
      }
      // Redmineに接続できない場合はダミーデータ
      return generateSeriesDummyData(combo.series, options)
    })
  }, [issueState.issues, settings.combos])

  const piesData = useMemo(() => {
    return (settings.pies ?? []).map((pie, i) => {
      if (issueState.issues !== null) return aggregatePie(issueState.issues, pie.groupBy, pie.conditions, pie.groupRules, pie.elapsedDaysBuckets, pie.elapsedDaysBaseField, pie.elapsedDaysMode)
      return generatePieDummyData(i === 0 ? 'status' : 'tracker')
    })
  }, [issueState.issues, settings.pies])

  const crossTablesData = useMemo(() => {
    return (settings.tables ?? []).map(table => {
      if (issueState.issues === null) return null
      const hasSections = (table.colSections?.length ?? 0) > 0
      if (!table.rowGroupBy || (!hasSections && !table.colGroupBy)) return null
      const rowOptions = crossTableFieldOptions[table.rowGroupBy]
      const colOptions = hasSections ? undefined : crossTableFieldOptions[table.colGroupBy]
      const colSectionOptions = hasSections
        ? table.colSections!.map(sec => crossTableFieldOptions[sec.colGroupBy] ?? [])
        : undefined
      return aggregateCrossTable(issueState.issues, table, rowOptions, colOptions, colSectionOptions)
    })
  }, [issueState.issues, settings.tables, crossTableFieldOptions])

  // EVMタイル集計
  const evmTilesData = useMemo((): (EVMAggregateResult | null)[] => {
    return (settings.evmTiles ?? []).map(tile => {
      if (issueState.issues === null) return null
      return aggregateEVM(issueState.issues, tile)
    })
  }, [issueState.issues, settings.evmTiles])

  // EVM係数逆算結果
  const evmRegressionResults = useMemo((): (EvmRegressionResult | null)[] => {
    return (settings.evmTiles ?? []).map(tile => {
      if (issueState.issues === null) return null
      if (!tile.monthlyActuals?.length) return null
      return computeEvmRegression(issueState.issues, tile)
    })
  }, [issueState.issues, settings.evmTiles])

  // 積み上げ棒グラフ用データ（colorBy指定時のみ生成）
  const piesStackedData = useMemo((): (StackedBarDataPoint[] | null)[] => {
    return (settings.pies ?? []).map(pie => {
      if (pie.chartType === 'bar' && pie.colorBy && issueState.issues !== null) {
        return aggregateStackedBar(issueState.issues, pie.groupBy, pie.colorBy, pie.conditions, pie.groupRules, pie.colorRules)
      }
      return null
    })
  }, [issueState.issues, settings.pies])

  function copyTile(ref: { type: string; id: string }) {
    const newId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const order = [...(settings.tileOrder ?? [])]
    const pos = order.findIndex(r => r.type === ref.type && r.id === ref.id)
    const insertAt = pos === -1 ? order.length : pos + 1

    if (ref.type === 'combo') {
      const orig = (settings.combos ?? []).find(c => c.id === ref.id)
      if (!orig) return
      const clone = JSON.parse(JSON.stringify(orig))
      clone.id = newId
      order.splice(insertAt, 0, { type: 'combo', id: newId })
      handleSettingsChange({ ...settings, combos: [...(settings.combos ?? []), clone], tileOrder: order })
    } else if (ref.type === 'pie') {
      const orig = (settings.pies ?? []).find(p => p.id === ref.id)
      if (!orig) return
      const clone = JSON.parse(JSON.stringify(orig))
      clone.id = newId
      order.splice(insertAt, 0, { type: 'pie', id: newId })
      handleSettingsChange({ ...settings, pies: [...(settings.pies ?? []), clone], tileOrder: order })
    } else if (ref.type === 'table') {
      const orig = (settings.tables ?? []).find(t => t.id === ref.id)
      if (!orig) return
      const clone = JSON.parse(JSON.stringify(orig))
      clone.id = newId
      order.splice(insertAt, 0, { type: 'table', id: newId })
      handleSettingsChange({ ...settings, tables: [...(settings.tables ?? []), clone], tileOrder: order })
    } else if (ref.type === 'evm') {
      const orig = (settings.evmTiles ?? []).find(e => e.id === ref.id)
      if (!orig) return
      const clone = JSON.parse(JSON.stringify(orig))
      clone.id = newId
      order.splice(insertAt, 0, { type: 'evm', id: newId })
      handleSettingsChange({ ...settings, evmTiles: [...(settings.evmTiles ?? []), clone], tileOrder: order })
    } else if (ref.type === 'assignment') {
      const orig = (settings.assignmentMappings ?? []).find(a => a.id === ref.id)
      if (!orig) return
      const clone = JSON.parse(JSON.stringify(orig))
      clone.id = newId
      order.splice(insertAt, 0, { type: 'assignment', id: newId })
      handleSettingsChange({ ...settings, assignmentMappings: [...(settings.assignmentMappings ?? []), clone], tileOrder: order })
    } else if (ref.type === 'heading') {
      const orig = (settings.headings ?? []).find(h => h.id === ref.id)
      if (!orig) return
      const clone = JSON.parse(JSON.stringify(orig))
      clone.id = newId
      order.splice(insertAt, 0, { type: 'heading', id: newId })
      handleSettingsChange({ ...settings, headings: [...(settings.headings ?? []), clone], tileOrder: order })
    }
  }

  // tileOrder に基づいて各タイルを描画するヘルパー
  function renderTile(ref: { type: string; id: string }, key: string) {
    if (ref.type === 'combo') {
      const idx = (settings.combos ?? []).findIndex(c => c.id === ref.id)
      if (idx === -1) return null
      const combo = settings.combos![idx]
      const comboData = combosData[idx]
      return (
        <TileCard key={key} style={{ gridColumn: '1 / -1', padding: '20px 24px' }} fileName={`combo-chart-${idx}`} onCopyTile={() => copyTile(ref)}>
          <h2 style={{ fontSize: 15, margin: '0 0 16px', fontWeight: 600, color: '#111827' }}>{combo.name || 'チケット推移'}</h2>
          {shouldFetch && issueState.loading && (
            <div style={{ padding: '12px 0', color: '#666', fontSize: 13 }}>
              <div style={{ marginBottom: 6 }}>
                {issueState.totalCount !== null
                  ? `チケットデータを取得中... (${issueState.fetchedCount}/${issueState.totalCount}件)`
                  : 'チケットデータを取得中...'
                }
              </div>
              {issueState.totalCount !== null && issueState.totalCount > 0 && (
                <div style={{ background: '#e5e7eb', borderRadius: 4, height: 6, width: '100%', maxWidth: 320 }}>
                  <div
                    style={{
                      background: '#3b82f6',
                      borderRadius: 4,
                      height: '100%',
                      width: `${Math.min(100, (issueState.fetchedCount / issueState.totalCount) * 100)}%`,
                      transition: 'width 0.2s ease',
                    }}
                  />
                </div>
              )}
            </div>
          )}
          {shouldFetch && !issueState.loading && issueState.error && issueState.issues === null && (
            <div style={{ padding: '4px 0 8px', color: '#999', fontSize: 11 }}>
              ※ Redmineに接続できないため、サンプルデータを表示しています
            </div>
          )}
          {shouldFetch && !issueState.loading && (
            <ComboChart
              data={comboData}
              series={combo.series}
              yAxisLeftMin={combo.yAxisLeftMin}
              yAxisLeftMinAuto={combo.yAxisLeftMinAuto}
              yAxisRightMax={combo.yAxisRightMax}
              dateFormat={combo.dateFormat}
              chartHeight={combo.chartHeight}
              showLabelsLeft={combo.showLabelsLeft}
              showLabelsRight={combo.showLabelsRight}
            />
          )}
        </TileCard>
      )
    }

    if (ref.type === 'pie') {
      const pies = settings.pies ?? []
      const i = pies.findIndex(p => p.id === ref.id)
      if (i === -1) return null
      const pie = pies[i]
      const pieData = piesData[i] ?? []
      const isWide = pieData.length > 10
      return (
        <TileCard
          key={key}
          style={{
            ...((pie.chartType === 'bar' ? pie.fullWidth !== false : isWide) ? { gridColumn: '1 / -1' } : {}),
            padding: '20px 16px',
          }}
          fileName={`tile-${i}`}
          onCopyTile={() => copyTile(ref)}
        >
          {issueState.loading ? (
            <div style={{ textAlign: 'center', padding: '40px 24px', color: '#666', fontSize: 13 }}>Now Loading...</div>
          ) : pie.chartType === 'bar' ? (
            <HBarChart
              data={pieData}
              stackedData={piesStackedData[i] ?? undefined}
              title={pie.label || filterFields.find(f => f.key === pie.groupBy)?.name || pie.groupBy}
              topN={pie.topN}
              onBarClick={!pie.colorBy && issueState.issues !== null ? (slice) => handlePieSliceClick(pie, slice) : undefined}
              onSegmentClick={pie.colorBy && issueState.issues !== null ? (name, mfv, seg, sfv) => handleBarSegmentClick(pie, name, mfv, seg, sfv) : undefined}
              onLabelClick={pie.colorBy && issueState.issues !== null ? (name, mfv) => handleBarLabelClick(pie, name, mfv) : undefined}
            />
          ) : pie.groupBy === 'elapsed_days' && issueState.issues !== null && !pie.elapsedDaysBuckets?.length ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>{pie.label || '経過日数'}</div>
              <div>バケット定義が設定されていません。</div>
              <div>設定パネルの「バケット定義」から「＋ バケットを追加」してください。</div>
            </div>
          ) : (
            <PieChart
              data={pieData}
              groupBy={pie.label || filterFields.find(f => f.key === pie.groupBy)?.name || pie.groupBy}
              onSliceClick={issueState.issues !== null ? (slice) => handlePieSliceClick(pie, slice) : undefined}
              wide={isWide}
            />
          )}
        </TileCard>
      )
    }

    if (ref.type === 'table') {
      const tables = settings.tables ?? []
      const i = tables.findIndex(t => t.id === ref.id)
      if (i === -1) return null
      const table = tables[i]
      const data = crossTablesData[i]
      const hasSections = (table.colSections?.length ?? 0) > 0
      const rowName = filterFields.find(f => f.key === table.rowGroupBy)?.name ?? table.rowGroupBy
      const colName = hasSections ? '' : (filterFields.find(f => f.key === table.colGroupBy)?.name ?? table.colGroupBy)
      const title = table.label || (hasSections ? rowName : `${rowName} × ${colName}`)
      return (
        <TileCard
          key={key}
          style={{
            ...(table.fullWidth !== false ? { gridColumn: '1 / -1' } : {}),
            padding: '20px 24px',
          }}
          fileName={`cross-table-${i}`}
          onCopyTile={() => copyTile(ref)}
        >
          {!data ? (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 12 }}>{title}</div>
              <div style={{ color: '#9ca3af', fontSize: 13, padding: '24px 0', textAlign: 'center' }}>
                {issueState.loading ? 'Now Loading...' : (!table.rowGroupBy || (!hasSections && !table.colGroupBy)) ? '行・列のフィールドを設定パネルで選択してください' : '該当チケットがありません'}
              </div>
            </div>
          ) : (
            <CrossTable
              data={data}
              title={title}
              onCellClick={issueState.issues !== null
                ? (rk, ck, rfv, cfv, si) => handleCrossTableCellClick(
                    table, rk, ck, rfv, cfv,
                    data.rowAndCondFilterValues?.[rk] ?? {},
                    si != null
                      ? (data.sections?.[si]?.colAndCondFilterValues?.[ck] ?? {})
                      : (data.colAndCondFilterValues?.[ck] ?? {}),
                    si,
                    si != null ? data.sections?.[si]?.colGroupByPerKey : undefined
                  )
                : undefined}
              onRowTotalClick={issueState.issues !== null ? (rk, rfv) => handleCrossTableRowTotalClick(table, rk, rfv, data.rowAndCondFilterValues?.[rk] ?? {}) : undefined}
              onColTotalClick={issueState.issues !== null
                ? (ck, cfv, si) => handleCrossTableColTotalClick(
                    table, ck, cfv,
                    si != null
                      ? (data.sections?.[si]?.colAndCondFilterValues?.[ck] ?? {})
                      : (data.colAndCondFilterValues?.[ck] ?? {}),
                    si,
                    si != null ? data.sections?.[si]?.colGroupByPerKey : undefined
                  )
                : undefined}
              onGrandTotalClick={
                data.sections
                  ? undefined
                  : (issueState.issues !== null ? () => handleCrossTableGrandTotalClick(table) : undefined)
              }
            />
          )}
        </TileCard>
      )
    }

    if (ref.type === 'evm') {
      const evmTiles = settings.evmTiles ?? []
      const i = evmTiles.findIndex(e => e.id === ref.id)
      if (i === -1) return null
      const tile = evmTiles[i]
      const data = evmTilesData[i]
      return (
        <TileCard
          key={key}
          style={{ gridColumn: '1 / -1', padding: '20px 24px' }}
          fileName={`evm-tile-${i}`}
          onCopyTile={() => copyTile(ref)}
        >
          {!data ? (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 12 }}>{tile.title || 'チケット数EVM'}</div>
              <div style={{ color: '#9ca3af', fontSize: 13, padding: '24px 0', textAlign: 'center' }}>
                {issueState.loading ? 'Now Loading...' : (!tile.startDate || !tile.endDate) ? '対象期間を設定パネルで入力してください' : 'データを集計中...'}
              </div>
            </div>
          ) : (
            <EvmTile
              config={tile}
              result={data}
              regressionResult={evmRegressionResults[i]}
              onApplyCoefficients={(coefficients) => {
                const newGroups = tile.groups.map((g, gi) => ({
                  ...g,
                  effortPerTicket: coefficients[gi] ?? g.effortPerTicket,
                }))
                handleSettingsChange({
                  ...settings,
                  evmTiles: (settings.evmTiles ?? []).map((t, ti) =>
                    ti === i ? { ...t, groups: newGroups } : t
                  ),
                })
              }}
            />
          )}
        </TileCard>
      )
    }

    if (ref.type === 'assignment') {
      const mappings = settings.assignmentMappings ?? []
      const i = mappings.findIndex(a => a.id === ref.id)
      if (i === -1) return null
      const mapping = mappings[i]
      return (
        <TileCard
          key={key}
          style={{
            ...(mapping.fullWidth !== false ? { gridColumn: '1 / -1' } : {}),
            padding: '20px 24px',
          }}
          fileName={`assignment-mapping-${i}`}
          onCopyTile={() => copyTile(ref)}
        >
          <AssignmentMappingPanel
            config={mapping}
            issues={issueState.issues}
            onExtraValuesChange={(extraValues) => {
              const next = (settings.assignmentMappings ?? []).map((t, ti) =>
                ti === i ? { ...t, extraValues } : t
              )
              handleSettingsChange({ ...settings, assignmentMappings: next })
            }}
          />
        </TileCard>
      )
    }

    if (ref.type === 'heading') {
      const heading = (settings.headings ?? []).find(h => h.id === ref.id)
      if (!heading) return null
      return (
        <div key={key} style={{ gridColumn: '1 / -1' }}>
          <div style={{
            borderLeft: `6px solid ${heading.color}`,
            background: heading.color + '22',
            padding: '10px 20px',
            borderRadius: 8,
          }}>
            <span style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>{heading.text}</span>
          </div>
        </div>
      )
    }

    if (ref.type === 'journal-collector') {
      const collectors = settings.journalCollectors ?? []
      const collector = collectors.find(c => c.id === ref.id)
      if (!collector) return null
      return (
        <div key={key} style={{ gridColumn: '1 / -1', background: '#fff', borderRadius: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <JournalCollectorTile
            config={collector}
            projectId={projectId}
            apiKey={apiKey}
            filterFields={filterFields}
            dateFilterFields={dateFilterFields}
            getFieldOptions={getFieldOptions}
            onUpdateConfig={(updated: JournalCollectorConfig) => {
              handleSettingsChange({
                ...settings,
                journalCollectors: collectors.map(c => c.id === updated.id ? updated : c),
              })
            }}
            onDelete={() => {
              handleSettingsChange({
                ...settings,
                journalCollectors: collectors.filter(c => c.id !== ref.id),
                tileOrder: (settings.tileOrder ?? []).filter(r => !(r.type === 'journal-collector' && r.id === ref.id)),
              })
            }}
          />
        </div>
      )
    }

    if (ref.type === 'journal-count') {
      const counts = settings.journalCounts ?? []
      const count = counts.find(c => c.id === ref.id)
      if (!count) return null
      return (
        <div key={key} style={{ gridColumn: '1 / -1', background: '#fff', borderRadius: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <JournalCountTile
            config={count}
            apiKey={apiKey}
            getFieldOptions={getFieldOptions}
            onUpdateConfig={(updated: JournalCountConfig) => {
              handleSettingsChange({
                ...settings,
                journalCounts: counts.map(c => c.id === updated.id ? updated : c),
              })
            }}
            onDelete={() => {
              handleSettingsChange({
                ...settings,
                journalCounts: counts.filter(c => c.id !== ref.id),
                tileOrder: (settings.tileOrder ?? []).filter(r => !(r.type === 'journal-count' && r.id === ref.id)),
              })
            }}
          />
        </div>
      )
    }

    return null
  }

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '16px', background: '#f3f4f6', borderRadius: 8 }}>
      <GraphSettingsPanel
        settings={settings}
        statuses={statuses}
        statusesLoading={statusesLoading}
        onChange={handleSettingsChange}
        onReset={handleResetSettings}
        teamPresets={teamPresets}
        filterFields={filterFields}
        dateFilterFields={dateFilterFields}
        columnFilterFields={columnFilterFields}
        getFieldOptions={getFieldOptions}
      />

      {(settings.summaryCards?.length ?? 0) > 0 && (
        <SummaryCards
          cards={settings.summaryCards!}
          issues={issueState.issues}
          onNumeratorClick={handleSummaryCardClick}
          onDenominatorClick={handleSummaryCardClick}
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {(settings.tileOrder ?? []).map(ref => renderTile(ref, `${ref.type}-${ref.id}`))}
      </div>
    </div>
  )
}
