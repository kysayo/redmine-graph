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

// クロス集計グルーピングのAND条件
export interface PieGroupRuleAndCondition {
  field: string    // フィールドキー（例: 'cf_628'）
  values: string[] // 表示名/生値のリスト（getIssueGroupValue が返す値と一致させる）
  dateCondition?: PieGroupRuleDateCondition  // 日付フィールド用条件（valuesの代わりに使用）
}

// クロス集計グルーピング: 日付フィールド用条件
export interface PieGroupRuleDateCondition {
  op: 'empty' | 'not_empty' | '<' | '<=' | '>' | '>=' | 'this_week' | 'next_week' | 'last_week' | 'to_this_week' | 'to_next_week' | 'from_next_week'
  value?: 'today' | string  // 'today' = 実行時に今日の JST 日付で評価。比較演算子のときのみ使用
}

// 円グラフ スライスグルーピングルール
export interface PieGroupRule {
  name: string      // グループ名（例: "対応中"）
  values: string[]  // グループ対象の値リスト（例: ["In Progress", "In Progress(Permanent)"]）
  dateCondition?: PieGroupRuleDateCondition  // 日付フィールド用条件（values の代わりに使用）
  andConditions?: PieGroupRuleAndCondition[]  // 追加AND条件（クロス集計のみで評価）
  subHeaders?: string[]  // クロス集計テーブル用サブヘッダラベル [level0, level1, ...]
  colGroupBy?: string    // クロス集計テーブル用: セクションの colGroupBy をこのルールで上書き
}

// 円グラフ 経過日数バケット（groupBy === 'elapsed_days' のときのスライス定義）
export interface ElapsedDaysBucket {
  label: string   // スライス名（例: "5日以上"）
  min: number     // 最小経過日数（含む）
  max?: number    // 最大経過日数（含む）。省略 = 以上（上限なし）
}

// 集計カード 追加値1スロット
export interface SummaryCardDenominator {
  label?: string              // 任意ラベル（例: "予定", "実績"）
  conditions: SeriesCondition[]
}

// 集計カード 計算値の1項
export interface SummaryCardFormulaTerm {
  valueIndex: number   // 参照する値のインデックス（slots内のkind='value'スロットの位置）
  coefficient: number  // 係数（1 = 加算 / -1 = 減算）
}

// 集計カード 計算値スロット（後方互換用）
export interface SummaryCardComputedValue {
  label?: string
  formula: SummaryCardFormulaTerm[]
}

// 集計カード 統合スロット（kind='value': 条件集計値 / kind='computed': 計算値）
export type SummaryCardSlot =
  | { kind: 'value'; label?: string; conditions: SeriesCondition[] }
  | { kind: 'computed'; label?: string; formula: SummaryCardFormulaTerm[] }

// 集計カード設定
export interface SummaryCardConfig {
  title: string
  color: string  // HEX accent color（カード上辺ボーダー + 数値テキスト色）
  numerator: { label?: string; conditions: SeriesCondition[] }    // 分子: 条件に合致するチケット数（slots未使用時のフォールバック）
  /** @deprecated denominators[] を使うこと。旧データ後方互換用 */
  denominator?: { conditions: SeriesCondition[] }
  denominators?: SummaryCardDenominator[]         // 追加値（slots未使用時のフォールバック）
  computedValues?: SummaryCardComputedValue[]     // 計算値（slots未使用時のフォールバック）
  slots?: SummaryCardSlot[]                       // 統合スロット（存在時は numerator/denominators/computedValues より優先）
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
  id?: string                // タイル識別子（tileOrder参照用）
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
  aggregation: 'daily' | 'cumulative' | 'difference' | 'sum'
  refSeriesIds?: [string, string]                   // aggregation === 'difference' | 'sum' のとき: [系列AのID, 系列BのID]
  color: string                                     // 系列の色（HEX）
  conditions?: SeriesCondition[]                    // 絞り込み条件（省略可 = フィルタなし）
  visible?: boolean                                 // 表示/非表示（省略時 = true として扱う）
  hideFuture?: boolean                              // true のとき未来の日付の値を非表示（null）にする
}

// EVMタイル グループ行設定
export interface EVMGroupRow {
  groupName: string        // getIssueGroupValue() が返す値名と一致させる（例: "QA", "BUG"）
  plannedCount: number     // 予定チケット数
  effortPerTicket: number  // 1チケットあたりの工数
}

// EVM係数逆算用 月別実績工数
export interface EvmMonthlyActual {
  month: string        // YYYY-MM形式（例: "2026-01"）
  actualEffort: number // その月の実際投入工数（ユーザー手入力）
}

