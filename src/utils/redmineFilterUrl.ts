import type { ElapsedDaysBucket, SeriesCondition } from '../types'
import { jstDateNBusinessDaysAgo, jstDateWithBusinessDaysOffset } from './dateUtils'

interface FilterParam {
  field: string
  operator: string  // '=' | '!' | '<=' | '><' など任意のRedmine演算子
  values: string[]
}

/**
 * ElapsedDaysBucket を Redmine フィルタパラメータに変換する。
 * クリック時の JST 日付を基準に絶対日付で計算する。
 * @param baseField - 経過日数/到来日数のベース日付フィールドキー（省略時は 'updated_on'）
 * @param mode - 'past'=経過日数（デフォルト）、'future'=到来日数
 *
 * past モード（経過日数）:
 *   {min: N}        → field <= today-N（N営業日以上経過）
 *   {min: N, max: M} → today-M <= field <= today-N
 *
 * future モード（到来日数）:
 *   {min: N}        → field >= today+N（N営業日以上先）
 *   {min: N, max: M} → today+N <= field <= today+M
 *   負値も許可: {min: -3, max: 0} = 0〜3営業日超過
 */
export function buildElapsedDaysBucketFilter(bucket: ElapsedDaysBucket, baseField?: string, mode: 'past' | 'future' = 'past'): {
  field: string
  operator: string
  values: string[]
} {
  const { min, max } = bucket
  const field = baseField ?? 'updated_on'

  if (mode === 'future') {
    if (max === undefined) {
      // N営業日以上先: field >= today+N
      return { field, operator: '>=', values: [jstDateWithBusinessDaysOffset(min)] }
    }
    // 範囲: today+min <= field <= today+max
    return {
      field,
      operator: '><',
      values: [jstDateWithBusinessDaysOffset(min), jstDateWithBusinessDaysOffset(max)],
    }
  }

  // past モード（経過日数・従来動作）
  if (max === undefined) {
    // N日以上経過: field <= today - N
    return { field, operator: '<=', values: [jstDateNBusinessDaysAgo(min)] }
  }
  // 範囲（min === max でも >< で統一）: today-max <= field <= today-min
  return {
    field,
    operator: '><',
    values: [jstDateNBusinessDaysAgo(max), jstDateNBusinessDaysAgo(min)],
  }
}

/**
 * rawSearch（window.location.search）をパースして FilterParam[] に変換する。
 * - query_id パラメータは除外する（Redmineの保存クエリはURLに展開できないため）
 * - set_filter=1 形式の明示的フィルタのみ対象
 */
function parseRawSearchFilters(rawSearch: string): FilterParam[] {
  const params = new URLSearchParams(rawSearch)
  const fields = params.getAll('f[]').filter(f => f !== '')
  if (fields.length === 0) return []

  return fields.map((field) => {
    const op = params.get(`op[${field}]`) ?? '='
    const values = params.getAll(`v[${field}][]`)
    // Redmineの演算子を SeriesCondition の operator に変換（= と ! のみサポート）
    const operator: '=' | '!' = op === '!' ? '!' : '='
    return { field, operator, values }
  })
}

/**
 * FilterParam[] から Redmine のフィルタクエリ文字列を構築する
 * （set_filter=1 は含まない）
 */
function buildFilterQueryString(filters: FilterParam[]): string {
  const params = new URLSearchParams()
  for (const f of filters) {
    params.append('f[]', f.field)
    params.set(`op[${f.field}]`, f.operator)
    for (const v of f.values) {
      params.append(`v[${f.field}][]`, v)
    }
  }
  return params.toString()
}

/**
 * Redmineのチケット一覧URLをフィルタ条件付きで生成する
 *
 * @param basePathname - window.location.pathname（例: /projects/myproject/issues）
 * @param rawSearch - window.location.search（例: ?set_filter=1&f[]=tracker_id&...）
 * @param sliceFilter - クリックしたスライスの条件（最高優先度）
 * @param pieConditions - 円グラフの conditions（SeriesCondition[]）
 * @returns フィルタ付きの絶対URL文字列
 *
 * フィルタの優先順位（高→低）:
 * 1. sliceFilter（クリックしたスライス）
 * 2. pieConditions（円グラフ固有の絞り込み）
 * 3. rawSearch の明示的フィルタ（query_id を除く）
 *
 * 同一フィールドが複数箇所で指定された場合、優先度が高いものに上書きされる。
 * query_id は除外し、set_filter=1 で明示的フィルタとして開く。
 */
