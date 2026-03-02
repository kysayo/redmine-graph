import type { PieDataPoint, RedmineIssue, SeriesCondition, SeriesConfig, SeriesDataPoint } from '../types'
import { utcToJstDate } from './dateUtils'

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function isWeekend(date: Date): boolean {
  const day = date.getDay() // 0=日, 6=土
  return day === 0 || day === 6
}

/** 土曜→+2日(月曜)、日曜→+1日(月曜)、平日はそのまま返す */
function shiftToMonday(dateStr: string): string {
  const date = new Date(dateStr)
  const day = date.getDay()
  if (day === 6) date.setDate(date.getDate() + 2)
  else if (day === 0) date.setDate(date.getDate() + 1)
  return formatDate(date)
}

function generateDateRange(from: Date, to: Date, hideWeekends = false): string[] {
  const dates: string[] = []
  const current = new Date(from)
  current.setHours(0, 0, 0, 0)
  const end = new Date(to)
  end.setHours(0, 0, 0, 0)

  while (current <= end) {
    if (!hideWeekends || !isWeekend(current)) {
      dates.push(formatDate(current))
    }
    current.setDate(current.getDate() + 1)
  }
  return dates
}

/**
 * 与えられた日付に対して「その日以降で最初の基準曜日」を返す
 * anchorDay: 1=月, 2=火, 3=水, 4=木, 5=金（JavaScript の getDay() と対応）
 */
function getNextAnchorDate(dateStr: string, anchorDay: number): string {
  const date = new Date(dateStr)
  const dayOfWeek = date.getDay()
  const daysToNext = (anchorDay - dayOfWeek + 7) % 7
  if (daysToNext !== 0) {
    date.setDate(date.getDate() + daysToNext)
  }
  return formatDate(date)
}

/**
 * 週次の基準日配列を生成する
 * from の日付以降で最初の基準日から始まり、to まで 7 日ずつ進む
 */
function generateWeeklyDateRange(from: Date, to: Date, anchorDay: number): string[] {
  const dates: string[] = []
  const firstAnchor = getNextAnchorDate(formatDate(from), anchorDay)
  const current = new Date(firstAnchor)
  current.setHours(0, 0, 0, 0)
  const end = new Date(to)
  end.setHours(0, 0, 0, 0)

  while (current <= end) {
    dates.push(formatDate(current))
    current.setDate(current.getDate() + 7)
  }
  return dates
}

/**
 * チケットが1つの絞り込み条件にマッチするか判定する
 * - tracker_id: issue.tracker.id の文字列表現と比較
 * - priority_id: issue.priority.id の文字列表現と比較
 * - cf_{id}: issue.custom_fields から id が一致するカスタムフィールドの value と比較
 * - その他: 非対応フィールドはフィルタしない（true を返す）
 */
function conditionMatchesIssue(cond: SeriesCondition, issue: RedmineIssue): boolean {
  const { field, operator, values } = cond
  let issueValues: string[] = []

  if (field === 'status_id') {
    issueValues = [String(issue.status.id)]
  } else if (field === 'tracker_id') {
    issueValues = [String(issue.tracker.id)]
  } else if (field === 'priority_id') {
    issueValues = issue.priority ? [String(issue.priority.id)] : []
  } else if (field.startsWith('cf_')) {
    const cfId = Number(field.slice(3))
    const cf = issue.custom_fields?.find(c => c.id === cfId)
    if (!cf) return operator === '!'
    const v = cf.value
    issueValues = Array.isArray(v) ? v.filter((x): x is string => x !== null) : v !== null ? [v] : []
  } else {
    return true
  }

  const hasMatch = values.some(v => issueValues.includes(v))
  return operator === '=' ? hasMatch : !hasMatch
}

function issueMatchesConditions(issue: RedmineIssue, conditions: SeriesCondition[]): boolean {
  return conditions.every(c => conditionMatchesIssue(c, issue))
}

