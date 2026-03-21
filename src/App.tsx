import { useCallback, useEffect, useMemo, useState } from 'react'
import { ComboChart } from './components/ComboChart'
import { CrossTable } from './components/CrossTable'
import { GraphSettingsPanel } from './components/GraphSettingsPanel'
import { TileCard } from './components/TileCard'
import { HBarChart } from './components/HBarChart'
import { PieChart } from './components/PieChart'
import { SummaryCards } from './components/SummaryCards'
import type { CrossTableConfig, FilterField, FilterFieldOption, PieDataPoint, PieSeriesConfig, RedmineIssue, RedmineStatus, SeriesCondition, StackedBarDataPoint, UserSettings } from './types'
import { buildDefaultSettings, readTeamPresets } from './utils/config'
import { generatePieDummyData, generateSeriesDummyData } from './utils/dummyData'
import { fetchFilterFieldOptions, getAvailableDateFilterFields, getAvailableFilterFields } from './utils/filterValues'
import { aggregateCrossTable, aggregateIssues, aggregatePie, aggregateStackedBar } from './utils/issueAggregator'
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
    defaults.startDate = undefined
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
    _segmentName: string,
    segmentFilterValues: string[] | undefined
  ) => {
    const url = buildRedmineFilterUrl(
      window.location.pathname,
      window.location.search,
      mainFilterValues?.length ? { field: pie.groupBy, operator: '=', values: mainFilterValues } : undefined,
      [
        ...(pie.conditions ?? []),
        ...(segmentFilterValues?.length && pie.colorBy ? [{ field: pie.colorBy, operator: '=' as const, values: segmentFilterValues }] : []),
      ]
    )
    window.open(url, '_blank', 'noopener')
  }, [])

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

  const handleCrossTableCellClick = useCallback((
    table: CrossTableConfig,
    _rowKey: string,
    _colKey: string,
    rowFilterValues: string[],
    colFilterValues: string[]
  ) => {
    const url = buildRedmineFilterUrl(
      window.location.pathname,
      window.location.search,
      undefined,
      [
        ...(table.conditions ?? []),
        ...(rowFilterValues.length ? [{ field: table.rowGroupBy, operator: '=' as const, values: rowFilterValues }] : []),
        ...(colFilterValues.length ? [{ field: table.colGroupBy, operator: '=' as const, values: colFilterValues }] : []),
      ]
    )
    window.open(url, '_blank', 'noopener')
  }, [])

  const handleCrossTableRowTotalClick = useCallback((
    table: CrossTableConfig,
    _rowKey: string,
    rowFilterValues: string[]
  ) => {
    const url = buildRedmineFilterUrl(
      window.location.pathname,
      window.location.search,
      undefined,
      [
        ...(table.conditions ?? []),
        ...(rowFilterValues.length ? [{ field: table.rowGroupBy, operator: '=' as const, values: rowFilterValues }] : []),
      ]
    )
    window.open(url, '_blank', 'noopener')
  }, [])

  const handleCrossTableColTotalClick = useCallback((
    table: CrossTableConfig,
    _colKey: string,
    colFilterValues: string[]
  ) => {
    const url = buildRedmineFilterUrl(
      window.location.pathname,
      window.location.search,
      undefined,
      [
        ...(table.conditions ?? []),
        ...(colFilterValues.length ? [{ field: table.colGroupBy, operator: '=' as const, values: colFilterValues }] : []),
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

  // チケットデータを系列設定に基づいて集計（取得済みチケットから再計算）
  const comboData = useMemo(() => {
    const options = {
      startDate: settings.startDate,
      hideWeekends: settings.hideWeekends ?? false,
      weeklyMode: settings.weeklyMode ?? false,
      anchorDay: settings.anchorDay ?? 1,
    }
    if (issueState.issues !== null) {
      return aggregateIssues(issueState.issues, settings.series, options)
    }
    // Redmineに接続できない場合はダミーデータ
    return generateSeriesDummyData(settings.series, options)
  }, [issueState.issues, settings.series, settings.startDate, settings.hideWeekends, settings.weeklyMode, settings.anchorDay])

  const piesData = useMemo(() => {
    return (settings.pies ?? []).map((pie, i) => {
      if (issueState.issues !== null) return aggregatePie(issueState.issues, pie.groupBy, pie.conditions, pie.groupRules, pie.elapsedDaysBuckets, pie.elapsedDaysBaseField, pie.elapsedDaysMode)
      return generatePieDummyData(i === 0 ? 'status' : 'tracker')
    })
  }, [issueState.issues, settings.pies])

  const crossTablesData = useMemo(() => {
    return (settings.tables ?? []).map(table => {
      if (issueState.issues === null) return null
      if (!table.rowGroupBy || !table.colGroupBy) return null
      const rowOptions = crossTableFieldOptions[table.rowGroupBy]
      const colOptions = crossTableFieldOptions[table.colGroupBy]
      return aggregateCrossTable(issueState.issues, table, rowOptions, colOptions)
    })
  }, [issueState.issues, settings.tables, crossTableFieldOptions])

  // 積み上げ棒グラフ用データ（colorBy指定時のみ生成）
  const piesStackedData = useMemo((): (StackedBarDataPoint[] | null)[] => {
    return (settings.pies ?? []).map(pie => {
      if (pie.chartType === 'bar' && pie.colorBy && issueState.issues !== null) {
        return aggregateStackedBar(issueState.issues, pie.groupBy, pie.colorBy, pie.conditions, pie.groupRules, pie.colorRules)
      }
      return null
    })
  }, [issueState.issues, settings.pies])

  const card: React.CSSProperties = {
    background: '#fff',
    borderRadius: 20,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    padding: '20px 24px',
    marginBottom: 16,
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

      <TileCard style={{ padding: '20px 24px', marginBottom: 16 }} fileName="combo-chart">
        <h2 style={{ fontSize: 15, margin: '0 0 16px', fontWeight: 600, color: '#111827' }}>チケット推移</h2>
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
          <ComboChart data={comboData} series={settings.series} yAxisLeftMin={settings.yAxisLeftMin} yAxisLeftMinAuto={settings.yAxisLeftMinAuto} yAxisRightMax={settings.yAxisRightMax} dateFormat={settings.dateFormat} chartHeight={settings.chartHeight} />
        )}
      </TileCard>

      {shouldFetch && issueState.loading ? (
        <div style={{ ...card, marginBottom: 0, textAlign: 'center', padding: '40px 24px', color: '#666', fontSize: 13 }}>
          Now Loading...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {(settings.pies ?? []).map((pie, i) => {
            const pieData = piesData[i] ?? []
            const isWide = pieData.length > 10
            return (
              <TileCard
                key={i}
                style={{
                  ...((pie.chartType === 'bar' ? pie.fullWidth !== false : isWide) ? { gridColumn: '1 / -1' } : {}),
                  padding: '20px 16px',
                }}
                fileName={`tile-${i}`}
              >
                {pie.chartType === 'bar' ? (
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
          })}
        </div>
      )}

      {/* クロス集計テーブル */}
      {(settings.tables ?? []).length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 16 }}>
          {(settings.tables ?? []).map((table, i) => {
            const data = crossTablesData[i]
            const rowName = filterFields.find(f => f.key === table.rowGroupBy)?.name ?? table.rowGroupBy
            const colName = filterFields.find(f => f.key === table.colGroupBy)?.name ?? table.colGroupBy
            const title = table.label || `${rowName} × ${colName}`
            return (
              <TileCard
                key={i}
                style={{
                  ...(table.fullWidth !== false ? { gridColumn: '1 / -1' } : {}),
                  padding: '20px 24px',
                }}
                fileName={`cross-table-${i}`}
              >
                {!data ? (
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 12 }}>{title}</div>
                    <div style={{ color: '#9ca3af', fontSize: 13, padding: '24px 0', textAlign: 'center' }}>
                      {issueState.loading ? 'Now Loading...' : (!table.rowGroupBy || !table.colGroupBy) ? '行・列のフィールドを設定パネルで選択してください' : '該当チケットがありません'}
                    </div>
                  </div>
                ) : (
                  <CrossTable
                    data={data}
                    title={title}
                    onCellClick={issueState.issues !== null ? (rk, ck, rfv, cfv) => handleCrossTableCellClick(table, rk, ck, rfv, cfv) : undefined}
                    onRowTotalClick={issueState.issues !== null ? (rk, rfv) => handleCrossTableRowTotalClick(table, rk, rfv) : undefined}
                    onColTotalClick={issueState.issues !== null ? (ck, cfv) => handleCrossTableColTotalClick(table, ck, cfv) : undefined}
                    onGrandTotalClick={issueState.issues !== null ? () => handleCrossTableGrandTotalClick(table) : undefined}
                  />
                )}
              </TileCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