export function buildRedmineFilterUrl(
  basePathname: string,
  rawSearch: string,
  sliceFilter: FilterParam | undefined,
  pieConditions?: SeriesCondition[]
): string {
  // rawSearch から明示的フィルタをパース（query_id は除外）
  const rawFilters = parseRawSearchFilters(rawSearch)

  // Map<field, FilterParam> にマージ（低優先→高優先の順で上書き）
  const filterMap = new Map<string, FilterParam>()

  for (const f of rawFilters) {
    filterMap.set(f.field, f)
  }

  if (pieConditions?.length) {
    for (const cond of pieConditions) {
      // elapsed_days はRedmineのURLフィルタに非対応。ベース日付フィールドのフィルタに変換
      if (cond.field === 'elapsed_days') {
        if (cond.operator !== '!') {
          const days = parseInt(cond.values[0], 10)
          const mode = cond.elapsedDaysMode ?? 'past'
          if (!isNaN(days)) {
            if (cond.operator === '<=') {
              // '<=' の変換は buildElapsedDaysBucketFilter では扱えないため個別処理
              // past + <=N: "N営業日以内に更新" → field >= today-N
              // future + <=N: "N営業日以内に到来" → field <= today+N
              const converted = mode === 'future'
                ? { field: cond.elapsedDaysBaseField ?? 'updated_on', operator: '<=', values: [jstDateWithBusinessDaysOffset(days)] }
                : { field: cond.elapsedDaysBaseField ?? 'updated_on', operator: '>=', values: [jstDateNBusinessDaysAgo(days)] }
              filterMap.set(converted.field, converted)
            } else {
              const bucket: ElapsedDaysBucket = cond.operator === '>='
                ? { label: '', min: days }
                : { label: '', min: days, max: days }
              const converted = buildElapsedDaysBucketFilter(bucket, cond.elapsedDaysBaseField, mode)
              filterMap.set(converted.field, converted)
            }
          }
        }
        continue
      }
      // dateCondition を含む SeriesCondition（日付フィールド絞り込み）
      if (cond.dateCondition) {
        const { op, value } = cond.dateCondition
        if (op === 'empty') {
          filterMap.set(cond.field, { field: cond.field, operator: '!*', values: [] })
        } else if (op === 'not_empty') {
          filterMap.set(cond.field, { field: cond.field, operator: '*', values: [] })
        } else {
          const now = new Date()
          const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
          const today = jst.toISOString().slice(0, 10)
          let refDate = value === 'today' ? today : (value ?? today)
          let urlOp: string
          if (op === '<') {
            const d = new Date(refDate); d.setDate(d.getDate() - 1); refDate = d.toISOString().slice(0, 10); urlOp = '<='
          } else if (op === '>') {
            const d = new Date(refDate); d.setDate(d.getDate() + 1); refDate = d.toISOString().slice(0, 10); urlOp = '>='
          } else {
            urlOp = op  // '<=' または '>=' はそのまま
          }
          filterMap.set(cond.field, { field: cond.field, operator: urlOp, values: [refDate] })
        }
        continue
      }
      // Redmine URLフィルタで使用する演算子のみ通す（日付比較 <=/>=/*/!* を含む）
      if (!['=', '!', '!*', '*', '<=', '>='].includes(cond.operator)) continue
      filterMap.set(cond.field, {
        field: cond.field,
        operator: cond.operator,
        values: cond.values,
      })
    }
  }

  // sliceFilter を最高優先で上書き
  if (sliceFilter) {
    filterMap.set(sliceFilter.field, sliceFilter)
  }

  const filters = Array.from(filterMap.values())
  const filterQs = buildFilterQueryString(filters)

  // issuesページのパスを取得（/projects/xxx/issues まで）
  const issuesPath = basePathname.replace(/\/issues\/.*$/, '/issues').replace(/\/$/, '')

  return `${issuesPath}?set_filter=1&${filterQs}`
}