/**
 * チケットから系列設定に基づく集計対象日付を取得する
 * - created_on: UTCの日付部分をそのまま使用
 * - closed_on: UTC→JST変換。null のチケットは null を返す（スキップ対象）
 * - custom: customDateFieldKey に基づいてフィールド値を取得
 *   - 'cf_{id}' 形式: custom_fields から取得
 *   - その他('start_date', 'due_date' 等): issue の直接プロパティから取得
 *   - 値が空/null/未設定の場合は null を返す（スキップ対象）
 */
function getIssueDateForSeries(issue: RedmineIssue, s: SeriesConfig): string | null {
  if (s.dateField === 'closed_on') {
    if (!issue.closed_on) return null
    return utcToJstDate(issue.closed_on)
  }
  if (s.dateField === 'custom') {
    const key = s.customDateFieldKey
    if (!key) return null
    if (key.startsWith('cf_')) {
      const cfId = Number(key.slice(3))
      const cf = issue.custom_fields?.find(c => c.id === cfId)
      const v = cf?.value
      const dateStr = Array.isArray(v) ? (v[0] ?? null) : v ?? null
      if (!dateStr || typeof dateStr !== 'string') return null
      return dateStr  // YYYY-MM-DD（UTC変換不要）
    }
    // start_date, due_date などの標準フィールド
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dateStr = (issue as any)[key]
    if (!dateStr || typeof dateStr !== 'string') return null
    return dateStr
  }
  // created_on（デフォルト）
  return issue.created_on.slice(0, 10)
}

interface AggregateOptions {
  /** ユーザー指定のグラフX軸開始日（YYYY-MM-DD）。未設定=自動 */
  startDate?: string
  /** true のとき土日をX軸から除外し、土日分のチケットは月曜に計上 */
  hideWeekends?: boolean
  /** true = 週次集計モード。false/undefined = 日次（従来） */
  weeklyMode?: boolean
  /** 週次の基準曜日。1=月, 2=火, 3=水, 4=木, 5=金。デフォルト 1 */
  anchorDay?: number
}

/**
 * Redmineチケット一覧を系列設定に基づいて SeriesDataPoint[] に集計する
 *
 * - created_on 系列: チケットの作成日（UTC文字列の日付部分）でカウント
 * - closed_on 系列: チケットの完了日（utcToJstDate でJST変換）でカウント。closed_on が null のチケットはスキップ
 * - statusIds が空でない場合: 対象ステータスIDに一致するチケットのみカウント
 * - aggregation === 'cumulative': 日別値の累計に変換
 * - hideWeekends === true（日次モード時のみ）: 土日をX軸から除外し、土日のチケットは次の月曜に計上
 * - weeklyMode === true: X軸を週次（anchorDay の曜日が基準）に切り替え
 *
 * 開始日の優先順位:
 * 1. options.startDate（ユーザー指定）
 * 2. 今日から14日前（空欄時は毎回自動計算）
 */
