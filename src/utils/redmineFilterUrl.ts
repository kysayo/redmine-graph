import type { SeriesCondition } from '../types'

interface FilterParam {
  field: string
  operator: '=' | '!'
  values: string[]
}

/**
 * rawSearch（window.location.search）をパースして FilterParam[] に変換する。
 * - query_id パラメータは除外する（Redmineの保存クエリはURLに展開できないため）
 * - set_filter=1 形式の明示的フィルタのみ対象
 */
function parseRawSearchFilters(rawSearch: string): FilterParam[] {
  const params = new URLSearchParams(rawSearch)
  const fields = params.getAll('f[]')
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
    params.set(`op[${f.field}]`, f.operator === '!' ? '!' : '=')
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
  sliceFilter: FilterParam,
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
      filterMap.set(cond.field, {
        field: cond.field,
        operator: cond.operator,
        values: cond.values,
      })
    }
  }

  // sliceFilter を最高優先で上書き
  filterMap.set(sliceFilter.field, sliceFilter)

  const filters = Array.from(filterMap.values())
  const filterQs = buildFilterQueryString(filters)

  // issuesページのパスを取得（/projects/xxx/issues まで）
  const issuesPath = basePathname.replace(/\/issues\/.*$/, '/issues').replace(/\/$/, '')

  return `${issuesPath}?set_filter=1&${filterQs}`
}
