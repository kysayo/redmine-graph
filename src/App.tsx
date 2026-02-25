import { useCallback, useEffect, useMemo, useState } from 'react'
import { ComboChart } from './components/ComboChart'
import { GraphSettingsPanel } from './components/GraphSettingsPanel'
import { PieChart } from './components/PieChart'
import type { RedmineIssue, RedmineStatus, UserSettings } from './types'
import { buildDefaultSettings, readConfig } from './utils/config'
import { generatePieDummyData, generateSeriesDummyData } from './utils/dummyData'
import { aggregateIssues } from './utils/issueAggregator'
import { FALLBACK_STATUSES, fetchAllIssues, fetchIssueStatuses } from './utils/redmineApi'
import { loadSettings, saveSettings } from './utils/storage'
import { getProjectId, parseRedmineFilter } from './utils/urlParser'

interface Props {
  container: HTMLElement
}

interface IssueState {
  loading: boolean
  issues: RedmineIssue[] | null
  error: string | null
}

export function App({ container }: Props) {
  const config = useMemo(() => readConfig(container), [container])
  const filter = useMemo(() => parseRedmineFilter(), [])
  const apiKey = useMemo(() => container.dataset.apiKey ?? '', [container])
  const projectId = useMemo(() => getProjectId(), [])

  // ユーザー設定（localStorageから初期化、なければdata属性からデフォルト生成）
  const [settings, setSettings] = useState<UserSettings>(() => {
    return loadSettings() ?? buildDefaultSettings(container)
  })

  // Redmineのステータス一覧
  const [statuses, setStatuses] = useState<RedmineStatus[]>([])
  const [statusesLoading, setStatusesLoading] = useState(true)

  // 取得済みチケット一覧（系列設定変更時に再集計するためstateで保持）
  const [issueState, setIssueState] = useState<IssueState>({
    loading: true,
    issues: null,
    error: null,
  })

  useEffect(() => {
    fetchIssueStatuses()
      .then(setStatuses)
      .catch(() => setStatuses(FALLBACK_STATUSES))
      .finally(() => setStatusesLoading(false))
  }, [])

  useEffect(() => {
    fetchAllIssues(projectId, filter, apiKey)
      .then((issues) => setIssueState({ loading: false, issues, error: null }))
      .catch((e: Error) => {
        // 開発環境などRedmineに接続できない場合はnullのまま（ダミーデータでフォールバック）
        setIssueState({ loading: false, issues: null, error: e.message })
      })
  }, [projectId, filter, apiKey])

  const handleSettingsChange = useCallback((next: UserSettings) => {
    setSettings(next)
    saveSettings(next)
  }, [])

  // チケットデータを系列設定に基づいて集計（取得済みチケットから再計算）
  const comboData = useMemo(() => {
    if (issueState.issues !== null) {
      return aggregateIssues(issueState.issues, settings.series, filter)
    }
    // Redmineに接続できない場合はダミーデータ
    return generateSeriesDummyData(settings.series, filter)
  }, [issueState.issues, settings.series, filter])

  const pieData = useMemo(() => generatePieDummyData(config.pieGroupBy), [config.pieGroupBy])

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '16px' }}>
      <GraphSettingsPanel
        settings={settings}
        statuses={statuses}
        statusesLoading={statusesLoading}
        onChange={handleSettingsChange}
      />

      <h2 style={{ fontSize: 16, marginBottom: 12 }}>チケット推移</h2>
      {issueState.loading && (
        <div style={{ padding: '20px 0', color: '#666', fontSize: 13 }}>チケットデータを取得中...</div>
      )}
      {!issueState.loading && issueState.error && issueState.issues === null && (
        <div style={{ padding: '4px 0 8px', color: '#999', fontSize: 11 }}>
          ※ Redmineに接続できないため、サンプルデータを表示しています
        </div>
      )}
      {!issueState.loading && (
        <ComboChart data={comboData} series={settings.series} />
      )}

      <h2 style={{ fontSize: 16, margin: '24px 0 12px' }}>チケット割合</h2>
      <PieChart data={pieData} groupBy={config.pieGroupBy} />
    </div>
  )
}
