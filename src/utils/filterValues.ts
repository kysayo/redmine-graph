import type { FilterField, FilterFieldOption } from '../types'
import { getProjectId } from './urlParser'

// リスト系フィールドタイプ（選択肢を持つもの）
const LIST_TYPES = new Set([
  'list',
  'list_optional',
  'list_with_history',
  'list_optional_with_history',
])

/**
 * window.availableFilters からリスト系フィールドの一覧を返す
 * Redmineチケット一覧ページに存在しない場合（開発環境など）は空配列を返す
 */
export function getAvailableFilterFields(): FilterField[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const af = (window as any).availableFilters
  if (!af) return []
  return Object.entries(af)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter(([, f]: any) => LIST_TYPES.has(f.type))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map(([key, f]: any) => ({ key, name: f.name as string }))
}

/**
 * window.availableFilters から日付型フィールドの一覧を返す
 * - type === 'date' のフィールドのみ対象（'date_past' の created_on/closed_on は除外）
 * - キーに '.' が含まれるフィールド（fixed_version.due_date 等）はチケットAPIから
 *   直接取得できないため除外する
 * Redmineチケット一覧ページに存在しない場合（開発環境など）は空配列を返す
 */
export function getAvailableDateFilterFields(): FilterField[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const af = (window as any).availableFilters
  if (!af) return []
  return Object.entries(af)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter(([key, f]: any) => f?.type === 'date' && !key.includes('.'))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map(([key, f]: any) => ({ key, name: f.name as string }))
}

// フィールドごとの値キャッシュ（ページライフサイクル内で共有）
const optionCache = new Map<string, FilterFieldOption[]>()

/**
 * 指定フィールドの選択肢一覧を返す
 * - remote: false の場合は availableFilters.values からそのまま返す
 * - remote: true  の場合は /queries/filter API を叩いて取得
 *
 * レスポンス形式は2種類:
 *   ["QA","BUG","CR"]          → label=value=文字列
 *   [["name","id"],...]        → label=name, value=id
 */
export async function fetchFilterFieldOptions(
  fieldKey: string,
  apiKey: string,
): Promise<FilterFieldOption[]> {
  if (optionCache.has(fieldKey)) return optionCache.get(fieldKey)!

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const af = (window as any).availableFilters
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const field: any = af?.[fieldKey]
  if (!field) return []

  let options: FilterFieldOption[]

  if (!field.remote && Array.isArray(field.values)) {
    // values は [[label, value], ...] のペア配列
    options = (field.values as [string, string][]).map(([label, value]) => ({ label, value }))
  } else {
    // remote: true → /queries/filter API で取得
    const projectId = getProjectId()
    const headers: Record<string, string> = {}
    if (apiKey) headers['X-Redmine-API-Key'] = apiKey
    const params = new URLSearchParams({
      project_id: projectId ?? '',
      type: 'IssueQuery',
      name: fieldKey,
    })
    const res = await fetch(`/queries/filter?${params}`, { headers })
    if (!res.ok) return []
    options = parseFilterApiResponse(await res.json())
  }

  optionCache.set(fieldKey, options)
  return options
}

function parseFilterApiResponse(data: unknown): FilterFieldOption[] {
  if (!Array.isArray(data)) return []
  // ["QA","BUG","CR"] 形式（カスタムフィールド系）
  if (typeof data[0] === 'string') {
    return (data as string[]).map(v => ({ label: v, value: v }))
  }
  // [["name","id"],...] 形式（tracker, priority など）
  if (Array.isArray(data[0])) {
    return (data as [string, string][])
      .filter(v => v.length >= 2)
      .map(([label, value]) => ({ label, value }))
  }
  return []
}
