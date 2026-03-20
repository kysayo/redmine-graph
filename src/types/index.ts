// グラフの設定（data属性から読み取る）
export interface GraphConfig {
  // 2軸グラフの左軸の内容
  comboLeft: 'cumulative' | 'daily'
  // 2軸グラフの右軸の内容
  comboRight: 'cumulative' | 'daily'
  // 円グラフのグループキー（例: 'status', 'tracker'）
  pieGroupBy: string
}

// 2軸グラフの1データポイント（後方互換のため残す）
export interface ComboDataPoint {
  date: string       // YYYY-MM-DD
  daily: number      // その日の発生チケット数
  cumulative: number // 累計チケット数
}

// 円グラフの1データポイント
export interface PieDataPoint {
  name: string
  value: number
  filterValues?: string[]  // URLフィルタ構築用（IDまたはCF値）
}

// 円グラフ スライスグルーピングルール
export interface PieGroupRule {
  name: string      // グループ名（例: "対応中"）
  values: string[]  // グループ対象の値リスト（例: ["In Progress", "In Progress(Permanent)"]）
}

// 円グラフ 経過日数バケット（groupBy === 'elapsed_days' のときのスライス定義）
export interface ElapsedDaysBucket {
  label: string   // スライス名（例: "5日以上"）
  min: number     // 最小経過日数（含む）
  max?: number    // 最大経過日数（含む）。省略 = 以上（上限なし）
}

// 集計カード設定
export interface SummaryCardConfig {
  title: string
  color: string  // HEX accent color（カード上辺ボーダー + 数値テキスト色）
  numerator: { conditions: SeriesCondition[] }    // 分子: 条件に合致するチケット数
  denominator?: { conditions: SeriesCondition[] } // 分母: 省略可。指定時は「分子 / 分母」形式で表示
}

// 横棒グラフ 積み上げセグメント1件
export interface StackedSegment {
  count: number
  filterValues?: string[]  // セグメントのURLフィルタ値（例: ステータスID）
}

// 横棒グラフ 積み上げモードの1データポイント（colorBy指定時）
export interface StackedBarDataPoint {
  name: string                              // 主軸の表示名（例: '担当者A'）
  total: number                             // 合計件数（ソート・topN用）
  filterValues?: string[]                   // 主軸のURLフィルタ値
  segments: Record<string, StackedSegment>  // セグメント名 → 件数・フィルタ値
}

// 円グラフ系列設定
export interface PieSeriesConfig {
  groupBy: string            // フィールドキー（例: 'status_id', 'tracker_id', 'cf_123', 'elapsed_days'）
  label?: string             // グラフタイトル（省略時 = フィールド表示名）
  conditions?: SeriesCondition[]  // 集計対象の絞り込み条件（省略時 = フィルタなし）
  groupRules?: PieGroupRule[] // スライスグルーピングルール（空配列/未設定 = グルーピングなし）
  elapsedDaysBuckets?: ElapsedDaysBucket[]  // groupBy === 'elapsed_days' のときのバケット定義
  elapsedDaysBaseField?: string  // groupBy === 'elapsed_days' のとき: 経過日数計算のベース日付フィールドキー
  elapsedDaysMode?: 'past' | 'future'  // groupBy === 'elapsed_days' のとき: 'past'=経過日数（デフォルト）、'future'=到来日数
  chartType?: 'pie' | 'bar'  // グラフ種別（省略時 = 'pie'、後方互換）
  topN?: number              // 横棒グラフの表示上限件数（省略時 = 全件表示）
  fullWidth?: boolean        // 横棒グラフの全幅表示（省略時 = true）
  colorBy?: string           // 横棒グラフの色分けキー（例: 'status_id'）。指定時は積み上げ棒グラフで表示
  colorRules?: PieGroupRule[] // 色分けグルーピングルール（PieGroupRule を再利用）
}

// --- 系列設定UI 追加 ---

// Redmineのチケットステータス（APIから取得）
export interface RedmineStatus {
  id: number
  name: string
  is_closed: boolean
}

// 1つのグラフ系列の設定
export interface SeriesConfig {
  id: string                                        // 系列識別子（例: 'series-0'）
  label: string                                     // 凡例表示名（例: '発生チケット数'）
  dateField: 'created_on' | 'closed_on' | 'custom' // 集計に使う日付フィールド
  customDateFieldKey?: string                       // dateField === 'custom' のとき使用（例: 'cf_534', 'start_date'）
  statusIds: number[]                               // 対象ステータスID（空 = 全ステータス）
  chartType: 'bar' | 'line'
  yAxisId: 'left' | 'right'
  aggregation: 'daily' | 'cumulative' | 'difference'
  refSeriesIds?: [string, string]                   // aggregation === 'difference' のとき: [被減数系列ID, 減数系列ID]
  color: string                                     // 系列の色（HEX）
  conditions?: SeriesCondition[]                    // 絞り込み条件（省略可 = フィルタなし）
  visible?: boolean                                 // 表示/非表示（省略時 = true として扱う）
}

