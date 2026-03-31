import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { utcToJstDate } from '../utils/dateUtils'
import {
  fetchAllIssues,
  fetchIssueMetadata,
  fetchIssueWithJournals,
  updateIssueDescription,
} from '../utils/redmineApi'
import type {
  FilterField,
  FilterFieldOption,
  JournalCollectorConfig,
  JournalRecord,
  SeriesCondition,
} from '../types'
import { ConditionsEditor } from './GraphSettingsPanel'

interface Props {
  config: JournalCollectorConfig
  projectId: string
  apiKey: string
  filterFields: FilterField[]
  dateFilterFields: FilterField[]
  getFieldOptions: (key: string) => Promise<FilterFieldOption[]>
  onUpdateConfig: (updated: JournalCollectorConfig) => void
  onDelete: () => void
}

/** SeriesCondition[] と差分日付を Redmine API rawSearch 文字列に変換する */
function conditionsToRawSearch(conditions: SeriesCondition[], updatedOnFrom?: string): string {
  const params = new URLSearchParams()
  for (const cond of conditions) {
    if (!cond.field || cond.field === 'elapsed_days') continue
    const valueStr = cond.values.join('|')
    if (cond.operator === '=') params.set(cond.field, valueStr)
    else if (cond.operator === '!') params.set(cond.field, `!${valueStr}`)
    else if (cond.operator === '>=') params.set(cond.field, `>=${valueStr}`)
    else if (cond.operator === '<=') params.set(cond.field, `<=${valueStr}`)
    else if (cond.operator === '!*') params.set(cond.field, '!*')
  }
  if (updatedOnFrom) {
    params.set('updated_on', `>=${updatedOnFrom}`)
  }
  return params.toString()
}

