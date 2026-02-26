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
  id: string                              // 系列識別子（例: 'series-0'）
  label: string                           // 凡例表示名（例: '発生チケット数'）
  dateField: 'created_on' | 'closed_on'  // 集計に使う日付フィールド
  statusIds: number[]                     // 対象ステータスID（空 = 全ステータス）
  chartType: 'bar' | 'line'
  yAxisId: 'left' | 'right'
  aggregation: 'daily' | 'cumulative'
  color: string                           // 系列の色（HEX）
}

// ユーザー設定全体（localStorageに保存する形）
export interface UserSettings {
  version: number
  series: SeriesConfig[]
  startDate?: string     // グラフX軸の開始日（YYYY-MM-DD）。未設定=自動
  hideWeekends?: boolean // true のとき土日をX軸から除外し、土日分は月曜に計上
  yAxisLeftMin?: number   // 左軸Y軸の最小値。未設定=自動スケール
  yAxisRightMax?: number  // 右軸Y軸の最大値。未設定=自動スケール
  weeklyMode?: boolean   // true = 週次集計。false/undefined = 日次（従来）
  anchorDay?: number     // 週次の基準曜日。1=月, 2=火, 3=水, 4=木, 5=金。デフォルト 1
  dateFormat?: 'yyyy-mm-dd' | 'M/D'  // X軸の日付表示形式。デフォルト 'yyyy-mm-dd'
  chartHeight?: number               // グラフ高さ(px)。未設定=320
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

// 複数系列対応のデータポイント（SeriesConfigのidをキーにした値を持つ）
export interface SeriesDataPoint {
  date: string
  [seriesId: string]: number | string
}

// --- Redmine API レスポンス型 ---

// Redmineチケット（APIレスポンスから必要なフィールドのみ）
export interface RedmineIssue {
  id: number
  status: { id: number; name: string }
  tracker: { id: number; name: string }
  created_on: string       // UTC ISO文字列（例: "2026-02-05T17:09:11Z"）
  closed_on: string | null // UTC ISO文字列。未完了の場合はnull
  updated_on: string
}

// /issues.json のレスポンス
export interface RedmineIssuesResponse {
  issues: RedmineIssue[]
  total_count: number
  offset: number
  limit: number
}