// EVMタイル設定
export interface EVMTileConfig {
  id?: string                     // タイル識別子（tileOrder参照用）
  title: string                   // タイルタイトル
  startDate: string               // 対象期間 開始日（YYYY-MM-DD）
  endDate: string                 // 対象期間 終了日（YYYY-MM-DD）
  conditions?: SeriesCondition[]  // 集計対象チケットの絞り込み条件
  actualDateField: string         // Actual判定に使う日付フィールド（例: 'closed_on', 'cf_XXX'）
  groupByField: string            // グルーピングフィールド（例: 'tracker_id', 'cf_XXX'）
  groups: EVMGroupRow[]           // グループ設定（手動定義）
  monthlyActuals?: EvmMonthlyActual[]  // 係数逆算用の月別実績工数（省略可）
}

// 担当数マッピング 担当者1名の設定
export interface AssignmentMappingPerson {
  name: string  // 表示名（ユーザーが選択した時点の名前）
  id: string    // フィールド値ID（実際の集計に使う）
}

// 担当数マッピング設定
export interface AssignmentMappingConfig {
  id?: string                    // タイル識別子（tileOrder参照用）
  title?: string
  mode?: 'period' | 'pinpoint'   // 集計モード: 'period'=期間重複集計(デフォルト), 'pinpoint'=日付ピンポイント集計
  assigneeField: string          // 担当者フィールドキー（例: 'assigned_to_id'）
  endDateField: string           // 終了日フィールドキー（例: 'due_date', 'cf_XXX'）。period モード用
  fallbackDays: number           // 終了日が空の場合の営業日数（デフォルト: 5）。period モード用
  dateField?: string             // ピンポイントモードで集計に使う日付フィールドキー（例: 'due_date'）
  displayStartDate: string       // 表示開始日（YYYY-MM-DD）
  displayEndDate: string         // 表示終了日（YYYY-MM-DD）
  conditions?: SeriesCondition[]
  persons: AssignmentMappingPerson[]
  hideWeekends?: boolean
  fullWidth?: boolean
  extraColumns?: JournalCountExtraColumn[]     // 追加列定義（Resource 等）
  extraValues?: Record<string, Record<string, string>>  // personId -> columnKey -> 値
}

// 見出し区切りタイル設定
export interface HeadingConfig {
  id?: string   // タイル識別子（tileOrder参照用）
  text: string  // 見出しテキスト
  color: string // アクセントカラー（HEX）
}

// 計算式セクション用: 計算式の1項（sectionIndex × coefficient）
export interface ComputedColFormulaTerm {
  sectionIndex: number   // config.colSections 内のインデックス（data セクションを参照）
  ruleIndex: number      // 参照するルールのインデックス
  coefficient: number    // 係数（例: 1 or -1）
}

// 計算式セクション用: 1列分の定義
export interface ComputedCol {
  label?: string
  formula: ComputedColFormulaTerm[]
  subHeaders?: string[]  // サブヘッダテキスト [level0, level1, ...]
}

// クロス集計テーブル 列セクション定義（複数列グループ化）
export interface CrossTableColSection {
  label?: string                 // セクションヘッダ表示名（省略時 = colGroupBy のフィールド表示名）
  type?: 'data' | 'computed'     // セクション種別（省略時 = 'data'）
  colGroupBy: string             // このセクションの列グループキー（computed の場合は空文字でよい）
  colGroupRules?: PieGroupRule[] // このセクションの列グルーピングルール
  conditions?: SeriesCondition[] // セクション固有の絞り込み条件（テーブル conditions と AND）
  subHeaderLevels?: number       // サブヘッダ行数 0〜2（デフォルト: 0）
  computedCols?: ComputedCol[]   // type='computed' のみ使用
  spanningHeader?: string        // スパニングヘッダ表示名。隣接する同一文字列のセクションが colSpan で結合される
}

// クロス集計テーブル 列セクションの集計データ
export interface CrossTableSectionData {
  label?: string
  type?: 'data' | 'computed'     // computed セクションのマーカー
  colGroupBy: string             // URLフィルタ構築に必要
  colGroupRules?: PieGroupRule[]
  sectionConditions?: SeriesCondition[]
  subHeaderLevels?: number       // サブヘッダ行数 0〜2
  spanningHeader?: string        // スパニングヘッダ表示名（config から引き継ぎ）
  colGroupByPerKey?: Record<string, string>  // colKey → 実際の colGroupBy（ルール別フィールド上書き時）
  colKeys: string[]
  colLabels: Record<string, string>
  colFilterValues: Record<string, string[]>
  colAndCondFilterValues?: Record<string, Record<string, string[]>>
  colSubHeaders?: Record<string, string[]>  // colKey → サブヘッダテキスト配列（computed セクション用）
  cells: Record<string, Record<string, { count: number }>>
  colTotals: Record<string, number>
}

