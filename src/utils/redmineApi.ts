import type { RedmineFilter, RedmineIssue, RedmineIssuesResponse, RedmineStatus } from '../types'

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

export async function fetchIssueStatuses(): Promise<RedmineStatus[]> {
  const response = await fetch('/issue_statuses.json', {
    headers: { 'Content-Type': 'application/json' },
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

function buildIssueQueryParams(filter: RedmineFilter, offset: number, limit: number): URLSearchParams {
  const params = new URLSearchParams()
  params.set('status_id', '*')  // 全ステータス（closed_on のあるチケットも含める）
  params.set('limit', String(limit))
  params.set('offset', String(offset))

  if (filter.createdOn?.from) {
    params.append('created_on', `><date>${filter.createdOn.from}`)
  }
  if (filter.createdOn?.to) {
    params.append('created_on', `<=${filter.createdOn.to}`)
  }
  if (filter.trackerId) {
    for (const id of filter.trackerId) {
      params.append('tracker_id[]', id)
    }
  }

  return params
}

async function fetchIssuesPage(
  projectId: string,
  filter: RedmineFilter,
  apiKey: string,
  offset: number,
  limit: number
): Promise<RedmineIssuesResponse> {
  const params = buildIssueQueryParams(filter, offset, limit)
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
 */
export async function fetchAllIssues(
  projectId: string,
  filter: RedmineFilter,
  apiKey: string
): Promise<RedmineIssue[]> {
  const limit = 100
  let offset = 0
  let allIssues: RedmineIssue[] = []

  while (true) {
    const data = await fetchIssuesPage(projectId, filter, apiKey, offset, limit)
    allIssues = [...allIssues, ...data.issues]
    if (allIssues.length >= data.total_count || data.issues.length === 0) {
      break
    }
    offset += limit
  }

  return allIssues
}