export function JournalCollectorTile({
  config,
  projectId,
  apiKey,
  filterFields,
  dateFilterFields,
  getFieldOptions,
  onUpdateConfig,
  onDelete,
}: Props) {
  const [targetInfo, setTargetInfo] = useState<{ updatedOn: string; description: string } | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 保存先チケットのメタデータをAPIから取得（前回更新日の表示用）
  useEffect(() => {
    if (!config.targetIssueId) return
    setTargetInfo(null)
    fetchIssueMetadata(config.targetIssueId, apiKey)
      .then(setTargetInfo)
      .catch(() => setTargetInfo(null))
  }, [config.targetIssueId, apiKey])

  async function handleCollect() {
    if (!config.targetIssueId || !projectId) return
    setError(null)
    setProgress({ current: 0, total: 0 })

    try {
      // 1. 保存先チケットから既存JSONを取得
      const targetMeta = await fetchIssueMetadata(config.targetIssueId, apiKey)
      let existingRecords: JournalRecord[] = []
      try {
        const parsed = JSON.parse(targetMeta.description || '[]')
        if (Array.isArray(parsed)) existingRecords = parsed
      } catch {
        existingRecords = []
      }

      // 2. 差分/全件フェッチのrawSearchを構築
      const updatedOnFrom = config.lastCollectedAt
        ? config.lastCollectedAt.slice(0, 10)  // 日付部分のみ（時刻不要）
        : undefined
      const rawSearch = conditionsToRawSearch(config.conditions, updatedOnFrom)

      // 3. 条件に合致するチケット一覧を取得
      const issues = await fetchAllIssues(projectId, rawSearch, apiKey)
      const updatedIssueIds = new Set(issues.map(i => i.id))

      // 4. 各チケットのジャーナルを1件ずつ取得してレコードを生成
      // 開始年月が設定されている場合、その月の1日以降のレコードのみ対象
      const startDateFilter = config.collectionStartYearMonth
        ? `${config.collectionStartYearMonth}-01`
        : null

      const newRecords: JournalRecord[] = []
      setProgress({ current: 0, total: issues.length })

      for (let i = 0; i < issues.length; i++) {
        const issueData = await fetchIssueWithJournals(issues[i].id, apiKey)

        // 起票レコード（ジャーナルには残らないため別途追加）
        const creationDate = utcToJstDate(issueData.created_on)
        if (!startDateFilter || creationDate >= startDateFilter) {
          newRecords.push({
            issueId: issueData.id,
            date: creationDate,
            user: issueData.author.id,
            project: issueData.project.name,
            tracker: issueData.tracker.name,
            projectId: issueData.project.id,
            trackerId: issueData.tracker.id,
          })
        }

        // ジャーナルレコード（updated_onではなくcreated_onを使用）
        for (const journal of issueData.journals) {
          if (!journal.user?.id) continue  // システム更新など user がない場合はスキップ
          const journalDate = utcToJstDate(journal.created_on)
          if (startDateFilter && journalDate < startDateFilter) continue  // 開始年月より前はスキップ
          newRecords.push({
            issueId: issueData.id,
            date: journalDate,
            user: journal.user.id,
            project: issueData.project.name,
            tracker: issueData.tracker.name,
            projectId: issueData.project.id,
            trackerId: issueData.tracker.id,
          })
        }

        setProgress({ current: i + 1, total: issues.length })
      }

      // 5. チケット単位でマージ（差分取得したIDの既存レコードを全削除→最新で置換）
      const merged: JournalRecord[] = [
        ...existingRecords.filter(r => !updatedIssueIds.has(r.issueId)),
        ...newRecords,
      ]

      // 6. 保存先チケットのdescriptionに上書き保存
      await updateIssueDescription(config.targetIssueId, JSON.stringify(merged), apiKey)

      // 7. 保存先チケットの新しいupdated_onを取得してlastCollectedAtに反映
      const refreshed = await fetchIssueMetadata(config.targetIssueId, apiKey)
      onUpdateConfig({ ...config, lastCollectedAt: refreshed.updatedOn })
      setTargetInfo(refreshed)
    } catch (e) {
      setError(e instanceof Error ? e.message : '収集中にエラーが発生しました')
    } finally {
      setProgress(null)
    }
  }

  function handleClear() {
    onUpdateConfig({ ...config, lastCollectedAt: null })
  }

  const isCollecting = progress !== null

  // 前回更新日の表示: APIから取得したtargetInfo.updatedOnをJST日付で表示
  const lastUpdateDisplay = targetInfo?.updatedOn
    ? utcToJstDate(targetInfo.updatedOn)
    : null

  const btnBase: CSSProperties = {
    fontSize: 13,
    padding: '5px 14px',
    borderRadius: 6,
    border: '1px solid #d1d5db',
    cursor: 'pointer',
    background: '#fff',
    color: '#374151',
    fontFamily: 'sans-serif',
  }

  const rowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 5,
    fontSize: 13,
    color: '#4b5563',
  }

  const labelStyle: CSSProperties = {
    fontSize: 12,
    color: '#9ca3af',
    minWidth: 90,
    flexShrink: 0,
  }

  return (
    <div style={{ padding: '20px 24px' }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>
          {config.name || 'ジャーナル収集'}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" style={btnBase} onClick={() => setIsSettingsOpen(o => !o)}>
            {isSettingsOpen ? '設定を閉じる' : '設定'}
          </button>
          <button
            type="button"
            style={{ ...btnBase, color: '#dc2626', borderColor: '#fca5a5' }}
            onClick={onDelete}
          >
            削除
          </button>
        </div>
      </div>

      {/* 設定パネル */}
      {isSettingsOpen && (
        <div style={{
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 12,
        }}>
          <div style={{ ...rowStyle, marginBottom: 8 }}>
            <span style={labelStyle}>タイル名</span>
            <input
              type="text"
              value={config.name}
              onChange={e => onUpdateConfig({ ...config, name: e.target.value })}
              style={{
                flex: 1,
                fontSize: 13,
                padding: '3px 8px',
                borderRadius: 4,
                border: '1px solid #d1d5db',
              }}
            />
          </div>
          <div style={{ ...rowStyle, marginBottom: 8 }}>
            <span style={labelStyle}>保存先チケット#</span>
            <input
              type="number"
              value={config.targetIssueId || ''}
              onChange={e => {
                const v = parseInt(e.target.value, 10)
                onUpdateConfig({ ...config, targetIssueId: isNaN(v) ? 0 : v })
              }}
              style={{
                width: 110,
                fontSize: 13,
                padding: '3px 8px',
                borderRadius: 4,
                border: '1px solid #d1d5db',
              }}
            />
          </div>
          <div style={{ ...rowStyle, marginBottom: 12 }}>
            <span style={labelStyle}>収集開始年月</span>
            <input
              type="month"
              value={config.collectionStartYearMonth ?? ''}
              onChange={e => onUpdateConfig({
                ...config,
                collectionStartYearMonth: e.target.value || undefined,
              })}
              style={{
                fontSize: 13,
                padding: '3px 8px',
                borderRadius: 4,
                border: '1px solid #d1d5db',
              }}
            />
            <span style={{ fontSize: 11, color: '#9ca3af' }}>以降のジャーナルのみ収集（空欄=全期間）</span>
          </div>
          <div>
            <span style={{ ...labelStyle, display: 'block', marginBottom: 6 }}>収集条件</span>
            <ConditionsEditor
              conditions={config.conditions}
              filterFields={filterFields}
              dateFilterFields={dateFilterFields}
              getFieldOptions={getFieldOptions}
              onChange={next => onUpdateConfig({ ...config, conditions: next ?? [] })}
            />
          </div>
        </div>
      )}

      {/* 情報表示 */}
      <div style={{ marginBottom: 14 }}>
        <div style={rowStyle}>
          <span style={labelStyle}>保存先</span>
          <span>
            {config.targetIssueId
              ? `#${config.targetIssueId}`
              : <span style={{ color: '#ef4444' }}>未設定</span>}
          </span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>前回更新日</span>
          <span>
            {targetInfo === null && config.targetIssueId
              ? '読込中...'
              : lastUpdateDisplay
                ? (
                  <>
                    {lastUpdateDisplay}
                    {config.lastCollectedAt === null && (
                      <span style={{ fontSize: 11, color: '#f59e0b', marginLeft: 6 }}>
                        （次回は全件取得）
                      </span>
                    )}
                  </>
                )
                : <span style={{ color: '#9ca3af' }}>未収集</span>}
          </span>
        </div>
        {config.collectionStartYearMonth && (
          <div style={rowStyle}>
            <span style={labelStyle}>収集開始年月</span>
            <span>{config.collectionStartYearMonth} 以降</span>
          </div>
        )}
        {config.conditions.length > 0 && (
          <div style={{ ...rowStyle, flexWrap: 'wrap' }}>
            <span style={labelStyle}>条件</span>
            <span style={{ fontSize: 12, color: '#6b7280' }}>
              {config.conditions
                .filter(c => c.field)
                .map(c => `${c.field}${c.operator}[${c.values.join(',')}]`)
                .join(' & ')}
            </span>
          </div>
        )}
      </div>

      {/* 進捗バー */}
      {isCollecting && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
            {progress!.total === 0
              ? 'チケット一覧を取得中...'
              : `収集中... ${progress!.current} / ${progress!.total} 件`}
          </div>
          {progress!.total > 0 && (
            <div style={{ background: '#e5e7eb', borderRadius: 4, height: 8, overflow: 'hidden' }}>
              <div
                style={{
                  background: '#3b82f6',
                  height: '100%',
                  borderRadius: 4,
                  width: `${Math.round((progress!.current / progress!.total) * 100)}%`,
                  transition: 'width 0.3s',
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <div style={{ fontSize: 12, color: '#dc2626', marginBottom: 10, padding: '6px 10px', background: '#fef2f2', borderRadius: 6 }}>
          {error}
        </div>
      )}

      {/* ボタン */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={handleCollect}
          disabled={isCollecting || !config.targetIssueId}
          style={{
            ...btnBase,
            background: '#3b82f6',
            color: '#fff',
            border: '1px solid #2563eb',
            opacity: isCollecting || !config.targetIssueId ? 0.5 : 1,
            cursor: isCollecting || !config.targetIssueId ? 'default' : 'pointer',
          }}
        >
          {isCollecting ? '収集中...' : '収集実行'}
        </button>
        <button
          type="button"
          onClick={handleClear}
          disabled={isCollecting}
          style={{
            ...btnBase,
            opacity: isCollecting ? 0.5 : 1,
            cursor: isCollecting ? 'default' : 'pointer',
          }}
        >
          クリア
        </button>
      </div>
    </div>
  )
}
