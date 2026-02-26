import type { RedmineIssue, SeriesConfig, SeriesDataPoint } from '../types'
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
 * 2. チケットの最古作成日
 * 3. 14日前
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
  } else if (issues.length > 0) {
    // フィルタ未指定の場合は取得済みチケットの最古の作成日を使用
    const minDate = issues.reduce((min, issue) =>
      issue.created_on < min ? issue.created_on : min, issues[0].created_on)
    fromDate = new Date(minDate.slice(0, 10))
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

      // 集計対象の日付を取得
      let targetDate: string
      if (s.dateField === 'closed_on') {
        if (!issue.closed_on) continue  // closed_on が null のチケットはスキップ
        targetDate = utcToJstDate(issue.closed_on)
      } else {
        // created_on: UTCの日付部分をそのまま使用（Redmineのcreated_onは通常JSTと誤差が少ない）
        targetDate = issue.created_on.slice(0, 10)
      }

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
          let targetDate: string
          if (s.dateField === 'closed_on') {
            if (!issue.closed_on) continue
            targetDate = utcToJstDate(issue.closed_on)
          } else {
            targetDate = issue.created_on.slice(0, 10)
          }
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
