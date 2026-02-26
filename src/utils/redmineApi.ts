import type { FetchProgress, RedmineIssue, RedmineIssuesResponse, RedmineStatus } from '../types'

// 開発環境（localhost）などRedmineに接続できない場合のフォールバック
export const FALLBACK_STATUSES: RedmineStatus[] = [
  { id: 1, name: '新規', is_closed: false },
  { id: 2, name: '進行中', is_closed: false },
  { id: 3, name: 'フィードバック', is_closed: false },
  { id: 4, name: '解決', is_closed: false },
  { id: 5, name: 'Closed', is_closed: true },
  { id: 6, name: 'Dropped', is_closed: true },
]

interface IssueStatusesResponse {
  issue_statuses: RedmineStatus[]
}

export async function fetchIssueStatuses(apiKey: string): Promise<RedmineStatus[]> {
  const response = await fetch('/issue_statuses.json', {
    headers: buildHeaders(apiKey),
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch issue statuses: ${response.status}`)
  }
  const data: IssueStatusesResponse = await response.json()
  return data.issue_statuses
}

function buildHeaders(apiKey: string): HeadersInit {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiKey) {
    headers['X-Redmine-API-Key'] = apiKey
  }
  return headers
}

function buildIssueQueryParams(rawSearch: string, offset: number, limit: number): URLSearchParams {
  const params = new URLSearchParams(rawSearch)
  params.set('status_id', '*')  // 全ステータス（closed_on のあるチケットも含める）
  params.set('limit', String(limit))
  params.set('offset', String(offset))
  return params
}

async function fetchIssuesPage(
  projectId: string,
  rawSearch: string,
  apiKey: string,
  offset: number,
  limit: number,
): Promise<RedmineIssuesResponse> {
  const params = buildIssueQueryParams(rawSearch, offset, limit)
  const url = `/projects/${projectId}/issues.json?${params.toString()}`

  const response = await fetch(url, { headers: buildHeaders(apiKey) })
  if (!response.ok) {
    throw new Error(`Failed to fetch issues: ${response.status}`)
  }
  return response.json() as Promise<RedmineIssuesResponse>
}

/**
 * 全ページを自動取得してチケット一覧を返す
 * ページネーション: limit=100 で total_count に達するまで繰り返し取得
 * onProgress: 各ページ取得後に呼ばれる進捗コールバック（省略可）
 */
export async function fetchAllIssues(
  projectId: string,
  rawSearch: string,
  apiKey: string,
  onProgress?: (progress: FetchProgress) => void,
): Promise<RedmineIssue[]> {
  const limit = 100
  let offset = 0
  let allIssues: RedmineIssue[] = []

  while (true) {
    const data = await fetchIssuesPage(projectId, rawSearch, apiKey, offset, limit)
    allIssues = [...allIssues, ...data.issues]
    onProgress?.({ fetched: allIssues.length, total: data.total_count })
    if (allIssues.length >= data.total_count || data.issues.length === 0) {
      break
    }
    offset += limit
  }

  return allIssues
}

/**
 * Redmineチケット一覧ページのDOMに埋め込まれた availableFilters から
 * プロジェクト固有のステータス一覧を取得する。
 * 取得できない場合（開発環境等）は null を返す。
 *
 * availableFilters.status_id.values のフォーマット:
 *   [["ステータス名", "id文字列"], ...]
 */
export function getStatusesFromPage(): RedmineStatus[] | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const af = (window as any).availableFilters
  const values: unknown = af?.status_id?.values
  if (!Array.isArray(values) || values.length === 0) {
    return null
  }
  const statuses: RedmineStatus[] = values
    .filter((v): v is [string, string] => Array.isArray(v) && v.length >= 2)
    .map(([name, idStr]) => ({
      id: Number(idStr),
      name: String(name),
      is_closed: false,
    }))
  return statuses.length > 0 ? statuses : null
}
