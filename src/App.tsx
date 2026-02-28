import { toPng } from 'html-to-image'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ComboChart } from './components/ComboChart'
import { GraphSettingsPanel } from './components/GraphSettingsPanel'
import { PieChart } from './components/PieChart'
import type { FilterField, RedmineIssue, RedmineStatus, UserSettings } from './types'
import { buildDefaultSettings, readTeamPresets } from './utils/config'
import { generatePieDummyData, generateSeriesDummyData } from './utils/dummyData'
import { fetchFilterFieldOptions, getAvailableDateFilterFields, getAvailableFilterFields } from './utils/filterValues'
import { aggregateIssues, aggregatePie } from './utils/issueAggregator'
import { FALLBACK_STATUSES, fetchAllIssues, fetchIssueStatuses, getStatusesFromPage } from './utils/redmineApi'
import { loadSettings, saveSettings } from './utils/storage'
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

  // グラフコピー機能
  type CopyStatus = 'idle' | 'copying' | 'ok' | 'err'
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle')
  const comboChartRef = useRef<HTMLDivElement>(null)

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

  const getFieldOptions = useCallback(
    (fieldKey: string) => fetchFilterFieldOptions(fieldKey, apiKey),
    [apiKey]
  )

  const handleDownloadSvg = useCallback(async () => {
    const wrapper = comboChartRef.current
    if (!wrapper) return
    // グラフ全体（凡例含む）を高解像度PNGとして保存
    const dataUrl = await toPng(wrapper, { backgroundColor: '#ffffff', pixelRatio: 2, skipFonts: true })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `redmine-graph-${new Date().toISOString().slice(0, 10)}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [])

  const handleCopyChart = useCallback(async () => {
    const wrapper = comboChartRef.current
    if (!wrapper) return
    if (typeof ClipboardItem === 'undefined') {
      setCopyStatus('err')
      setTimeout(() => setCopyStatus('idle'), 2000)
      return
    }
    setCopyStatus('copying')
    try {
      const dataUrl = await toPng(wrapper, { backgroundColor: '#ffffff', skipFonts: true })
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      setCopyStatus('ok')
      setTimeout(() => setCopyStatus('idle'), 2000)
    } catch {
      setCopyStatus('err')
      setTimeout(() => setCopyStatus('idle'), 2000)
    }
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

  const pieLeftData = useMemo(() => {
    const groupBy = settings.pieLeft?.groupBy ?? 'status_id'
    if (issueState.issues !== null) return aggregatePie(issueState.issues, groupBy, settings.pieLeft?.conditions)
    return generatePieDummyData('status')
  }, [issueState.issues, settings.pieLeft?.groupBy, settings.pieLeft?.conditions])

  const pieRightData = useMemo(() => {
    const groupBy = settings.pieRight?.groupBy ?? 'tracker_id'
    if (issueState.issues !== null) return aggregatePie(issueState.issues, groupBy, settings.pieRight?.conditions)
    return generatePieDummyData('tracker')
  }, [issueState.issues, settings.pieRight?.groupBy, settings.pieRight?.conditions])

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '16px' }}>
      <GraphSettingsPanel
        settings={settings}
        statuses={statuses}
        statusesLoading={statusesLoading}
        onChange={handleSettingsChange}
        teamPresets={teamPresets}
        filterFields={filterFields}
        dateFilterFields={dateFilterFields}
        getFieldOptions={getFieldOptions}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>チケット推移</h2>
        <button
          type="button"
          onClick={handleCopyChart}
          disabled={copyStatus === 'copying'}
          style={{
            fontSize: 12,
            padding: '2px 10px',
            border: '1px solid #ccc',
            borderRadius: 3,
            background: '#fff',
            cursor: copyStatus === 'copying' ? 'default' : 'pointer',
            color: copyStatus === 'ok' ? '#059669' : copyStatus === 'err' ? '#dc2626' : '#333',
          }}
        >
          {copyStatus === 'ok' ? 'コピー完了!' : copyStatus === 'err' ? 'コピー失敗' : copyStatus === 'copying' ? 'コピー中...' : 'PNG コピー'}
        </button>
        <button
          type="button"
          onClick={handleDownloadSvg}
          style={{
            fontSize: 12,
            padding: '2px 10px',
            border: '1px solid #ccc',
            borderRadius: 3,
            background: '#fff',
            cursor: 'pointer',
            color: '#333',
          }}
        >
          PNG 保存
        </button>
      </div>
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
        <ComboChart ref={comboChartRef} data={comboData} series={settings.series} yAxisLeftMin={settings.yAxisLeftMin} yAxisRightMax={settings.yAxisRightMax} dateFormat={settings.dateFormat} chartHeight={settings.chartHeight} />
      )}

      <h2 style={{ fontSize: 16, margin: '24px 0 12px' }}>チケット割合</h2>
      <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <PieChart
            data={pieLeftData}
            groupBy={filterFields.find(f => f.key === (settings.pieLeft?.groupBy ?? 'status_id'))?.name ?? (settings.pieLeft?.groupBy ?? 'status_id')}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <PieChart
            data={pieRightData}
            groupBy={filterFields.find(f => f.key === (settings.pieRight?.groupBy ?? 'tracker_id'))?.name ?? (settings.pieRight?.groupBy ?? 'tracker_id')}
          />
        </div>
      </div>
    </div>
  )
}
