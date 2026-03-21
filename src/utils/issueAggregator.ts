import type { CrossTableConfig, CrossTableData, ElapsedDaysBucket, FilterFieldOption, PieDataPoint, PieGroupRule, RedmineIssue, SeriesCondition, SeriesConfig, SeriesDataPoint, StackedBarDataPoint } from '../types'
import { calcBusinessDaysUntilStr, calcBusinessElapsedDaysFromStr, getIssueDateByField, utcToJstDate } from './dateUtils'

/**
 * ベース日付フィールドを元にチケットの経過営業日数（月〜金）または到来営業日数を計算する。
 * - mode === 'past'（デフォルト）: 経過日数（正値 = N日前）
 * - mode === 'future': 到来日数（正値 = N日後, 負値 = N日超過）
 * - baseField 未設定: updated_on || created_on を使用（旧来動作、pastモードのみ）
 * - baseField 指定あり・フィールドが空: null を返す（集計・条件判定から除外する）
 */
function getElapsedDaysForIssue(issue: RedmineIssue, baseField?: string, mode: 'past' | 'future' = 'past'): number | null {
  if (!baseField) {
    if (mode === 'future') return null  // 到来日数はベースフィールド指定が必須
    return calcBusinessElapsedDaysFromStr(issue.updated_on || issue.created_on)
  }
  const dateStr = getIssueDateByField(issue, baseField)
  if (!dateStr) return null
  return mode === 'future'
    ? calcBusinessDaysUntilStr(dateStr)
    : calcBusinessElapsedDaysFromStr(dateStr)
}

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function isWeekend(date: Date): boolean {
  const day = date.getDay() // 0=日, 6=土
  return day === 0 || day === 6
}

/** 土曜→+2日(月曜)、日曜→+1日(月曜)、平日はそのまま返す */
function shiftToMonday(dateStr: string): string {
  const date = new Date(dateStr)
  const day = date.getDay()
  if (day === 6) date.setDate(date.getDate() + 2)
  else if (day === 0) date.setDate(date.getDate() + 1)
  return formatDate(date)
}

function generateDateRange(from: Date, to: Date, hideWeekends = false): string[] {
  const dates: string[] = []
  const current = new Date(from)
  current.setHours(0, 0, 0, 0)
  const end = new Date(to)
  end.setHours(0, 0, 0, 0)

  while (current <= end) {
    if (!hideWeekends || !isWeekend(current)) {
      dates.push(formatDate(current))
    }
    current.setDate(current.getDate() + 1)
  }
  return dates
}

/**
 * 与えられた日付に対して「その日以降で最初の基準曜日」を返す
 * anchorDay: 1=月, 2=火, 3=水, 4=木, 5=金（JavaScript の getDay() と対応）
 */
function getNextAnchorDate(dateStr: string, anchorDay: number): string {
  const date = new Date(dateStr)
  const dayOfWeek = date.getDay()
  const daysToNext = (anchorDay - dayOfWeek + 7) % 7
  if (daysToNext !== 0) {
    date.setDate(date.getDate() + daysToNext)
  }
  return formatDate(date)
}

/**
 * 週次の基準日配列を生成する
 * from の日付以降で最初の基準日から始まり、to まで 7 日ずつ進む
 */
function generateWeeklyDateRange(from: Date, to: Date, anchorDay: number): string[] {
  const dates: string[] = []
  const firstAnchor = getNextAnchorDate(formatDate(from), anchorDay)
  const current = new Date(firstAnchor)
  current.setHours(0, 0, 0, 0)
  const end = new Date(to)
  end.setHours(0, 0, 0, 0)

  while (current <= end) {
    dates.push(formatDate(current))
    current.setDate(current.getDate() + 7)
  }
  return dates
}

/**
 * window.ViewCustomize.context.user.id から現在ログイン中のユーザーIDを文字列で返す。
 * 取得できない場合（開発環境等）は null を返す。
 */
function resolveCurrentUserId(): string | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const id = (window as any).ViewCustomize?.context?.user?.id
  return id != null ? String(id) : null
}

