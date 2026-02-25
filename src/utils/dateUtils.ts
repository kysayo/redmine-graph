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