export function aggregateIssues(
  issues: RedmineIssue[],
  series: SeriesConfig[],
  options: AggregateOptions = {}
): SeriesDataPoint[] {
  const { startDate, hideWeekends = false, weeklyMode = false, anchorDay = 1 } = options

  // 日付範囲を確定
  let fromDate: Date

  if (startDate) {
    fromDate = new Date(startDate)
  } else {
    fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - 14)
  }

  const toDate = new Date()

  const dates = weeklyMode
    ? generateWeeklyDateRange(fromDate, toDate, anchorDay)
    : generateDateRange(fromDate, toDate, hideWeekends)

  // 系列ごとの日別カウントを初期化（全日付を 0 で埋める）
  const dailyCounts: Record<string, Record<string, number>> = {}
  for (const s of series) {
    dailyCounts[s.id] = {}
    for (const date of dates) {
      dailyCounts[s.id][date] = 0
    }
  }

  // チケットを集計
  for (const issue of issues) {
    for (const s of series) {
      // ステータスフィルタ
      if (s.statusIds.length > 0 && !s.statusIds.includes(issue.status.id)) {
        continue
      }
      // 条件フィルタ
      if (s.conditions?.length && !issueMatchesConditions(issue, s.conditions)) {
        continue
      }

      // 集計対象の日付を取得
      const rawDate = getIssueDateForSeries(issue, s)
      if (rawDate === null) continue  // 日付なし（closed_on が null、custom で未設定など）はスキップ
      let targetDate = rawDate

      if (weeklyMode) {
        // 週次モード: 基準日に振り替える
        targetDate = getNextAnchorDate(targetDate, anchorDay)
      } else if (hideWeekends) {
        // 日次モード: 土日非表示の場合は次の月曜日に振り替える
        targetDate = shiftToMonday(targetDate)
      }

      // 日付範囲内のみカウント
      if (dailyCounts[s.id][targetDate] !== undefined) {
        dailyCounts[s.id][targetDate]++
      }
    }
  }

  // SeriesDataPoint[] に変換
  const result: SeriesDataPoint[] = dates.map((date) => {
    const point: SeriesDataPoint = { date }
    for (const s of series) {
      point[s.id] = dailyCounts[s.id][date]
    }
    return point
  })

  // cumulative（累計）系列を変換
  for (const s of series) {
    if (s.aggregation === 'cumulative') {
      // startDate が指定されている場合、最初の日付より前のチケット数を初期値として積算する
      let cumulative = 0
      if (startDate && dates.length > 0) {
        // 週次モードでは最初の基準日、日次モードでは startDate を境界として使う
        const boundary = dates[0]
        for (const issue of issues) {
          if (s.statusIds.length > 0 && !s.statusIds.includes(issue.status.id)) {
            continue
          }
          // 条件フィルタ
          if (s.conditions?.length && !issueMatchesConditions(issue, s.conditions)) {
            continue
          }
          const rawDate = getIssueDateForSeries(issue, s)
          if (rawDate === null) continue
          let targetDate = rawDate
          if (weeklyMode) {
            targetDate = getNextAnchorDate(targetDate, anchorDay)
          } else if (hideWeekends) {
            targetDate = shiftToMonday(targetDate)
          }
          // 最初のX軸日付より前のチケットを初期値として加算
          if (targetDate < boundary) {
            cumulative++
          }
        }
      }

      for (const point of result) {
        cumulative += point[s.id] as number
        point[s.id] = cumulative
      }
    }
  }

  return result
}

/**
 * チケットから円グラフ用のグループ値（表示名）を取得する
 * - status_id: ステータス名
 * - tracker_id: トラッカー名
 * - priority_id: 優先度名
 * - assigned_to_id: 担当者名
 * - cf_{id}: カスタムフィールド値（文字列）
 */
function getIssueGroupValue(issue: RedmineIssue, groupBy: string): string | null {
  if (groupBy === 'status_id') return issue.status.name
  if (groupBy === 'tracker_id') return issue.tracker.name
  if (groupBy === 'priority_id') return issue.priority?.name ?? null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (groupBy === 'assigned_to_id') return (issue as any).assigned_to?.name ?? null
  if (groupBy.startsWith('cf_')) {
    const cfId = Number(groupBy.slice(3))
    const cf = issue.custom_fields?.find(c => c.id === cfId)
    const v = cf?.value
    if (Array.isArray(v)) return (v[0] as string) ?? null
    return (v as string) ?? null
  }
  return null
}

/**
 * Redmineチケット一覧を groupBy フィールドでグループ化し、円グラフ用データに集計する
 * conditions が指定された場合は一致するチケットのみを集計する
 */
export function aggregatePie(issues: RedmineIssue[], groupBy: string, conditions?: SeriesCondition[]): PieDataPoint[] {
  const counts = new Map<string, number>()
  for (const issue of issues) {
    if (conditions?.length && !issueMatchesConditions(issue, conditions)) continue
    const key = getIssueGroupValue(issue, groupBy)
    if (key === null || key === '') continue
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}
