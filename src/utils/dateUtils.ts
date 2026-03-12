/**
 * UTC日時文字列をJST日付文字列（YYYY-MM-DD）に変換する
 * Redmine APIの closed_on はUTCで返るため、+9時間してJSTの日付を取得する
 * 例: "2026-02-25T02:23:30Z" → "2026-02-25"
 */
export function utcToJstDate(utcString: string): string {
  const date = new Date(utcString)
  const jstMs = date.getTime() + 9 * 60 * 60 * 1000
  return new Date(jstMs).toISOString().slice(0, 10)
}

/**
 * UTC日時文字列から今日（JST）までの経過日数を返す
 * 例: 3日前のUTC文字列 → 3
 */
export function calcElapsedDays(utcString: string): number {
  const jstDateStr = utcToJstDate(utcString)
  const todayJst = utcToJstDate(new Date().toISOString())
  const ms = new Date(todayJst).getTime() - new Date(jstDateStr).getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

/**
 * UTC ISO文字列またはYYYY-MM-DD文字列から今日（JST）までの経過日数を返す。
 * UTC ISO（"T"を含む）は utcToJstDate() でJST変換し、YYYY-MM-DD はそのまま使用する。
 */
export function calcElapsedDaysFromStr(dateStr: string): number {
  const jstDateStr = (dateStr.includes('T') || dateStr.endsWith('Z'))
    ? utcToJstDate(dateStr)
    : dateStr.slice(0, 10)
  const todayJst = utcToJstDate(new Date().toISOString())
  const ms = new Date(todayJst).getTime() - new Date(jstDateStr).getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

/**
 * フィールドキーに対応する日付文字列をチケットから取得する。
 * 値が空/未設定の場合は null を返す。
 * - updated_on / created_on / closed_on: UTC ISO文字列
 * - start_date / due_date: YYYY-MM-DD文字列
 * - cf_{id}: カスタムフィールド（YYYY-MM-DD文字列）
 */
export function getIssueDateByField(
  issue: { updated_on: string; created_on: string; closed_on: string | null; start_date?: string; due_date?: string; custom_fields?: Array<{ id: number; name: string; value: string | string[] | null }> },
  fieldKey: string
): string | null {
  if (fieldKey === 'updated_on') return issue.updated_on || null
  if (fieldKey === 'created_on') return issue.created_on || null
  if (fieldKey === 'closed_on') return issue.closed_on || null
  if (fieldKey === 'start_date') return issue.start_date || null
  if (fieldKey === 'due_date') return issue.due_date || null
  if (fieldKey.startsWith('cf_')) {
    const id = parseInt(fieldKey.slice(3), 10)
    const cf = issue.custom_fields?.find(c => c.id === id)
    const val = cf?.value
    return (typeof val === 'string' && val) ? val : null
  }
  return null
}