/**
 * チケットが1つの絞り込み条件にマッチするか判定する
 * - status_id: issue.status.id の文字列表現と比較
 * - tracker_id: issue.tracker.id の文字列表現と比較
 * - priority_id: issue.priority.id の文字列表現と比較
 * - author_id: issue.author.id の文字列表現と比較
 * - assigned_to_id: issue.assigned_to.id の文字列表現と比較
 * - category_id: issue.category.id の文字列表現と比較
 * - fixed_version_id: issue.fixed_version.id の文字列表現と比較
 * - cf_{id}: issue.custom_fields から id が一致するカスタムフィールドの value と比較
 * - その他: 非対応フィールドはフィルタしない（true を返す）
 *
 * 特殊値 "me" は resolveCurrentUserId() で現在ユーザーIDに変換してから比較する。
 */
function conditionMatchesIssue(cond: SeriesCondition, issue: RedmineIssue): boolean {
  const { field, operator } = cond
  // "me" を現在ユーザーIDに解決する
  const currentUserId = resolveCurrentUserId()
  const values = cond.values.map(v => (v === 'me' && currentUserId ? currentUserId : v))
  let issueValues: string[] = []

  if (field === 'elapsed_days') {
    const mode = cond.elapsedDaysMode ?? 'past'
    const days = getElapsedDaysForIssue(issue, cond.elapsedDaysBaseField, mode)
    if (days === null) return false  // ベース日付フィールドが空のチケットは除外
    const target = parseInt(values[0], 10)
    if (isNaN(target)) return true
    if (operator === '=') return days === target
    if (operator === '>=') return days >= target
    if (operator === '<=') return days <= target
    return true
  }

  if (field === 'status_id') {
    issueValues = [String(issue.status.id)]
  } else if (field === 'tracker_id') {
    issueValues = [String(issue.tracker.id)]
  } else if (field === 'priority_id') {
    issueValues = issue.priority ? [String(issue.priority.id)] : []
  } else if (field === 'author_id') {
    issueValues = issue.author ? [String(issue.author.id)] : []
  } else if (field === 'assigned_to_id') {
    issueValues = issue.assigned_to ? [String(issue.assigned_to.id)] : []
  } else if (field === 'category_id') {
    issueValues = issue.category ? [String(issue.category.id)] : []
  } else if (field === 'fixed_version_id') {
    issueValues = issue.fixed_version ? [String(issue.fixed_version.id)] : []
  } else if (field.startsWith('cf_')) {
    const cfId = Number(field.slice(3))
    const cf = issue.custom_fields?.find(c => c.id === cfId)
    if (!cf) return operator === '!'
    const v = cf.value
    issueValues = Array.isArray(v) ? v.filter((x): x is string => x !== null) : v !== null ? [v] : []
  } else {
    return true
  }

  const hasMatch = values.some(v => issueValues.includes(v))
  return operator === '=' ? hasMatch : !hasMatch
}

function issueMatchesConditions(issue: RedmineIssue, conditions: SeriesCondition[]): boolean {
  return conditions.every(c => conditionMatchesIssue(c, issue))
}

/**
 * チケットから系列設定に基づく集計対象日付を取得する
 * - created_on: UTCの日付部分をそのまま使用
 * - closed_on: UTC→JST変換。null のチケットは null を返す（スキップ対象）
 * - custom: customDateFieldKey に基づいてフィールド値を取得
 *   - 'cf_{id}' 形式: custom_fields から取得
 *   - その他('start_date', 'due_date' 等): issue の直接プロパティから取得
 *   - 値が空/null/未設定の場合は null を返す（スキップ対象）
 */
function getIssueDateForSeries(issue: RedmineIssue, s: SeriesConfig): string | null {
  if (s.dateField === 'closed_on') {
    if (!issue.closed_on) return null
    return utcToJstDate(issue.closed_on)
  }
  if (s.dateField === 'custom') {
    const key = s.customDateFieldKey
    if (!key) return null
    if (key.startsWith('cf_')) {
      const cfId = Number(key.slice(3))
      const cf = issue.custom_fields?.find(c => c.id === cfId)
      const v = cf?.value
      const dateStr = Array.isArray(v) ? (v[0] ?? null) : v ?? null
      if (!dateStr || typeof dateStr !== 'string') return null
      return dateStr  // YYYY-MM-DD（UTC変換不要）
    }
    // start_date, due_date などの標準フィールド
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dateStr = (issue as any)[key]
    if (!dateStr || typeof dateStr !== 'string') return null
    return dateStr
  }
  // created_on（デフォルト）
  return issue.created_on.slice(0, 10)
}

