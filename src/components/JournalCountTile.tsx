import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { AssignmentMappingPerson, FilterFieldOption, JournalCountConfig, JournalCountExtraColumn, JournalRecord } from '../types'
import { fetchIssueMetadata } from '../utils/redmineApi'

interface Props {
  config: JournalCountConfig
  apiKey: string
  getFieldOptions: (key: string) => Promise<FilterFieldOption[]>
  onUpdateConfig: (updated: JournalCountConfig) => void
  onDelete: () => void
}

const DEFAULT_EXTRA_COLUMNS: JournalCountExtraColumn[] = [
  { key: 'resource', label: 'Resource', type: 'number' },
]

function getExtraColumns(config: JournalCountConfig): JournalCountExtraColumn[] {
  return config.extraColumns ?? DEFAULT_EXTRA_COLUMNS
}

function isTempId(id: string): boolean {
  return id.startsWith('_csv_')
}

/** 現在の "YYYY-MM" を返す */
function getCurrentYearMonth(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/** YYYY-MM-DD が属する週の月曜日を返す */
function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  const dow = d.getUTCDay()
  const daysFromMon = dow === 0 ? 6 : dow - 1
  d.setUTCDate(d.getUTCDate() - daysFromMon)
  return d.toISOString().slice(0, 10)
}

/** startDate〜endDate をカバーする週の月曜日一覧 */
function generateColumnWeeks(startDate: string, endDate: string): string[] {
  const first = getWeekStart(startDate)
  const last = getWeekStart(endDate)
  const weeks: string[] = []
  const d = new Date(first + 'T00:00:00Z')
  const end = new Date(last + 'T00:00:00Z')
  while (d <= end) {
    weeks.push(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() + 7)
  }
  return weeks
}

