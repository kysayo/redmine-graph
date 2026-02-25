import type { RedmineFilter } from '../types'

/**
 * window.location.search からRedmineのフィルタ条件を取得する
 *
 * Redmineのチケット一覧URLのパラメータ例:
 *   ?created_on=><date>2024-01-01&created_on=<=2024-12-31&tracker_id[]=1&tracker_id[]=2
 */
export function parseRedmineFilter(): RedmineFilter {
  const params = new URLSearchParams(window.location.search)
  const filter: RedmineFilter = {}

  // created_on の解析
  // Redmineは "><date>2024-01-01" (>=) や "<=2024-12-31" (<=) の形式を使う
  const createdOnValues = params.getAll('created_on')
  if (createdOnValues.length > 0) {
    filter.createdOn = {}
    for (const val of createdOnValues) {
      const fromMatch = val.match(/^><date>(\d{4}-\d{2}-\d{2})$/)
      const toMatch = val.match(/^<=(\d{4}-\d{2}-\d{2})$/)
      if (fromMatch) filter.createdOn.from = fromMatch[1]
      if (toMatch) filter.createdOn.to = toMatch[1]
    }
  }

  // tracker_id[] の解析
  const trackerIds = params.getAll('tracker_id[]')
  if (trackerIds.length > 0) {
    filter.trackerId = trackerIds
  }

  return filter
}