interface AggregateOptions {
  /** ユーザー指定のグラフX軸開始日（YYYY-MM-DD）。未設定=自動 */
  startDate?: string
  /** true のとき土日をX軸から除外し、土日分のチケットは月曜に計上 */
  hideWeekends?: boolean
  /** true = 週次集計モード。false/undefined = 日次（従来） */
  weeklyMode?: boolean
  /** 週次の基準曜日。1=月, 2=火, 3=水, 4=木, 5=金。デフォルト 1 */
  anchorDay?: number
}

/**
 * 条件に合致するチケット数を返す
 * conditions が空の場合は全チケット数を返す
 */
export function countIssues(issues: RedmineIssue[], conditions: SeriesCondition[]): number {
  if (!conditions.length) return issues.length
  return issues.filter(issue => issueMatchesConditions(issue, conditions)).length
}

/**
 * Redmineチケット一覧を系列設定に基づいて SeriesDataPoint[] に集計する
 *
 * - created_on 系列: チケットの作成日（UTC文字列の日付部分）でカウント
 * - closed_on 系列: チケットの完了日（utcToJstDate でJST変換）でカウント。closed_on が null のチケットはスキップ
 * - statusIds が空でない場合: 対象ステータスIDに一致するチケットのみカウント
 * - aggregation === 'cumulative': 日別値の累計に変換
 * - hideWeekends === true（日次モード時のみ）: 土日をX軸から除外し、土日のチケットは次の月曜に計上
 * - weeklyMode === true: X軸を週次（anchorDay の曜日が基準）に切り替え
 *
 * 開始日の優先順位:
 * 1. options.startDate（ユーザー指定）
 * 2. 今日から14日前（空欄時は毎回自動計算）
 */
export function aggregateIssues(
  issues: RedmineIssue[],
  series: SeriesConfig[],
  options: AggregateOptions = {}
): SeriesDataPoint[] {
  const { startDate, hideWeekends = false, weeklyMode = false, anchorDay = 1 } = options

  // 日付範囲を確定
  let fromDate: Date

  if (startDate) {
    fromDate = new Date(startDate)
  } else {
    fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - (weeklyMode ? 70 : 14))
  }

  const toDate = new Date()

  const dates = weeklyMode
    ? generateWeeklyDateRange(fromDate, toDate, anchorDay)
    : generateDateRange(fromDate, toDate, hideWeekends)

  // 系列ごとの日別カウントを初期化（全日付を 0 で埋める）
  const dailyCounts: Record<string, Record<string, number>> = {}
  for (const s of series) {
    dailyCounts[s.id] = {}
    for (const date of dates) {
      dailyCounts[s.id][date] = 0
    }
  }

  // チケットを集計（difference 系列はチケット集計をスキップ）
  for (const issue of issues) {
    for (const s of series) {
      if (s.aggregation === 'difference') continue

      // ステータスフィルタ
      if (s.statusIds.length > 0 && !s.statusIds.includes(issue.status.id)) {
        continue
      }
      // 条件フィルタ
      if (s.conditions?.length && !issueMatchesConditions(issue, s.conditions)) {
        continue
      }

      // 集計対象の日付を取得
      const rawDate = getIssueDateForSeries(issue, s)
      if (rawDate === null) continue  // 日付なし（closed_on が null、custom で未設定など）はスキップ
      let targetDate = rawDate

      if (weeklyMode) {
        // 週次モード: 基準日に振り替える
        targetDate = getNextAnchorDate(targetDate, anchorDay)
      } else if (hideWeekends) {
        // 日次モード: 土日非表示の場合は次の月曜日に振り替える
        targetDate = shiftToMonday(targetDate)
      }

      // 日付範囲内のみカウント
      if (dailyCounts[s.id][targetDate] !== undefined) {
        dailyCounts[s.id][targetDate]++
      }
    }
  }

  // SeriesDataPoint[] に変換
  const result: SeriesDataPoint[] = dates.map((date) => {
    const point: SeriesDataPoint = { date }
    for (const s of series) {
      point[s.id] = dailyCounts[s.id][date]
    }
    return point
  })

  // cumulative（累計）系列を変換（difference 系列はスキップ）
  for (const s of series) {
    if (s.aggregation === 'difference') continue
    if (s.aggregation === 'cumulative') {
      // グラフ開始日（dates[0]）より前のチケット数を初期値として積算する
      let cumulative = 0
      if (dates.length > 0) {
        // 週次モードでは最初の基準日、日次モードでは dates[0] を境界として使う
        const boundary = dates[0]
        for (const issue of issues) {
          if (s.statusIds.length > 0 && !s.statusIds.includes(issue.status.id)) {
            continue
          }
          // 条件フィルタ
          if (s.conditions?.length && !issueMatchesConditions(issue, s.conditions)) {
            continue
          }
          const rawDate = getIssueDateForSeries(issue, s)
          if (rawDate === null) continue
          let targetDate = rawDate
          if (weeklyMode) {
            targetDate = getNextAnchorDate(targetDate, anchorDay)
          } else if (hideWeekends) {
            targetDate = shiftToMonday(targetDate)
          }
          // 最初のX軸日付より前のチケットを初期値として加算
          if (targetDate < boundary) {
            cumulative++
          }
        }
      }

      for (const point of result) {
        cumulative += point[s.id] as number
        point[s.id] = cumulative
      }
    }
  }

  // difference（差分）系列を計算: 参照元2系列の値の差を代入
  for (const s of series) {
    if (s.aggregation !== 'difference') continue
    const [idA, idB] = s.refSeriesIds ?? []
    if (!idA || !idB) continue
    for (const point of result) {
      const a = (point[idA] as number) ?? 0
      const b = (point[idB] as number) ?? 0
      point[s.id] = a - b
    }
  }

  return result
}

