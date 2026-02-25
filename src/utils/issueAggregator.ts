import type { RedmineFilter, RedmineIssue, SeriesConfig, SeriesDataPoint } from '../types'
import { utcToJstDate } from './dateUtils'

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function generateDateRange(from: Date, to: Date): string[] {
  const dates: string[] = []
  const current = new Date(from)
  current.setHours(0, 0, 0, 0)
  const end = new Date(to)
  end.setHours(0, 0, 0, 0)

  while (current <= end) {
    dates.push(formatDate(current))
    current.setDate(current.getDate() + 1)
  }
  return dates
}

/**
 * Redmineチケット一覧を系列設定に基づいて SeriesDataPoint[] に集計する
 *
 * - created_on 系列: チケットの作成日（UTC文字列の日付部分）でカウント
 * - closed_on 系列: チケットの完了日（utcToJstDate でJST変換）でカウント。closed_on が null のチケットはスキップ
 * - statusIds が空でない場合: 対象ステータスIDに一致するチケットのみカウント
 * - aggregation === 'cumulative': 日別値の累計に変換
 */
export function aggregateIssues(
  issues: RedmineIssue[],
  series: SeriesConfig[],
  filter: RedmineFilter
): SeriesDataPoint[] {
  // 日付範囲を確定
  let fromDate: Date
  let toDate: Date

  if (filter.createdOn?.from) {
    fromDate = new Date(filter.createdOn.from)
  } else if (issues.length > 0) {
    // フィルタ未指定の場合は取得済みチケットの最古の作成日を使用
    const minDate = issues.reduce((min, issue) =>
      issue.created_on < min ? issue.created_on : min, issues[0].created_on)
    fromDate = new Date(minDate.slice(0, 10))
  } else {
    fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - 29)
  }

  if (filter.createdOn?.to) {
    toDate = new Date(filter.createdOn.to)
  } else {
    toDate = new Date()
  }

  const dates = generateDateRange(fromDate, toDate)

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
      let cumulative = 0
      for (const point of result) {
        cumulative += point[s.id] as number
        point[s.id] = cumulative
      }
    }
  }

  return result
}