/** "YYYY-MM-DD" → "M/D週" */
function formatWeekLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}週`
}

// --- ColumnDef ---

type ColumnDef =
  | { type: 'month'; key: string; label: string; yearMonth: string }
  | { type: 'week';  key: string; label: string; yearMonth: string; weekStart: string }

/**
 * startDate〜endDate の期間をカバーする列定義一覧を返す。
 * weeklyDetailMonth の月だけ週単位に展開し、それ以外は月単位の列にする。
 */
function generateColumns(startDate: string, endDate: string, weeklyDetailMonth: string): ColumnDef[] {
  const cols: ColumnDef[] = []

  const start = new Date(startDate + 'T00:00:00Z')
  const end   = new Date(endDate   + 'T00:00:00Z')
  const cur   = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1))

  while (cur <= end) {
    const ym = `${cur.getUTCFullYear()}-${String(cur.getUTCMonth() + 1).padStart(2, '0')}`

    if (ym === weeklyDetailMonth) {
      const [y, mo] = ym.split('-').map(Number)
      const monthFirstDay = `${ym}-01`
      const monthLastDay  = new Date(Date.UTC(y, mo, 0)).toISOString().slice(0, 10)
      const today = new Date().toISOString().slice(0, 10)
      // 今日がこの月内なら endDate を today まで延ばし、未完了の週も表示する
      const extendedEnd   = today > endDate && today <= monthLastDay ? today : endDate
      const effectiveStart = startDate > monthFirstDay ? startDate : monthFirstDay
      const effectiveEnd   = extendedEnd < monthLastDay ? extendedEnd : monthLastDay
      const weeks = generateColumnWeeks(effectiveStart, effectiveEnd)
      for (const w of weeks) {
        cols.push({ type: 'week', key: `w:${w}`, label: formatWeekLabel(w), yearMonth: ym, weekStart: w })
      }
    } else {
      const m = cur.getUTCMonth() + 1
      cols.push({ type: 'month', key: `m:${ym}`, label: `${m}月`, yearMonth: ym })
    }

    cur.setUTCMonth(cur.getUTCMonth() + 1)
  }

  return cols
}

// --- CSV パーサー ---

function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { current += '"'; i++ }
      else { inQuote = !inQuote }
    } else if (ch === ',' && !inQuote) {
      cells.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  cells.push(current.trim())
  return cells
}

function parseCsv(text: string): string[][] {
  return text.split('\n')
    .map(line => line.trimEnd())
    .filter(line => line.length > 0)
    .map(parseCsvLine)
}

// --- 担当者エディタ（並び替えボタン付き）---

function PersonEditor({
  persons,
  allOptions,
  onChange,
}: {
  persons: AssignmentMappingPerson[]
  allOptions: FilterFieldOption[]
  onChange: (persons: AssignmentMappingPerson[]) => void
}) {
  const [inputText, setInputText] = useState('')
  const [candidates, setCandidates] = useState<FilterFieldOption[]>([])

  useEffect(() => {
    if (!inputText.trim()) { setCandidates([]); return }
    const lower = inputText.toLowerCase()
    setCandidates(allOptions.filter(o => o.label.toLowerCase().includes(lower)).slice(0, 8))
  }, [inputText, allOptions])

  function addPerson(opt: FilterFieldOption) {
    if (persons.some(p => p.id === opt.value)) return
    onChange([...persons, { name: opt.label, id: opt.value }])
    setInputText('')
    setCandidates([])
  }

  function removePerson(id: string) {
    onChange(persons.filter(p => p.id !== id))
  }

  function movePerson(idx: number, dir: -1 | 1) {
    const next = [...persons]
    ;[next[idx], next[idx + dir]] = [next[idx + dir], next[idx]]
    onChange(next)
  }

  const btnSmall: CSSProperties = {
    fontSize: 10, padding: '1px 4px', border: '1px solid #d1d5db',
    borderRadius: 3, cursor: 'pointer', background: '#fff', color: '#374151', lineHeight: 1.4,
  }

  return (
    <div>
      <div style={{ fontSize: 11, color: '#555', marginBottom: 4 }}>担当者</div>
      {persons.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          {persons.map((p, idx) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
              <button
                type="button"
                style={{ ...btnSmall, opacity: idx === 0 ? 0.3 : 1 }}
                disabled={idx === 0}
                onClick={() => movePerson(idx, -1)}
              >↑</button>
              <button
                type="button"
                style={{ ...btnSmall, opacity: idx === persons.length - 1 ? 0.3 : 1 }}
                disabled={idx === persons.length - 1}
                onClick={() => movePerson(idx, 1)}
              >↓</button>
              <span style={{ fontSize: 12, minWidth: 100, color: isTempId(p.id) ? '#dc2626' : '#111827' }}>
                {p.name}{isTempId(p.id) ? ' ⚠' : ''}
              </span>
              <button
                type="button"
                onClick={() => removePerson(p.id)}
                style={{ ...btnSmall, color: '#dc2626', borderColor: '#fca5a5' }}
              >×</button>
            </div>
          ))}
        </div>
      )}
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="名前で検索して追加..."
          style={{ fontSize: 12, padding: '2px 6px', border: '1px solid #ccc', borderRadius: 3, width: 180 }}
        />
        {candidates.length > 0 && (
          <div style={{
            position: 'absolute', top: '100%', left: 0,
            background: '#fff', border: '1px solid #ccc', borderRadius: 3,
            zIndex: 9999, minWidth: 200, boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          }}>
            {candidates.map(opt => (
              <div
                key={opt.value}
                onClick={() => addPerson(opt)}
                style={{ padding: '4px 10px', fontSize: 12, cursor: 'pointer', color: '#111827' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
              >
                {opt.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function JournalCountTile({ config, apiKey, getFieldOptions, onUpdateConfig, onDelete }: Props) {
  const { name, sourceIssueId, persons, filterTrackerIds = [], startDate, endDate } = config
  const extraColumns = getExtraColumns(config)

  const [records, setRecords] = useState<JournalRecord[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFetched, setLastFetched] = useState<string | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [trackerOptions, setTrackerOptions] = useState<FilterFieldOption[]>([])
  const [allOptions, setAllOptions] = useState<FilterFieldOption[]>([])
  const [localExtraValues, setLocalExtraValues] = useState<Record<string, Record<string, string>>>(config.extraValues ?? {})
  const csvInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLocalExtraValues(config.extraValues ?? {})
  }, [config.extraValues])

  useEffect(() => {
    getFieldOptions('tracker_id').then(setTrackerOptions).catch(() => {})
    getFieldOptions('assigned_to_id').then(setAllOptions).catch(() => {})
  }, [getFieldOptions])

  function loadRecords() {
    if (!sourceIssueId) return
    setLoading(true)
    setError(null)
    fetchIssueMetadata(sourceIssueId, apiKey)
      .then(meta => {
        try {
          const parsed: unknown = JSON.parse(meta.description || '[]')
          setRecords(Array.isArray(parsed) ? (parsed as JournalRecord[]) : [])
        } catch {
          setRecords([])
        }
        setLastFetched(meta.updatedOn ? meta.updatedOn.slice(0, 10) : null)
      })
      .catch(e => {
        setError(e instanceof Error ? e.message : 'データの取得に失敗しました')
        setRecords(null)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadRecords() }, [sourceIssueId, apiKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // --- CSV インポート ---

  async function handleCsvImport(file: File) {
    const text = await file.text()
    const rows = parseCsv(text)
    if (rows.length < 2) return

    const headers = rows[0]
    // headers[0] = Name（担当者）, headers[1] = Resource（数値固定）, headers[2+] = 追加列（テキスト）
    const newExtraColumns: JournalCountExtraColumn[] = [
      { key: 'resource', label: headers[1] ?? 'Resource', type: 'number' },
      ...headers.slice(2).map(h => ({
        key: h.toLowerCase().replace(/[\s/]/g, '_'),
        label: h,
        type: 'text' as const,
      })),
    ]

    const dataRows = rows.slice(1)
    const newPersons: AssignmentMappingPerson[] = []
    const newExtraValues: Record<string, Record<string, string>> = {}

    dataRows.forEach((row, rowIdx) => {
      const csvName = row[0]?.trim()
      if (!csvName) return

      // 名前でユーザーIDを検索（大文字小文字無視）
      const match = allOptions.find(o => o.label.toLowerCase() === csvName.toLowerCase())
      const id = match ? match.value : `_csv_${rowIdx}`
      const displayName = match ? match.label : csvName

      newPersons.push({ name: displayName, id })

      // extraValues に CSV データをマップ
      const vals: Record<string, string> = {}
      newExtraColumns.forEach((col, i) => {
        vals[col.key] = row[i + 1]?.trim() ?? ''
      })
      newExtraValues[id] = vals
    })

    onUpdateConfig({
      ...config,
      persons: newPersons,
      extraColumns: newExtraColumns,
      extraValues: newExtraValues,
    })
  }

  // 集計開始日が空の場合は6ヶ月前の1日を自動計算（config は変更しない）
  const effectiveStartDate = useMemo(() => {
    if (startDate) return startDate
    const d = new Date()
    d.setMonth(d.getMonth() - 6)
    d.setDate(1)
    return d.toISOString().slice(0, 10)
  }, [startDate])

  // 集計終了日が空の場合は当日を自動計算（config は変更しない）
  const effectiveEndDate = useMemo(() => {
    if (endDate) return endDate
    return new Date().toISOString().slice(0, 10)
  }, [endDate])

  // 週単位展開する月（未設定なら今月）
  const effectiveWeeklyMonth = config.weeklyDetailMonth || getCurrentYearMonth()

  const columns = useMemo(
    () => (effectiveStartDate && effectiveEndDate ? generateColumns(effectiveStartDate, effectiveEndDate, effectiveWeeklyMonth) : []),
    [effectiveStartDate, effectiveEndDate, effectiveWeeklyMonth]
  )

  const countMap = useMemo(() => {
    const map: Record<string, Record<string, number>> = {}
    for (const p of persons) map[p.id] = {}
    if (!records || !effectiveStartDate || !effectiveEndDate) return map

    const columnKeySet = new Set(columns.map(c => c.key))
    const personIdSet = new Set(persons.map(p => p.id))
    const selectedTrackerIdSet = new Set(filterTrackerIds)
    const selectedTrackerNames = new Set(
      trackerOptions.filter(o => selectedTrackerIdSet.has(Number(o.value))).map(o => o.label)
    )

    for (const record of records) {
      if (record.date < effectiveStartDate || record.date > effectiveEndDate) continue
      if (selectedTrackerIdSet.size > 0) {
        const passes = record.trackerId != null
          ? selectedTrackerIdSet.has(record.trackerId)
          : selectedTrackerNames.has(record.tracker)
        if (!passes) continue
      }
      const userId = String(record.user)
      if (!personIdSet.has(userId)) continue

      const recordYearMonth = record.date.slice(0, 7)
      let colKey: string
      if (recordYearMonth === effectiveWeeklyMonth) {
        colKey = `w:${getWeekStart(record.date)}`
      } else {
        colKey = `m:${recordYearMonth}`
      }
      if (!columnKeySet.has(colKey)) continue
      map[userId][colKey] = (map[userId][colKey] ?? 0) + 1
    }
    return map
  }, [records, persons, columns, filterTrackerIds, trackerOptions, effectiveStartDate, effectiveEndDate, effectiveWeeklyMonth])

  const colTotals = useMemo(() => {
    const t: Record<string, number> = {}
    for (const col of columns) t[col.key] = persons.reduce((s, p) => s + (countMap[p.id]?.[col.key] ?? 0), 0)
    return t
  }, [countMap, columns, persons])

  const personTotals = useMemo(() => {
    const t: Record<string, number> = {}
    for (const p of persons) t[p.id] = columns.reduce((s, col) => s + (countMap[p.id]?.[col.key] ?? 0), 0)
    return t
  }, [countMap, columns, persons])

  const grandTotal = useMemo(() => Object.values(personTotals).reduce((s, n) => s + n, 0), [personTotals])

  // --- 月平均・週平均 ---
  const { monthCols, pastWeekCols, monthAvgLabel, weekAvgLabel } = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const currentWeekStart = getWeekStart(today)
    const monthCols = columns.filter((c): c is Extract<ColumnDef, { type: 'month' }> => c.type === 'month')
    const pastWeekCols = columns.filter(
      (c): c is Extract<ColumnDef, { type: 'week' }> => c.type === 'week' && c.weekStart < currentWeekStart
    )

    let monthAvgLabel = ''
    if (monthCols.length > 0) {
      const first = monthCols[0].label.replace('月', '')
      const last  = monthCols[monthCols.length - 1].label.replace('月', '')
      monthAvgLabel = first === last ? `${first}月平均` : `${first}-${last}月平均`
    }

    let weekAvgLabel = ''
    if (pastWeekCols.length > 0) {
      const m = parseInt(effectiveWeeklyMonth.split('-')[1], 10)
      weekAvgLabel = `${m}月週平均`
    }

    return { monthCols, pastWeekCols, monthAvgLabel, weekAvgLabel }
  }, [columns, effectiveWeeklyMonth])

  const personMonthAvg = useMemo(() => {
    const t: Record<string, number> = {}
    for (const p of persons) {
      const sum = monthCols.reduce((s, col) => s + (countMap[p.id]?.[col.key] ?? 0), 0)
      t[p.id] = monthCols.length > 0 ? sum / monthCols.length : 0
    }
    return t
  }, [countMap, monthCols, persons])

  const personWeekAvg = useMemo(() => {
    const t: Record<string, number> = {}
    for (const p of persons) {
      const sum = pastWeekCols.reduce((s, col) => s + (countMap[p.id]?.[col.key] ?? 0), 0)
      t[p.id] = pastWeekCols.length > 0 ? sum / pastWeekCols.length : 0
    }
    return t
  }, [countMap, pastWeekCols, persons])

  const totalMonthAvg = useMemo(
    () => monthCols.length > 0 ? monthCols.reduce((s, col) => s + colTotals[col.key], 0) / monthCols.length : 0,
    [colTotals, monthCols]
  )
  const totalWeekAvg = useMemo(
    () => pastWeekCols.length > 0 ? pastWeekCols.reduce((s, col) => s + colTotals[col.key], 0) / pastWeekCols.length : 0,
    [colTotals, pastWeekCols]
  )

  function fmtAvg(v: number): string { return v > 0 ? v.toFixed(1) : '' }

  // --- 列管理 ---
  function addColumn() {
    const newCol: JournalCountExtraColumn = {
      key: `col-${Date.now()}`,
      label: `列${extraColumns.length + 1}`,
      type: 'text',
    }
    onUpdateConfig({ ...config, extraColumns: [...extraColumns, newCol] })
  }

  function updateColumnLabel(key: string, label: string) {
    onUpdateConfig({ ...config, extraColumns: extraColumns.map(c => c.key === key ? { ...c, label } : c) })
  }

  function deleteColumn(key: string) {
    onUpdateConfig({ ...config, extraColumns: extraColumns.filter(c => c.key !== key) })
  }

  function moveColumn(idx: number, dir: -1 | 1) {
    const next = [...extraColumns]
    ;[next[idx], next[idx + dir]] = [next[idx + dir], next[idx]]
    onUpdateConfig({ ...config, extraColumns: next })
  }

  function handleExtraValueChange(personId: string, colKey: string, value: string) {
    setLocalExtraValues(prev => ({
      ...prev,
      [personId]: { ...prev[personId], [colKey]: value },
    }))
  }

  function handleExtraValueBlur(personId: string, colKey: string, value: string) {
    onUpdateConfig({
      ...config,
      extraValues: {
        ...config.extraValues,
        [personId]: { ...config.extraValues?.[personId], [colKey]: value },
      },
    })
  }

  // --- スタイル ---
  const btnBase: CSSProperties = {
    fontSize: 13, padding: '5px 14px', borderRadius: 6,
    border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff', color: '#374151',
  }
  const btnSmall: CSSProperties = {
    fontSize: 10, padding: '1px 4px', border: '1px solid #d1d5db',
    borderRadius: 3, cursor: 'pointer', background: '#fff', color: '#374151', lineHeight: 1.4,
  }
  const labelStyle: CSSProperties = { fontSize: 12, color: '#9ca3af', minWidth: 100, flexShrink: 0 }
  const rowStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 13 }
  const inputStyle: CSSProperties = { fontSize: 13, padding: '3px 8px', borderRadius: 4, border: '1px solid #d1d5db' }
  const thStyle: CSSProperties = {
    padding: '6px 10px', fontSize: 12, fontWeight: 600, color: '#374151',
    background: '#f9fafb', border: '1px solid #e5e7eb', whiteSpace: 'nowrap',
  }
  const tdStyle: CSSProperties = {
    padding: '4px 8px', fontSize: 13, border: '1px solid #e5e7eb', textAlign: 'right', color: '#374151',
  }
  const totalTdStyle: CSSProperties = { ...tdStyle, fontWeight: 600, background: '#f9fafb' }
  const extraTdStyle: CSSProperties = { ...tdStyle, textAlign: 'left', minWidth: 40 }
  const avgThStyle: CSSProperties = { ...thStyle, background: '#fef9c3', color: '#713f12' }
  const avgTdStyle: CSSProperties = { ...tdStyle, background: '#fefce8', color: '#713f12' }
  const avgTotalTdStyle: CSSProperties = { ...avgTdStyle, fontWeight: 600 }

  return (
    <div style={{ padding: '20px 24px' }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>
          {name || 'ジャーナル更新回数'}
        </span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {lastFetched && <span style={{ fontSize: 11, color: '#9ca3af' }}>最終取得: {lastFetched}</span>}
          <button type="button" style={btnBase} onClick={() => loadRecords()} disabled={loading}>
            {loading ? '取得中...' : '更新'}
          </button>
          <button type="button" style={btnBase} onClick={() => setIsSettingsOpen(o => !o)}>
            {isSettingsOpen ? '設定を閉じる' : '設定'}
          </button>
          <button type="button" style={{ ...btnBase, color: '#dc2626', borderColor: '#fca5a5' }} onClick={onDelete}>
            削除
          </button>
        </div>
      </div>

      {/* 設定パネル */}
      {isSettingsOpen && (
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
          <div style={rowStyle}>
            <span style={labelStyle}>タイル名</span>
            <input type="text" value={name ?? ''} onChange={e => onUpdateConfig({ ...config, name: e.target.value || undefined })}
              style={{ ...inputStyle, flex: 1 }} placeholder="ジャーナル更新回数" />
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>ソースチケット#</span>
            <input type="number" value={sourceIssueId || ''} style={{ ...inputStyle, width: 110 }}
              onChange={e => { const v = parseInt(e.target.value, 10); onUpdateConfig({ ...config, sourceIssueId: isNaN(v) ? 0 : v }) }} />
            <span style={{ fontSize: 11, color: '#9ca3af' }}>JournalRecord JSON を保存したチケット番号</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>集計開始日</span>
            <input type="date" value={startDate} style={inputStyle}
              onChange={e => onUpdateConfig({ ...config, startDate: e.target.value })} />
            <span style={{ fontSize: 11, color: '#9ca3af' }}>空欄で自動（6ヶ月前の1日）</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>集計終了日</span>
            <input type="date" value={endDate} style={inputStyle}
              onChange={e => onUpdateConfig({ ...config, endDate: e.target.value })} />
            <span style={{ fontSize: 11, color: '#9ca3af' }}>空欄で自動（当日）</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>週単位表示月</span>
            <input
              type="month"
              value={config.weeklyDetailMonth ?? ''}
              onChange={e => onUpdateConfig({ ...config, weeklyDetailMonth: e.target.value || undefined })}
              style={inputStyle}
            />
            <span style={{ fontSize: 11, color: '#9ca3af' }}>空欄で自動（今月）</span>
          </div>

          {/* CSV インポート */}
          <div style={{ ...rowStyle, marginBottom: 12 }}>
            <span style={labelStyle}>CSV取込</span>
            <input
              type="file"
              accept=".csv"
              ref={csvInputRef}
              style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) handleCsvImport(file)
                e.target.value = ''
              }}
            />
            <button type="button" style={btnBase} onClick={() => csvInputRef.current?.click()}>
              CSVから取り込む
            </button>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>列順: 名前, Resource, 追加列...</span>
          </div>

          {/* トラッカーフィルタ */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: '#555', marginBottom: 4 }}>トラッカーフィルタ（空=全件）</div>
            {trackerOptions.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {trackerOptions.map(opt => {
                  const id = Number(opt.value)
                  return (
                    <label key={opt.value} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
                      <input type="checkbox" checked={filterTrackerIds.includes(id)}
                        onChange={e => {
                          const next = e.target.checked ? [...filterTrackerIds, id] : filterTrackerIds.filter(t => t !== id)
                          onUpdateConfig({ ...config, filterTrackerIds: next })
                        }} />
                      {opt.label}
                    </label>
                  )
                })}
              </div>
            ) : (
              <span style={{ fontSize: 11, color: '#9ca3af' }}>取得中...</span>
            )}
          </div>

          {/* 追加列管理 */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: '#555', marginBottom: 4 }}>追加列</div>
            {extraColumns.map((col, idx) => (
              <div key={col.key} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <button type="button" style={{ ...btnSmall, opacity: idx === 0 ? 0.3 : 1 }} disabled={idx === 0} onClick={() => moveColumn(idx, -1)}>↑</button>
                <button type="button" style={{ ...btnSmall, opacity: idx === extraColumns.length - 1 ? 0.3 : 1 }} disabled={idx === extraColumns.length - 1} onClick={() => moveColumn(idx, 1)}>↓</button>
                <input
                  type="text"
                  value={col.label}
                  onChange={e => updateColumnLabel(col.key, e.target.value)}
                  style={{ fontSize: 12, padding: '2px 6px', border: '1px solid #ccc', borderRadius: 3, width: 120 }}
                />
                <button type="button" style={{ ...btnSmall, color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => deleteColumn(col.key)}>×</button>
              </div>
            ))}
            <button
              type="button"
              onClick={addColumn}
              style={{ fontSize: 11, padding: '2px 8px', border: '1px solid #ccc', borderRadius: 3, background: '#fff', cursor: 'pointer', marginTop: 2 }}
            >
              ＋ 列を追加
            </button>
          </div>

          {/* 担当者エディタ（並び替え付き） */}
          <PersonEditor
            persons={persons}
            allOptions={allOptions}
            onChange={next => onUpdateConfig({ ...config, persons: next })}
          />
        </div>
      )}

      {error && (
        <div style={{ fontSize: 12, color: '#dc2626', marginBottom: 10, padding: '6px 10px', background: '#fef2f2', borderRadius: 6 }}>{error}</div>
      )}
      {loading && <div style={{ fontSize: 13, color: '#6b7280', padding: '20px 0' }}>読み込み中...</div>}

      {/* テーブル */}
      {!loading && records !== null && (
        persons.length === 0 ? (
          <div style={{ fontSize: 13, color: '#9ca3af', padding: '12px 0' }}>設定パネルから担当者を追加してください。</div>
        ) : columns.length === 0 ? (
          <div style={{ fontSize: 13, color: '#9ca3af', padding: '12px 0' }}>集計開始日・終了日を設定してください。</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, textAlign: 'left', minWidth: 120 }}>担当者</th>
                  {extraColumns.map(col => (
                    <th key={col.key} style={{ ...thStyle, minWidth: 40 }}>{col.label}</th>
                  ))}
                  {columns.map(col => (
                    <th key={col.key} style={thStyle}>{col.label}</th>
                  ))}
                  <th style={{ ...thStyle, background: '#f3f4f6' }}>合計</th>
                  {monthAvgLabel && <th style={avgThStyle}>{monthAvgLabel}</th>}
                  {weekAvgLabel  && <th style={avgThStyle}>{weekAvgLabel}</th>}
                </tr>
              </thead>
              <tbody>
                {persons.map(p => (
                  <tr key={p.id}>
                    <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 500, color: isTempId(p.id) ? '#dc2626' : '#374151' }}>
                      {p.name}{isTempId(p.id) ? ' ⚠' : ''}
                    </td>
                    {extraColumns.map(col => (
                      <td key={col.key} style={extraTdStyle}>
                        <input
                          type={col.type === 'number' ? 'number' : 'text'}
                          value={localExtraValues[p.id]?.[col.key] ?? ''}
                          onChange={e => handleExtraValueChange(p.id, col.key, e.target.value)}
                          onBlur={e => handleExtraValueBlur(p.id, col.key, e.target.value)}
                          style={{
                            fontSize: 12, padding: '2px 4px', border: '1px solid #e5e7eb',
                            borderRadius: 3, width: '100%', boxSizing: 'border-box',
                            background: '#fff', textAlign: col.type === 'number' ? 'right' : 'left',
                          }}
                        />
                      </td>
                    ))}
                    {columns.map(col => {
                      const count = countMap[p.id]?.[col.key] ?? 0
                      return <td key={col.key} style={tdStyle}>{count > 0 ? count : ''}</td>
                    })}
                    <td style={totalTdStyle}>{personTotals[p.id] > 0 ? personTotals[p.id] : ''}</td>
                    {monthAvgLabel && <td style={avgTdStyle}>{fmtAvg(personMonthAvg[p.id])}</td>}
                    {weekAvgLabel  && <td style={avgTdStyle}>{fmtAvg(personWeekAvg[p.id])}</td>}
                  </tr>
                ))}
                <tr>
                  <td style={{ ...totalTdStyle, textAlign: 'left' }}>合計</td>
                  {extraColumns.map(col => <td key={col.key} style={totalTdStyle} />)}
                  {columns.map(col => (
                    <td key={col.key} style={totalTdStyle}>{colTotals[col.key] > 0 ? colTotals[col.key] : ''}</td>
                  ))}
                  <td style={{ ...totalTdStyle, background: '#eff6ff' }}>{grandTotal > 0 ? grandTotal : ''}</td>
                  {monthAvgLabel && <td style={avgTotalTdStyle}>{fmtAvg(totalMonthAvg)}</td>}
                  {weekAvgLabel  && <td style={avgTotalTdStyle}>{fmtAvg(totalWeekAvg)}</td>}
                </tr>
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}