/**
 * チケットから円グラフ用のグループ値（表示名）を取得する
 * - status_id: ステータス名
 * - tracker_id: トラッカー名
 * - priority_id: 優先度名
 * - assigned_to_id: 担当者名
 * - cf_{id}: カスタムフィールド値（文字列）
 */
function getIssueGroupValue(issue: RedmineIssue, groupBy: string): string | null {
  if (groupBy === 'status_id') return issue.status.name
  if (groupBy === 'tracker_id') return issue.tracker.name
  if (groupBy === 'priority_id') return issue.priority?.name ?? null
  if (groupBy === 'assigned_to_id') return issue.assigned_to?.name ?? null
  if (groupBy.startsWith('cf_')) {
    const cfId = Number(groupBy.slice(3))
    const cf = issue.custom_fields?.find(c => c.id === cfId)
    const v = cf?.value
    if (Array.isArray(v)) return (v[0] as string) ?? null
    return (v as string) ?? null
  }
  return null
}

/**
 * チケットから円グラフ用のフィルタ値（ID）を取得する（URLフィルタ構築用）
 * - status_id: ステータスID
 * - tracker_id: トラッカーID
 * - priority_id: 優先度ID
 * - assigned_to_id: 担当者ID
 * - cf_{id}: カスタムフィールド値（IDではなく値そのもの）
 */
function getIssueGroupFilterValue(issue: RedmineIssue, groupBy: string): string | null {
  if (groupBy === 'status_id') return String(issue.status.id)
  if (groupBy === 'tracker_id') return String(issue.tracker.id)
  if (groupBy === 'priority_id') return issue.priority ? String(issue.priority.id) : null
  if (groupBy === 'assigned_to_id') return issue.assigned_to ? String(issue.assigned_to.id) : null
  if (groupBy.startsWith('cf_')) {
    const cfId = Number(groupBy.slice(3))
    const cf = issue.custom_fields?.find(c => c.id === cfId)
    const v = cf?.value
    if (Array.isArray(v)) return (v[0] as string) ?? null
    return (v as string) ?? null
  }
  return null
}

/**
 * グルーピングルールに基づいて値をグループ名にマッピングする
 * どのルールにも属さない値はそのまま返す
 */
function applyGroupRules(value: string, groupRules: PieGroupRule[]): string {
  for (const rule of groupRules) {
    if (rule.name && rule.values.includes(value)) return rule.name
  }
  return value
}

