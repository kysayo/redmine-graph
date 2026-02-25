import type { RedmineFilter } from '../types'

/**
 * URLパスから Redmine のプロジェクト識別子を取得する
 * 例: /projects/europe/issues → "europe"
 */
export function getProjectId(): string {
  const match = window.location.pathname.match(/\/projects\/([^/]+)\//)
  return match?.[1] ?? ''
}

/**
 * window.location.search からRedmineのフィルタ条件を取得する
 *
 * Redmineのチケット一覧URLのパラメータ形式（標準）:
 *   ?f[]=created_on&op[created_on]=><&v[created_on][]=2026-01-27&v[created_on][]=2026-02-24
 *   または番号付き: ?f[0]=created_on&op[created_on]=><&v[created_on][]=2026-01-27
 *
 * 演算子 (op[created_on]) の対応:
 *   ><   : 期間指定（values[0]=from, values[1]=to）
 *   >=   : 以降
 *   <=   : 以前
 *   >t-  : 今日から過去N日（相対指定、絶対日付に変換）
 */
export function parseRedmineFilter(): RedmineFilter {
  const params = new URLSearchParams(window.location.search)
  const filter: RedmineFilter = {}

  // Redmineの標準URL形式でフィールド一覧を収集
  // f[] または f[N]（Nは0始まりの番号）の両方に対応
  const allFields: string[] = []
  for (const [key, value] of params.entries()) {
    if (key === 'f[]' || /^f\[\d+\]$/.test(key)) {
      allFields.push(value)
    }
  }

  // created_on フィルタの解析
  if (allFields.includes('created_on')) {
    const op = params.get('op[created_on]')
    const values = params.getAll('v[created_on][]')
    filter.createdOn = {}

    if (op === '><' && values.length >= 2) {
      // 期間指定（from と to）
      filter.createdOn.from = values[0]
      filter.createdOn.to = values[1]
    } else if (op === '>=' && values.length >= 1) {
      filter.createdOn.from = values[0]
    } else if (op === '<=' && values.length >= 1) {
      filter.createdOn.to = values[0]
    } else if (op === '>t-' && values.length >= 1) {
      // 相対指定「今日から過去N日」→ 絶対日付に変換
      const days = parseInt(values[0], 10)
      if (!isNaN(days)) {
        const from = new Date()
        from.setDate(from.getDate() - days)
        filter.createdOn.from = from.toISOString().slice(0, 10)
      }
    }

    // 有効値がなければ削除
    if (!filter.createdOn.from && !filter.createdOn.to) {
      delete filter.createdOn
    }
  }

  // tracker_id フィルタの解析
  if (allFields.includes('tracker_id')) {
    const trackerValues = params.getAll('v[tracker_id][]')
    if (trackerValues.length > 0) {
      filter.trackerId = trackerValues
    }
  }

  // 後方互換性: 旧形式 created_on=><date>YYYY-MM-DD のパース（開発・テスト用）
  if (!filter.createdOn) {
    const legacyCreatedOn = params.getAll('created_on')
    if (legacyCreatedOn.length > 0) {
      filter.createdOn = {}
      for (const val of legacyCreatedOn) {
        const fromMatch = val.match(/^><date>(\d{4}-\d{2}-\d{2})$/)
        const toMatch = val.match(/^<=(\d{4}-\d{2}-\d{2})$/)
        if (fromMatch) filter.createdOn.from = fromMatch[1]
        if (toMatch) filter.createdOn.to = toMatch[1]
      }
    }
  }

  // 後方互換性: 旧形式 tracker_id[]=N のパース
  if (!filter.trackerId) {
    const legacyTrackerIds = params.getAll('tracker_id[]')
    if (legacyTrackerIds.length > 0) {
      filter.trackerId = legacyTrackerIds
    }
  }

  return filter
}