// クロス集計テーブル設定
export interface CrossTableConfig {
  label?: string                  // 表のタイトル（省略時 = 行フィールド × 列フィールド名）
  rowGroupBy: string              // 行のグループキー（availableFiltersのキー、例: 'cf_628'）
  colGroupBy: string              // 列のグループキー
  conditions?: SeriesCondition[]  // 集計対象の絞り込み条件（AND条件）
  rowGroupRules?: PieGroupRule[]  // 行のグルーピングルール（PieGroupRule を再利用）
  colGroupRules?: PieGroupRule[]  // 列のグルーピングルール
  fullWidth?: boolean             // false=3列グリッドに収まるサイズ、省略/true=全幅（デフォルト）
}

// クロス集計テーブルの集計結果
export interface CrossTableData {
  rowKeys: string[]                          // 行のキー（オプション順 or 件数降順）
  colKeys: string[]                          // 列のキー
  rowLabels: Record<string, string>          // key -> 表示名
  colLabels: Record<string, string>
  rowFilterValues: Record<string, string[]>  // rowKey -> URLフィルタ用ID/値
  colFilterValues: Record<string, string[]>  // colKey -> URLフィルタ用ID/値
  cells: Record<string, Record<string, { count: number }>>
  rowTotals: Record<string, number>
  colTotals: Record<string, number>
  grandTotal: number
}

// ユーザー設定全体（localStorageに保存する形）
export interface UserSettings {
  version: number
  series: SeriesConfig[]
  startDate?: string     // グラフX軸の開始日（YYYY-MM-DD）。未設定=自動
  hideWeekends?: boolean // true のとき土日をX軸から除外し、土日分は月曜に計上
  yAxisLeftMin?: number      // 左軸Y軸の最小値。未設定=自動スケール
  yAxisLeftMinAuto?: boolean // true=左軸最小値を「最大値の8割」で自動設定
  yAxisRightMax?: number     // 右軸Y軸の最大値。未設定=自動スケール
  weeklyMode?: boolean   // true = 週次集計。false/undefined = 日次（従来）
  anchorDay?: number     // 週次の基準曜日。1=月, 2=火, 3=水, 4=木, 5=金。デフォルト 1
  dateFormat?: 'yyyy-mm-dd' | 'M/D'  // X軸の日付表示形式。デフォルト 'yyyy-mm-dd'
  chartHeight?: number               // グラフ高さ(px)。未設定=320
  pieLeft?: PieSeriesConfig   // deprecated: pies に移行済み
  pieRight?: PieSeriesConfig  // deprecated: pies に移行済み
  pies?: PieSeriesConfig[]    // 任意個数の円グラフ設定
  summaryCards?: SummaryCardConfig[]  // 集計カード設定
  tables?: CrossTableConfig[] // 任意個数のクロス集計テーブル設定
}

// fetchAllIssues の進捗コールバック用
export interface FetchProgress {
  fetched: number       // 取得済み件数
  total: number | null  // total_count（最初のレスポンス前はnull）
}

// プリセット（名前付き設定セット）
export type PresetSettings = Omit<UserSettings, 'version'>

export interface Preset {
  id: string          // Date.now().toString()
  name: string        // ユーザー入力名
  settings: PresetSettings
}

// チームプリセット（管理者がView CustomizeのdataAttributeで定義する共有プリセット）
export interface TeamPreset {
  name: string
  settings: PresetSettings
}

// 複数系列対応のデータポイント（SeriesConfigのidをキーにした値を持つ）
export interface SeriesDataPoint {
  date: string
  [seriesId: string]: number | string
}

// --- 系列条件フィルタ ---

// 系列の1絞り込み条件
export interface SeriesCondition {
  field: string       // window.availableFilters のキー（例: 'cf_628', 'tracker_id'）
  operator: '=' | '!' | '>=' | '<='  // '=' = 一致、'!' = 不一致、'>=' = 以上、'<=' = 以下（以内）
  values: string[]    // 選択値の配列（例: ['QA', 'BUG']）
  elapsedDaysBaseField?: string  // field === 'elapsed_days' のとき: 経過日数計算のベース日付フィールドキー
  elapsedDaysMode?: 'past' | 'future'  // field === 'elapsed_days' のとき: 'past'=経過日数（デフォルト）、'future'=到来日数
}

// フィルタフィールド一覧（UIの選択肢表示用）
export interface FilterField {
  key: string   // availableFilters のキー
  name: string  // 表示名（例: 'Type', 'トラッカー'）
}

// フィールドの選択肢1件
export interface FilterFieldOption {
  label: string  // 表示テキスト
  value: string  // 実際の値
}

// --- Redmine API レスポンス型 ---

// Redmineチケット（APIレスポンスから必要なフィールドのみ）
export interface RedmineIssue {
  id: number
  status: { id: number; name: string }
  tracker: { id: number; name: string }
  priority?: { id: number; name: string }
  assigned_to?: { id: number; name: string }
  category?: { id: number; name: string }
  fixed_version?: { id: number; name: string }
  author?: { id: number; name: string }
  created_on: string       // UTC ISO文字列（例: "2026-02-05T17:09:11Z"）
  closed_on: string | null // UTC ISO文字列。未完了の場合はnull
  updated_on: string
  start_date?: string      // YYYY-MM-DD形式。未設定の場合は '' または省略
  due_date?: string        // YYYY-MM-DD形式。未設定の場合は '' または省略
  custom_fields?: Array<{ id: number; name: string; value: string | string[] | null }>
}

// /issues.json のレスポンス
export interface RedmineIssuesResponse {
  issues: RedmineIssue[]
  total_count: number
  offset: number
  limit: number
}