/**
 * Redmineチケット一覧を groupBy フィールドでグループ化し、円グラフ用データに集計する
 * conditions が指定された場合は一致するチケットのみを集計する
 * groupRules が指定された場合はスライスをグルーピングする
 * groupBy === 'elapsed_days' かつ elapsedDaysBuckets が指定された場合は経過日数バケットで集計する
 */
export function aggregatePie(
  issues: RedmineIssue[],
  groupBy: string,
  conditions?: SeriesCondition[],
  groupRules?: PieGroupRule[],
  elapsedDaysBuckets?: ElapsedDaysBucket[],
  elapsedDaysBaseField?: string,
  elapsedDaysMode?: 'past' | 'future'
): PieDataPoint[] {
  // 経過日数/到来日数バケット集計モード
  if (groupBy === 'elapsed_days' && elapsedDaysBuckets?.length) {
    const mode = elapsedDaysMode ?? 'past'
    const bucketCounts = new Map<string, number>()
    for (const bucket of elapsedDaysBuckets) {
      bucketCounts.set(bucket.label, 0)
    }
    for (const issue of issues) {
      if (conditions?.length && !issueMatchesConditions(issue, conditions)) continue
      const days = getElapsedDaysForIssue(issue, elapsedDaysBaseField, mode)
      if (days === null) continue  // ベース日付フィールドが空のチケットはスキップ
      const bucket = elapsedDaysBuckets.find(b =>
        days >= b.min && (b.max === undefined || days <= b.max)
      )
      if (!bucket) continue
      bucketCounts.set(bucket.label, (bucketCounts.get(bucket.label) ?? 0) + 1)
    }
    return Array.from(bucketCounts.entries())
      .map(([name, value]) => ({ name, value, filterValues: [] }))
      .filter(p => p.value > 0)
  }

  const counts = new Map<string, number>()
  const filterValuesMap = new Map<string, Set<string>>()
  for (const issue of issues) {
    if (conditions?.length && !issueMatchesConditions(issue, conditions)) continue
    const raw = getIssueGroupValue(issue, groupBy)
    if (raw === null || raw === '') continue
    const key = groupRules?.length ? applyGroupRules(raw, groupRules) : raw
    counts.set(key, (counts.get(key) ?? 0) + 1)
    const filterVal = getIssueGroupFilterValue(issue, groupBy)
    if (filterVal !== null) {
      if (!filterValuesMap.has(key)) filterValuesMap.set(key, new Set())
      filterValuesMap.get(key)!.add(filterVal)
    }
  }
  return Array.from(counts.entries())
    .map(([name, value]) => ({
      name,
      value,
      filterValues: Array.from(filterValuesMap.get(name) ?? []),
    }))
    .sort((a, b) => b.value - a.value)
}

/**
 * Redmineチケット一覧を groupBy（主軸）× colorBy（色分け軸）で2次元集計し、
 * 横棒グラフの積み上げ表示用データに変換する。
 * conditions が指定された場合は一致するチケットのみを集計する。
 * groupRules/colorRules が指定された場合はそれぞれグルーピングを適用する。
 */
