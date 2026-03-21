/**
 * 祝日の Set（YYYY-MM-DD形式）。setHolidays() で設定する。
 * calcBusinessElapsedDaysFromStr / jstDateNBusinessDaysAgo で参照する。
 */
let _holidays: Set<string> = new Set()

/** "2026-3-20" → "2026-03-20" のように月・日を0埋めする */
function normalizeDate(d: string): string {
  const parts = d.split('-')
  if (parts.length !== 3) return d
  return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`
}

/**
 * 祝日リストをセットする。App マウント時に呼ぶ。
 * dates は "2026-3-20" のような月・日の0埋め不要な形式を受け付ける。
 */
export function setHolidays(dates: string[]): void {
  _holidays = new Set(dates.map(normalizeDate))
}

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
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  return isNaN(days) ? 0 : days
}

/**
 * UTC ISO文字列またはYYYY-MM-DD文字列から今日（JST）までの経過営業日数（月〜金のみカウント）を返す。
 * dateStr の翌日から today まで1日ずつ進め、平日のみカウントする。
 * 無効な日付の場合は 0 を返す（NaN保護）。
 */
export function calcBusinessElapsedDaysFromStr(dateStr: string): number {
  const jstDateStr = (dateStr.includes('T') || dateStr.endsWith('Z'))
    ? utcToJstDate(dateStr)
    : dateStr.slice(0, 10)
  const todayJst = utcToJstDate(new Date().toISOString())
  const start = new Date(jstDateStr + 'T00:00:00Z')
  const end = new Date(todayJst + 'T00:00:00Z')
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0
  let count = 0
  const d = new Date(start)
  d.setUTCDate(d.getUTCDate() + 1) // 翌日から開始
  while (d <= end) {
    const day = d.getUTCDay() // 0=日, 6=土
    const ds = d.toISOString().slice(0, 10)
    if (day !== 0 && day !== 6 && !_holidays.has(ds)) count++
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return count
}

/**
 * JST の today から N 営業日前の YYYY-MM-DD を返す。
 * 1日ずつ遡り、月〜金のみカウントする。n=0 のとき today をそのまま返す。
 * 例: n=5, today=木曜 → 先週木曜（7暦日前）
 */
export function jstDateNBusinessDaysAgo(n: number): string {
  const todayJst = utcToJstDate(new Date().toISOString())
  const d = new Date(todayJst + 'T00:00:00Z')
  let count = 0
  while (count < n) {
    d.setUTCDate(d.getUTCDate() - 1)
    const day = d.getUTCDay()
    const ds = d.toISOString().slice(0, 10)
    if (day !== 0 && day !== 6 && !_holidays.has(ds)) count++
  }
  return d.toISOString().slice(0, 10)
}

/**
 * 今日からベース日付まで何営業日か（符号付き）を返す。
 * - 正: ベース日付が未来（N営業日後）
 * - 0: ベース日付が今日
 * - 負: ベース日付が過去（N営業日超過）
 * 例: due_date が 3営業日後 → 3, due_date が 2営業日前（超過）→ -2
 */
export function calcBusinessDaysUntilStr(dateStr: string): number {
  const jstDateStr = (dateStr.includes('T') || dateStr.endsWith('Z'))
    ? utcToJstDate(dateStr)
    : dateStr.slice(0, 10)
  const todayJst = utcToJstDate(new Date().toISOString())
  const target = new Date(jstDateStr + 'T00:00:00Z')
  const today = new Date(todayJst + 'T00:00:00Z')
  if (isNaN(target.getTime()) || isNaN(today.getTime())) return 0

  if (target > today) {
    // 未来: today+1 〜 target まで営業日をカウント → 正
    let count = 0
    const d = new Date(today)
    d.setUTCDate(d.getUTCDate() + 1)
    while (d <= target) {
      const day = d.getUTCDay()
      const ds = d.toISOString().slice(0, 10)
      if (day !== 0 && day !== 6 && !_holidays.has(ds)) count++
      d.setUTCDate(d.getUTCDate() + 1)
    }
    return count
  } else if (target < today) {
    // 過去: target+1 〜 today まで営業日をカウント → 負
    let count = 0
    const d = new Date(target)
    d.setUTCDate(d.getUTCDate() + 1)
    while (d <= today) {
      const day = d.getUTCDay()
      const ds = d.toISOString().slice(0, 10)
      if (day !== 0 && day !== 6 && !_holidays.has(ds)) count++
      d.setUTCDate(d.getUTCDate() + 1)
    }
    return -count
  } else {
    return 0
  }
}

/**
 * 今日から N 営業日後の YYYY-MM-DD を返す。
 * n=0 → today。n<0 のときは jstDateNBusinessDaysAgo(-n) と等価。
 */
export function jstDateNBusinessDaysLater(n: number): string {
  if (n < 0) return jstDateNBusinessDaysAgo(-n)
  const todayJst = utcToJstDate(new Date().toISOString())
  const d = new Date(todayJst + 'T00:00:00Z')
  let count = 0
  while (count < n) {
    d.setUTCDate(d.getUTCDate() + 1)
    const day = d.getUTCDay()
    const ds = d.toISOString().slice(0, 10)
    if (day !== 0 && day !== 6 && !_holidays.has(ds)) count++
  }
  return d.toISOString().slice(0, 10)
}

/**
 * 今日から n 営業日オフセットした YYYY-MM-DD を返す。
 * n >= 0 → jstDateNBusinessDaysLater(n)
 * n < 0  → jstDateNBusinessDaysAgo(-n)
 */
export function jstDateWithBusinessDaysOffset(n: number): string {
  return n >= 0 ? jstDateNBusinessDaysLater(n) : jstDateNBusinessDaysAgo(-n)
}

/**
 * startDate（含む）から endDate（含む）までの営業日数を返す。
 * 土日・祝日（_holidays）をスキップする。
 * startDate > endDate の場合は 0 を返す。
 * EVM の「対象期間の総営業日数」計算に使用する。
 */
export function countBusinessDaysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate + 'T00:00:00Z')
  const end = new Date(endDate + 'T00:00:00Z')
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0
  if (start > end) return 0
  let count = 0
  const d = new Date(start)
  while (d <= end) {
    const day = d.getUTCDay()
    const ds = d.toISOString().slice(0, 10)
    if (day !== 0 && day !== 6 && !_holidays.has(ds)) count++
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return count
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