// クロス集計テーブル設定
export interface CrossTableConfig {
  id?: string                     // タイル識別子（tileOrder参照用）
  label?: string                  // 表のタイトル（省略時 = 行フィールド × 列フィールド名）
  rowGroupBy: string              // 行のグループキー（availableFiltersのキー、例: 'cf_628'）
  colGroupBy: string              // 列のグループキー
  conditions?: SeriesCondition[]  // 集計対象の絞り込み条件（AND条件）
  rowGroupRules?: PieGroupRule[]  // 行のグルーピングルール（PieGroupRule を再利用）
  colGroupRules?: PieGroupRule[]  // 列のグルーピングルール
  fullWidth?: boolean             // 後方互換: false=1列、省略/true=全幅。tileColumns が指定された場合はそちら優先
  tileColumns?: 1 | 2 | 3        // タイルの幅（1=1/3幅、2=2/3幅、3=全幅）。省略時は fullWidth に従う
  colSections?: CrossTableColSection[]  // 複数列セクション（存在する場合 colGroupBy より優先）
  cellPaddingX?: number           // セルの左右余白(px)。省略時は compact なら 8、通常 12（従来動作）
}

// クロス集計テーブルの集計結果
export interface CrossTableData {
  rowKeys: string[]                          // 行のキー（オプション順 or 件数降順）
  colKeys: string[]                          // 列のキー
  rowLabels: Record<string, string>          // key -> 表示名
  colLabels: Record<string, string>
  rowFilterValues: Record<string, string[]>  // rowKey -> URLフィルタ用ID/値
  colFilterValues: Record<string, string[]>  // colKey -> URLフィルタ用ID/値
  rowAndCondFilterValues?: Record<string, Record<string, string[]>>  // rowKey -> { fieldKey -> [filterValues] }
  colAndCondFilterValues?: Record<string, Record<string, string[]>>  // colKey -> { fieldKey -> [filterValues] }
  cells: Record<string, Record<string, { count: number }>>
  rowTotals: Record<string, number>
  colTotals: Record<string, number>
  grandTotal: number
  sections?: CrossTableSectionData[]  // colSections モード時のみ存在
}

// 2軸グラフ1枚分の設定（v2以降。軸設定をグラフごとに独立して保持）
export interface ComboChartConfig {
  id: string
  name?: string              // タイル見出し（省略時 = '2軸グラフ'）
  series: SeriesConfig[]
  commonConditions?: SeriesCondition[]  // 全系列に AND で適用される共通条件（未設定/空 = 適用なし）
  startDate?: string         // グラフX軸の開始日（YYYY-MM-DD）。未設定=自動
  hideWeekends?: boolean     // true のとき土日をX軸から除外し、土日分は月曜に計上
  yAxisLeftMin?: number      // 左軸Y軸の最小値。未設定=自動スケール
  yAxisLeftMinAuto?: boolean // true=左軸最小値を「最大値の8割」で自動設定
  yAxisRightMax?: number     // 右軸Y軸の最大値。未設定=自動スケール
  showLabelsLeft?: boolean   // true = 左軸系列のラベルを常時表示
  showLabelsRight?: boolean  // true = 右軸系列のラベルを常時表示
  weeklyMode?: boolean       // true = 週次集計。false/undefined = 日次（従来）
  anchorDay?: number         // 週次の基準曜日。1=月, 2=火, 3=水, 4=木, 5=金。デフォルト 1
  dateFormat?: 'yyyy-mm-dd' | 'M/D'  // X軸の日付表示形式。デフォルト 'yyyy-mm-dd'
  chartHeight?: number               // グラフ高さ(px)。未設定=320
  showFuture?: boolean               // true のとき未来の日付を横軸に追加
  futureWeeks?: number               // 未来を表示する週数（showFuture=true 時のみ有効）。デフォルト 1
  startWeeksAgo?: number             // 設定時: 開始日を「今日からN週前」で動的計算（startDate より優先）
  barStackMode?: 'grouped' | 'stacked' // 棒グラフの並べ方。省略時=grouped（隣接配置）。stacked のとき yAxisId ごとに積み上げ
}

// タイル表示順序のエントリ
export interface TileRef {
  type: 'combo' | 'pie' | 'table' | 'evm' | 'assignment' | 'heading' | 'journal-collector' | 'journal-count'
  id: string
}

// ジャーナル収集タイル: 1レコード（起票 or ジャーナル更新 1件分）
export interface JournalRecord {
  issueId: number
  date: string      // UTC→JST変換後の日付のみ "YYYY-MM-DD"
  user: number      // journal.user.id（起票レコードは issue.author.id）
  project: string   // issue.project.name
  tracker: string   // issue.tracker.name
  projectId?: number  // issue.project.id（後方互換のためoptional）
  trackerId?: number  // issue.tracker.id（後方互換のためoptional）
}