export function aggregateStackedBar(
  issues: RedmineIssue[],
  groupBy: string,
  colorBy: string,
  conditions?: SeriesCondition[],
  groupRules?: PieGroupRule[],
  colorRules?: PieGroupRule[],
): StackedBarDataPoint[] {
  // mainKey → segKey → count
  const countsMap = new Map<string, Map<string, number>>()
  // mainKey → Set<filterValue>（主軸のURLフィルタ値）
  const mainFilterMap = new Map<string, Set<string>>()
  // mainKey → segKey → Set<filterValue>（セグメントのURLフィルタ値）
  const segFilterMap = new Map<string, Map<string, Set<string>>>()

  for (const issue of issues) {
    if (conditions?.length && !issueMatchesConditions(issue, conditions)) continue

    const rawMain = getIssueGroupValue(issue, groupBy)
    if (rawMain === null || rawMain === '') continue
    const mainKey = groupRules?.length ? applyGroupRules(rawMain, groupRules) : rawMain

    const rawSeg = getIssueGroupValue(issue, colorBy)
    if (rawSeg === null || rawSeg === '') continue
    const segKey = colorRules?.length ? applyGroupRules(rawSeg, colorRules) : rawSeg

    // 件数集計
    if (!countsMap.has(mainKey)) countsMap.set(mainKey, new Map())
    const segCounts = countsMap.get(mainKey)!
    segCounts.set(segKey, (segCounts.get(segKey) ?? 0) + 1)

    // 主軸フィルタ値収集
    const mainFv = getIssueGroupFilterValue(issue, groupBy)
    if (mainFv !== null) {
      if (!mainFilterMap.has(mainKey)) mainFilterMap.set(mainKey, new Set())
      mainFilterMap.get(mainKey)!.add(mainFv)
    }

    // セグメントフィルタ値収集
    const segFv = getIssueGroupFilterValue(issue, colorBy)
    if (segFv !== null) {
      if (!segFilterMap.has(mainKey)) segFilterMap.set(mainKey, new Map())
      const segFvMap = segFilterMap.get(mainKey)!
      if (!segFvMap.has(segKey)) segFvMap.set(segKey, new Set())
      segFvMap.get(segKey)!.add(segFv)
    }
  }

  return Array.from(countsMap.entries())
    .map(([name, segCounts]) => {
      const segments: StackedBarDataPoint['segments'] = {}
      let total = 0
      for (const [segKey, count] of segCounts.entries()) {
        segments[segKey] = {
          count,
          filterValues: Array.from(segFilterMap.get(name)?.get(segKey) ?? []),
        }
        total += count
      }
      return {
        name,
        total,
        filterValues: Array.from(mainFilterMap.get(name) ?? []),
        segments,
      }
    })
    .sort((a, b) => b.total - a.total)
}

/**
 * Redmineチケット一覧を rowGroupBy × colGroupBy でクロス集計し、
 * テーブル表示用データに変換する。
 *
 * - rowOptions/colOptions が指定された場合は、チケットがなくても全選択肢を行/列に表示する
 * - rowGroupRules/colGroupRules が指定された場合は複数値を1行/列にグルーピングする
 * - 行/列キーの順序: options指定時はoptions順（末尾に未知値を件数降順で追加）、未指定時は件数降順
 */
