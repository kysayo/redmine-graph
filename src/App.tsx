import { toPng, toSvg } from 'html-to-image'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ComboChart } from './components/ComboChart'
import { GraphSettingsPanel } from './components/GraphSettingsPanel'
import { PieChart } from './components/PieChart'
import type { RedmineIssue, RedmineStatus, UserSettings } from './types'
import { buildDefaultSettings, readConfig } from './utils/config'
import { generatePieDummyData, generateSeriesDummyData } from './utils/dummyData'
import { aggregateIssues } from './utils/issueAggregator'
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
  const config = useMemo(() => readConfig(container), [container])
  const apiKey = useMemo(() => container.dataset.apiKey ?? '', [container])
  const projectId = useMemo(() => getProjectId(), [])
  const rawSearch = window.location.search

  // ユーザー設定（localStorageから初期化、なければdata属性からデフォルト生成）
  const [settings, setSettings] = useState<UserSettings>(() => {
    return loadSettings() ?? buildDefaultSettings(container)
  })

  // Redmineのステータス一覧
  const [statuses, setStatuses] = useState<RedmineStatus[]>([])
  const [statusesLoading, setStatusesLoading] = useState(true)

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

  // fieldset#graph-section の collapsed クラスを監視し、展開時にフェッチ開始
  useEffect(() => {
    const fieldset = document.getElementById('graph-section')
    if (!fieldset || !fieldset.classList.contains('collapsed')) {
      // fieldsetがない（開発環境）か既に展開済みの場合は即座にフェッチ
      setShouldFetch(true)
      return
    }
    const observer = new MutationObserver(() => {
      if (!fieldset.classList.contains('collapsed')) {
        setShouldFetch(true)
        observer.disconnect()
      }
    })
    observer.observe(fieldset, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!shouldFetch) return
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

  const handleDownloadSvg = useCallback(async () => {
    const wrapper = comboChartRef.current
    if (!wrapper) return
    const dataUrl = await toSvg(wrapper, { backgroundColor: '#ffffff' })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `redmine-graph-${new Date().toISOString().slice(0, 10)}.svg`
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
      const dataUrl = await toPng(wrapper, { backgroundColor: '#ffffff' })
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

  const pieData = useMemo(() => generatePieDummyData(config.pieGroupBy), [config.pieGroupBy])

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '16px' }}>
      <GraphSettingsPanel
        settings={settings}
        statuses={statuses}
        statusesLoading={statusesLoading}
        onChange={handleSettingsChange}
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
          SVG 保存
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
      <PieChart data={pieData} groupBy={config.pieGroupBy} />
    </div>
  )
}