// ジャーナル収集タイル設定
export interface JournalCollectorConfig {
  id: string
  name: string
  targetIssueId: number               // 保存先チケット番号
  conditions: SeriesCondition[]       // フィルタ条件（既存型を再利用）
  lastCollectedAt: string | null      // null=次回全件フェッチ、文字列=差分フェッチ基準日時
  collectionStartYearMonth?: string   // 収集開始年月 "YYYY-MM"（この月の1日以降のレコードのみ保存）
}

// ジャーナル更新回数タイル: 追加列定義
export interface JournalCountExtraColumn {
  key: string    // 一意識別子
  label: string  // 列ヘッダー（編集可能）
  type: 'number' | 'text'
}

// ジャーナル更新回数タイル設定
export interface JournalCountConfig {
  id: string
  name?: string
  sourceIssueId: number               // JournalRecord JSON が保存されているチケット番号
  persons: AssignmentMappingPerson[]  // 表示担当者リスト（名前+ID）
  filterTrackerIds?: number[]         // トラッカーIDで絞り込み（空=全件）
  startDate: string                   // 集計開始日 YYYY-MM-DD
  endDate: string                     // 集計終了日 YYYY-MM-DD
  extraColumns?: JournalCountExtraColumn[]              // 追加列定義（省略時はResourceのみ）
  extraValues?: Record<string, Record<string, string>>  // personId -> columnKey -> 入力値
  weeklyDetailMonth?: string                            // 週単位展開する月 "YYYY-MM"（省略時は今月を自動使用）
  fullWidth?: boolean
}

// ユーザー設定全体（localStorageに保存する形）
export interface UserSettings {
  version: number
  // v2以降: 複数2軸グラフとタイル順序
  combos?: ComboChartConfig[]        // 任意個数の2軸グラフ設定
  tileOrder?: TileRef[]              // タイル表示順序
  // deprecated（v1からの移行用。新規設定では combos[] を使う）
  series?: SeriesConfig[]
  startDate?: string
  hideWeekends?: boolean
  yAxisLeftMin?: number
  yAxisLeftMinAuto?: boolean
  yAxisRightMax?: number
  showLabelsLeft?: boolean
  showLabelsRight?: boolean
  weeklyMode?: boolean
  anchorDay?: number
  dateFormat?: 'yyyy-mm-dd' | 'M/D'
  chartHeight?: number
  // deprecated: pies に移行済み
  pieLeft?: PieSeriesConfig
  pieRight?: PieSeriesConfig
  // 変更なし
  pies?: PieSeriesConfig[]
  summaryCards?: SummaryCardConfig[]
  tables?: CrossTableConfig[]
  evmTiles?: EVMTileConfig[]
  assignmentMappings?: AssignmentMappingConfig[]
  headings?: HeadingConfig[]
  journalCollectors?: JournalCollectorConfig[]
  journalCounts?: JournalCountConfig[]
  appliedTeamPreset?: string
  hiddenTiles?: string[]  // 非表示タイルのID一覧（TileRef.id と一致）
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
  [seriesId: string]: number | string | null
}

// --- 系列条件フィルタ ---

// 系列の1絞り込み条件
export interface SeriesCondition {
  field: string       // window.availableFilters のキー（例: 'cf_628', 'tracker_id'）
  operator: '=' | '!' | '>=' | '<=' | '!*' | '*' | '><' | '~' | '!~'  // '=' = 一致、'!' = 不一致、'>=' = 以上、'<=' = 以下（以内）、'!*' = 値なし、'*' = 値あり、'><' = 期間（between）、'~' = 含む（部分一致、case-insensitive）、'!~' = 含まない
  values: string[]    // 選択値の配列（例: ['QA', 'BUG']。テキスト型CFでは複数キーワードOR）
  elapsedDaysBaseField?: string  // field === 'elapsed_days' のとき: 経過日数計算のベース日付フィールドキー
  elapsedDaysMode?: 'past' | 'future'  // field === 'elapsed_days' のとき: 'past'=経過日数（デフォルト）、'future'=到来日数
  dateCondition?: PieGroupRuleDateCondition  // field が日付型フィールドのとき: 日付比較条件（valuesの代わりに使用）
}

// フィルタフィールド一覧（UIの選択肢表示用）
export interface FilterField {
  key: string   // availableFilters のキー
  name: string  // 表示名（例: 'Type', 'トラッカー'）
  type?: 'list' | 'date' | 'string'  // フィールド種別（省略時 = list として扱う）
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
