import { useMemo } from 'react'
import type { AssignmentMappingConfig, RedmineIssue, SeriesCondition } from '../types'
import { addBusinessDaysToDate, getIssueDateByField } from '../utils/dateUtils'
import { issueMatchesConditions } from '../utils/issueAggregator'
import { buildRedmineFilterUrl } from '../utils/redmineFilterUrl'

interface Props {
  config: AssignmentMappingConfig
  issues: RedmineIssue[] | null
}

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

export function AssignmentMappingPanel({ config, issues }: Props) {
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

  // 日付ヘッダーの表示文字列（月が変わるときにM/D表示、それ以外はD表示）
  const dateLabels = useMemo(() => {
    let prevMonth = ''
    return dates.map(date => {
      const [, m, d] = date.split('-')
      const month = m
      if (month !== prevMonth) {
        prevMonth = month
        return `${Number(m)}/${Number(d)}`
      }
      return String(Number(d))
    })
  }, [dates])

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
    padding: '4px 8px',
    fontSize: 12,
    fontWeight: 600,
    color: '#374151',
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    whiteSpace: 'nowrap',
    textAlign: 'center',
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
    padding: '4px 8px',
    fontSize: 12,
    color: '#111827',
    border: '1px solid #e5e7eb',
    textAlign: 'center',
    minWidth: 32,
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
              <tr>
                <th style={{ ...thStyle, position: 'sticky', left: 0, zIndex: 2 }}></th>
                {dates.map((date, i) => (
                  <th key={date} style={{ ...thStyle, padding: '4px 6px', minWidth: 32 }}>
                    {dateLabels[i]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {persons.map(person => {
                const personCounts = countMap[person.id] ?? {}
                return (
                  <tr key={person.id} style={{ background: '#fff' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#eff6ff')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                  >
                    <td style={tdNameStyle}>{person.name}</td>
                    {dates.map(date => {
                      const count = personCounts[date]
                      return (
                        <td
                          key={date}
                          style={{
                            ...tdCellStyle,
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
