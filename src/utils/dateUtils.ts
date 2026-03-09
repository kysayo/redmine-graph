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