export function aggregateCrossTable(
  issues: RedmineIssue[],
  config: CrossTableConfig,
  rowOptions?: FilterFieldOption[],
  colOptions?: FilterFieldOption[],
): CrossTableData {
  const { rowGroupBy, colGroupBy, conditions, rowGroupRules, colGroupRules } = config

  const rowLabels: Record<string, string> = {}
  const colLabels: Record<string, string> = {}
  const rowFvMap = new Map<string, Set<string>>()  // rowKey -> URL フィルタ値の集合
  const colFvMap = new Map<string, Set<string>>()
  const rowOptionsOrder: string[] = []  // options由来の行キー（出現順）
  const colOptionsOrder: string[] = []

  // Step 1: options から行/列キーを事前登録（0件行/列を含めるため）
  // グルーピング定義がある場合: ルール定義のみを表示対象として登録（未グループ値は除外）
  if (rowGroupRules?.length) {
    for (const rule of rowGroupRules) {
      if (!rule.name) continue
      if (!rowFvMap.has(rule.name)) {
        rowFvMap.set(rule.name, new Set())
        rowLabels[rule.name] = rule.name
        rowOptionsOrder.push(rule.name)
      }
      if (rowOptions) {
        for (const val of rule.values) {
          const opt = rowOptions.find(o => o.label === val)
          if (opt) rowFvMap.get(rule.name)!.add(opt.value)
        }
      }
    }
  } else if (rowOptions) {
    for (const opt of rowOptions) {
      const key = opt.label
      if (!rowFvMap.has(key)) {
        rowFvMap.set(key, new Set())
        rowLabels[key] = key
        rowOptionsOrder.push(key)
      }
      rowFvMap.get(key)!.add(opt.value)
    }
  }
  if (colGroupRules?.length) {
    for (const rule of colGroupRules) {
      if (!rule.name) continue
      if (!colFvMap.has(rule.name)) {
        colFvMap.set(rule.name, new Set())
        colLabels[rule.name] = rule.name
        colOptionsOrder.push(rule.name)
      }
      if (colOptions) {
        for (const val of rule.values) {
          const opt = colOptions.find(o => o.label === val)
          if (opt) colFvMap.get(rule.name)!.add(opt.value)
        }
      }
    }
  } else if (colOptions) {
    for (const opt of colOptions) {
      const key = opt.label
      if (!colFvMap.has(key)) {
        colFvMap.set(key, new Set())
        colLabels[key] = key
        colOptionsOrder.push(key)
      }
      colFvMap.get(key)!.add(opt.value)
    }
  }

  // Step 2: チケットを集計
  const cells: CrossTableData['cells'] = {}
  const rowTotals: Record<string, number> = {}
  const colTotals: Record<string, number> = {}
  let grandTotal = 0

  for (const issue of issues) {
    if (conditions?.length && !issueMatchesConditions(issue, conditions)) continue

    const rawRowLabel = getIssueGroupValue(issue, rowGroupBy)
    const rawColLabel = getIssueGroupValue(issue, colGroupBy)
    if (rawRowLabel === null || rawRowLabel === '' || rawColLabel === null || rawColLabel === '') continue

    const rowKey = rowGroupRules?.length ? applyGroupRules(rawRowLabel, rowGroupRules) : rawRowLabel
    const colKey = colGroupRules?.length ? applyGroupRules(rawColLabel, colGroupRules) : rawColLabel

    // グルーピング定義がある場合: いずれのルールにもマッチしない値はスキップ
    if (rowGroupRules?.length) {
      const inAnyRule = rowGroupRules.some(r => r.values.includes(rawRowLabel))
      if (!inAnyRule) continue
    }
    if (colGroupRules?.length) {
      const inAnyRule = colGroupRules.some(r => r.values.includes(rawColLabel))
      if (!inAnyRule) continue
    }

    if (!rowLabels[rowKey]) rowLabels[rowKey] = rowKey
    if (!colLabels[colKey]) colLabels[colKey] = colKey
    if (!rowFvMap.has(rowKey)) rowFvMap.set(rowKey, new Set())
    if (!colFvMap.has(colKey)) colFvMap.set(colKey, new Set())

    // フィルタ値を蓄積（options有無によらず常に追加。Set が重複を除去）
    const rowFv = getIssueGroupFilterValue(issue, rowGroupBy)
    if (rowFv !== null) rowFvMap.get(rowKey)!.add(rowFv)
    const colFv = getIssueGroupFilterValue(issue, colGroupBy)
    if (colFv !== null) colFvMap.get(colKey)!.add(colFv)

    if (!cells[rowKey]) cells[rowKey] = {}
    if (!cells[rowKey][colKey]) cells[rowKey][colKey] = { count: 0 }
    cells[rowKey][colKey].count++
    rowTotals[rowKey] = (rowTotals[rowKey] ?? 0) + 1
    colTotals[colKey] = (colTotals[colKey] ?? 0) + 1
    grandTotal++
  }

  // Step 3: 行/列キーの最終順序を確定
  const rowOptionsSet = new Set(rowOptionsOrder)
  const colOptionsSet = new Set(colOptionsOrder)

  const rowKeys = rowOptions
    ? [
        ...rowOptionsOrder,
        ...Object.keys(rowLabels).filter(k => !rowOptionsSet.has(k))
          .sort((a, b) => (rowTotals[b] ?? 0) - (rowTotals[a] ?? 0)),
      ]
    : Object.keys(rowLabels).sort((a, b) => (rowTotals[b] ?? 0) - (rowTotals[a] ?? 0))

  const colKeys = colOptions
    ? [
        ...colOptionsOrder,
        ...Object.keys(colLabels).filter(k => !colOptionsSet.has(k))
          .sort((a, b) => (colTotals[b] ?? 0) - (colTotals[a] ?? 0)),
      ]
    : Object.keys(colLabels).sort((a, b) => (colTotals[b] ?? 0) - (colTotals[a] ?? 0))

  const rowFilterValues: Record<string, string[]> = {}
  for (const [k, s] of rowFvMap.entries()) rowFilterValues[k] = Array.from(s)
  const colFilterValues: Record<string, string[]> = {}
  for (const [k, s] of colFvMap.entries()) colFilterValues[k] = Array.from(s)

  return { rowKeys, colKeys, rowLabels, colLabels, rowFilterValues, colFilterValues, cells, rowTotals, colTotals, grandTotal }
}
