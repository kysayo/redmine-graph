import { useMemo, useState } from 'react'
import type { AssignmentMappingConfig, JournalCountExtraColumn, RedmineIssue, SeriesCondition } from '../types'
import { addBusinessDaysToDate, getIssueDateByField } from '../utils/dateUtils'
import { issueMatchesConditions } from '../utils/issueAggregator'
import { buildRedmineFilterUrl } from '../utils/redmineFilterUrl'

interface Props {
  config: AssignmentMappingConfig
  issues: RedmineIssue[] | null
  onExtraValuesChange?: (extraValues: Record<string, Record<string, string>>) => void
}

const DEFAULT_EXTRA_COLUMNS: JournalCountExtraColumn[] = [
  { key: 'resource', label: 'Resource', type: 'number' },
]

/** YYYY-MM-DD の日付が土曜(6)または日曜(0)かどうかを返す */
function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00Z')
  const day = d.getUTCDay()
  return day === 0 || day === 6
}

/** YYYY-MM-DD の日付一覧を startDate から endDate まで生成する */
function generateDateRange(startDate: string, endDate: string, hideWeekends: boolean): string[] {
  const dates: string[] = []
  const d = new Date(startDate + 'T00:00:00Z')
  const end = new Date(endDate + 'T00:00:00Z')
  while (d <= end) {
    const ds = d.toISOString().slice(0, 10)
    if (!hideWeekends || !isWeekend(ds)) {
      dates.push(ds)
    }
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return dates
}

/** assigneeField からチケットの担当者ID文字列を取得する */
function getIssueAssigneeId(issue: RedmineIssue, assigneeField: string): string | null {
  if (assigneeField === 'assigned_to_id') {
    return issue.assigned_to ? String(issue.assigned_to.id) : null
  }
  if (assigneeField.startsWith('cf_')) {
    const cfId = Number(assigneeField.slice(3))
    const cf = issue.custom_fields?.find(c => c.id === cfId)
    const v = cf?.value
    if (Array.isArray(v)) return (v[0] as string) ?? null
    return (v as string) ?? null
  }
  return null
}

export function AssignmentMappingPanel({ config, issues, onExtraValuesChange }: Props) {
  const {
    title,
    assigneeField,
    endDateField,
    fallbackDays,
    displayStartDate,
    displayEndDate,
    conditions = [],
    persons,
    hideWeekends = false,
    fullWidth,
  } = config

  const extraColumns = config.extraColumns ?? DEFAULT_EXTRA_COLUMNS
  const extraValues = config.extraValues ?? {}

  // インライン編集用ステート: 編集中のセル (personId, colKey) -> 値
  const [editingCell, setEditingCell] = useState<{ personId: string; colKey: string } | null>(null)
  const [editingValue, setEditingValue] = useState('')

  function commitEdit() {
    if (!editingCell) return
    const { personId, colKey } = editingCell
    const next: Record<string, Record<string, string>> = { ...extraValues }
    if (!next[personId]) next[personId] = {}
    next[personId] = { ...next[personId], [colKey]: editingValue }
    onExtraValuesChange?.(next)
    setEditingCell(null)
  }

  // 表示する日付列の一覧
  const dates = useMemo(
    () => generateDateRange(displayStartDate, displayEndDate, hideWeekends),
    [displayStartDate, displayEndDate, hideWeekends]
  )

  // 担当者IDのセット（高速参照用）
  const personIdSet = useMemo(() => new Set(persons.map(p => p.id)), [persons])

  // 集計: person.id -> date -> count
  const countMap = useMemo<Record<string, Record<string, number>>>(() => {
    const map: Record<string, Record<string, number>> = {}
    for (const p of persons) map[p.id] = {}

    if (!issues) return map

    const filtered = conditions.length
      ? issues.filter(issue => issueMatchesConditions(issue, conditions))
      : issues

    for (const issue of filtered) {
      const startDate = issue.start_date
      if (!startDate) continue  // 開始日が空はスキップ

      const assigneeId = getIssueAssigneeId(issue, assigneeField)
      if (!assigneeId || !personIdSet.has(assigneeId)) continue

      // 終了日: endDateField から取得、空なら start_date + fallbackDays 営業日
      const rawEnd = getIssueDateByField(issue, endDateField)
      let endDate: string
      if (rawEnd) {
        // ISO文字列（UTC）の場合はJST日付に変換が必要。YYYY-MM-DDの場合はそのまま
        if (rawEnd.includes('T') || rawEnd.endsWith('Z')) {
          // UTCからJST変換（+9時間）
          const d = new Date(rawEnd)
          const jstMs = d.getTime() + 9 * 60 * 60 * 1000
          endDate = new Date(jstMs).toISOString().slice(0, 10)
        } else {
          endDate = rawEnd.slice(0, 10)
        }
      } else {
        endDate = addBusinessDaysToDate(startDate, fallbackDays)
      }

      // 表示期間と[startDate, endDate]の重なりを求めてカウント
      const overlapStart = startDate > displayStartDate ? startDate : displayStartDate
      const overlapEnd = endDate < displayEndDate ? endDate : displayEndDate
      if (overlapStart > overlapEnd) continue

      const personCounts = map[assigneeId]
      for (const date of dates) {
        if (date >= overlapStart && date <= overlapEnd) {
          personCounts[date] = (personCounts[date] ?? 0) + 1
        }
      }
    }
    return map
  }, [issues, conditions, assigneeField, endDateField, fallbackDays, displayStartDate, displayEndDate, dates, personIdSet])

  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // 各日付に対応する月ラベル（その月の最初の出現日のみ表示、それ以外は空）
  const monthLabels = useMemo(() => {
    const seen = new Set<string>()
    return dates.map(date => {
      const [year, month] = date.split('-')
      const ym = `${year}-${month}`
      if (!seen.has(ym)) {
        seen.add(ym)
        return MONTH_NAMES[parseInt(month) - 1]
      }
      return ''
    })
  }, [dates])

  // 日番号・曜日・週境界フラグ
  const dateMeta = useMemo(() => dates.map(date => {
    const d = new Date(date + 'T00:00:00Z')
    return {
      day: String(d.getUTCDate()),
      weekday: WEEKDAY_NAMES[d.getUTCDay()],
      isWeekStart: d.getUTCDay() === 1, // Monday
    }
  }), [dates])

  const handleCellClick = (personId: string, date: string) => {
    const personCondition: SeriesCondition = {
      field: assigneeField,
      operator: '=',
      values: [personId],
    }
    // 担当者フィルタ + conditions で基本URLを生成
    const baseUrl = buildRedmineFilterUrl(
      window.location.pathname,
      window.location.search,
      undefined,
      [...conditions, personCondition]
    )
    // 日付範囲フィルタを追加（start_date <= date かつ endDateField >= date）
    // buildRedmineFilterUrl は >= / <= を pieConditions から除外するため手動で追加する
    const [basePart, queryPart] = baseUrl.split('?')
    const params = new URLSearchParams(queryPart)
    params.append('f[]', 'start_date')
    params.set('op[start_date]', '<=')
    params.append('v[start_date][]', date)
    if (endDateField) {
      params.append('f[]', endDateField)
      params.set(`op[${endDateField}]`, '>=')
      params.append(`v[${endDateField}][]`, date)
    }
    window.open(`${basePart}?${params.toString()}`, '_blank', 'noopener')
  }

  const displayTitle = title || '担当数マッピング'

  if (!displayStartDate || !displayEndDate) {
    return (
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 12 }}>{displayTitle}</div>
        <div style={{ color: '#9ca3af', fontSize: 13, padding: '24px 0', textAlign: 'center' }}>
          表示期間を設定パネルで入力してください
        </div>
      </div>
    )
  }

  if (persons.length === 0) {
    return (
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 12 }}>{displayTitle}</div>
        <div style={{ color: '#9ca3af', fontSize: 13, padding: '24px 0', textAlign: 'center' }}>
          設定パネルで担当者を追加してください
        </div>
      </div>
    )
  }

  const thStyle: React.CSSProperties = {
    padding: '3px 6px',
    fontSize: 11,
    fontWeight: 600,
    color: '#374151',
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    whiteSpace: 'nowrap',
    textAlign: 'center',
  }

  const thMonthStyle: React.CSSProperties = {
    ...thStyle,
    fontSize: 11,
    fontWeight: 700,
    background: '#f3f4f6',
    padding: '2px 4px',
  }

  const thWeekdayStyle: React.CSSProperties = {
    ...thStyle,
    fontSize: 10,
    color: '#6b7280',
    padding: '2px 4px',
  }

  const thExtraStyle: React.CSSProperties = {
    ...thStyle,
    background: '#fefce8',
    minWidth: 64,
  }

  const tdNameStyle: React.CSSProperties = {
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 600,
    color: '#374151',
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    whiteSpace: 'nowrap',
    position: 'sticky',
    left: 0,
    zIndex: 1,
  }

  const tdCellStyle: React.CSSProperties = {
    padding: '4px 3px',
    fontSize: 12,
    color: '#111827',
    border: '1px solid #e5e7eb',
    textAlign: 'center',
    minWidth: 22,
  }

  const tdExtraStyle: React.CSSProperties = {
    ...tdCellStyle,
    background: '#fefce8',
    cursor: onExtraValuesChange ? 'pointer' : 'default',
    minWidth: 64,
  }

  // 月境界線（月行のみ）: その月の最初のセルの左に縦線
  function monthBorderStyle(monthLabel: string, isFirst: boolean): React.CSSProperties {
    if (!monthLabel || isFirst) return {}
    return { borderLeft: '2px solid #9ca3af' }
  }

  // 週境界線（日行・曜日行・データ行）: 月曜の左に縦線
  function weekBorderStyle(isWeekStart: boolean, isFirst: boolean): React.CSSProperties {
    if (!isWeekStart || isFirst) return {}
    return { borderLeft: '2px solid #9ca3af' }
  }

  const gridColumnStyle = fullWidth !== false ? { gridColumn: '1 / -1' } : {}

  return (
    <div style={gridColumnStyle}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 12 }}>{displayTitle}</div>
      {!issues ? (
        <div style={{ color: '#9ca3af', fontSize: 13, padding: '24px 0', textAlign: 'center' }}>
          Now Loading...
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', tableLayout: 'auto' }}>
            <thead>
              {/* 月行 */}
              <tr>
                <th rowSpan={3} style={{ ...thStyle, position: 'sticky', left: 0, zIndex: 2 }}></th>
                {extraColumns.map(col => (
                  <th key={col.key} rowSpan={3} style={thExtraStyle}>{col.label}</th>
                ))}
                {dates.map((date, i) => (
                  <th key={date} style={{ ...thMonthStyle, ...monthBorderStyle(monthLabels[i], i === 0) }}>
                    {monthLabels[i]}
                  </th>
                ))}
              </tr>
              {/* 日行 */}
              <tr>
                {dates.map((date, i) => (
                  <th key={date} style={{ ...thStyle, minWidth: 22, ...weekBorderStyle(dateMeta[i].isWeekStart, i === 0) }}>
                    {dateMeta[i].day}
                  </th>
                ))}
              </tr>
              {/* 曜日行 */}
              <tr>
                {dates.map((date, i) => (
                  <th key={date} style={{ ...thWeekdayStyle, ...weekBorderStyle(dateMeta[i].isWeekStart, i === 0) }}>
                    {dateMeta[i].weekday}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {persons.map(person => {
                const personCounts = countMap[person.id] ?? {}
                const personExtra = extraValues[person.id] ?? {}
                return (
                  <tr key={person.id} style={{ background: '#fff' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#eff6ff')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                  >
                    <td style={tdNameStyle}>{person.name}</td>
                    {extraColumns.map(col => {
                      const isEditing = editingCell?.personId === person.id && editingCell?.colKey === col.key
                      const val = personExtra[col.key] ?? ''
                      return (
                        <td key={col.key} style={tdExtraStyle}
                          onClick={() => {
                            if (!onExtraValuesChange) return
                            setEditingCell({ personId: person.id, colKey: col.key })
                            setEditingValue(val)
                          }}
                        >
                          {isEditing ? (
                            <input
                              type={col.type === 'number' ? 'number' : 'text'}
                              value={editingValue}
                              autoFocus
                              onChange={e => setEditingValue(e.target.value)}
                              onBlur={commitEdit}
                              onKeyDown={e => {
                                if (e.key === 'Enter') commitEdit()
                                if (e.key === 'Escape') setEditingCell(null)
                              }}
                              style={{ width: 60, fontSize: 12, padding: '1px 4px', border: '1px solid #93c5fd', borderRadius: 2 }}
                            />
                          ) : (
                            val || ''
                          )}
                        </td>
                      )
                    })}
                    {dates.map((date, i) => {
                      const count = personCounts[date]
                      return (
                        <td
                          key={date}
                          style={{
                            ...tdCellStyle,
                            ...weekBorderStyle(dateMeta[i].isWeekStart, i === 0),
                            cursor: count ? 'pointer' : 'default',
                            color: count ? '#2563eb' : '#d1d5db',
                            fontWeight: count ? 700 : 400,
                          }}
                          onClick={count && issues ? () => handleCellClick(person.id, date) : undefined}
                        >
                          {count || ''}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
