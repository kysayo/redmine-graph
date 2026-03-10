# 仕様書

## グラフ仕様

### 2軸グラフ（ComboChart）

Recharts の `ComposedChart` を使用した折れ線と棒グラフの複合グラフ。

- **横軸**: 日付（YYYY-MM-DD）。日付数が多い場合はラベルを間引き表示するが、tick line（軸の外側に伸びる短い線）はすべての日付位置に表示する。縦のグリッド線（CartesianGrid）は非表示（横のグリッド線のみ表示）
- **左軸・右軸**: 各系列の `yAxisId` 設定に従う
- **系列**: 系列数制限なし（追加ボタンで随時追加可能）。各系列のグラフ種類（棒/折れ線）・軸・集計方法・対象ステータスはユーザーが設定UIで変更可能

### 円グラフ（PieChart）

Recharts の `PieChart` を使用した割合表示グラフ。

- **グループキー**: `data-pie-group-by` 属性で指定（デフォルト: `status`）。グラフ設定UIで変更可能
- **スライス外側ラベル**: 各スライスに `名前:件数:パーセント%` 形式のラベルを線付きで表示（表示閾値: 1%以上）。Recharts の SVG 外に独立したオーバーレイ SVG（`overflow: visible`）で描画することで、Recharts が設定する `overflow: hidden` の影響を回避している。12時方向・6時方向に近いスライスは比例プッシュ（±25°/±20°）で左右に振り分け、隣接するラベルが重なるのを防ぐ。ツールチップには「スライス名 : N件」の形式で表示
- 実データ連携済み。Redmine APIからチケット一覧を取得して集計
- Redmine APIからチケットを取得中は「Now Loading...」を表示（ダミーデータは表示しない）
- 任意個数横並びで表示（基本3列グリッド）。各円グラフで独立したグループキーと絞り込み条件を設定可能
- **スライスクリック・凡例クリック**: グラフのスライスまたは凡例アイテムをクリックすると、そのスライスの条件で新規タブにRedmineチケット一覧を開く（実データ取得済みの場合のみ有効）
- **レイアウト自動調整**: 凡例アイテム数が10件超のグラフは `gridColumn: 1/-1`（全幅）で表示。10件以下は3列グリッドのまま
- **wideモード（凡例10件超）**: 円グラフを中央に大きく（`outerRadius=150`）表示し、Recharts凡例の代わりにHTMLのflexbox wrap凡例をフルワイドで表示。スライスの外側ラベルは非表示
- **通常モード（凡例10件以下）**: 円グラフにスライスの外側ラベル（名前・%・件数）を表示。高さは `Math.max(300, 180 + N×22)` px で動的計算
- **スライスグルーピング（groupRules）**: 複数の値を1つのスライスに統合するルールを定義可能（例: 「対応中」= ["In Progress", "In Progress(Permanent)"]）。グループに含まれない値は個別スライスとして表示
- **経過日数グループ化（`elapsed_days`）**: グループキーに `elapsed_days` を指定すると、チケットの最終更新日（`updated_on`、未更新時は `created_on`）からの経過日数（JST換算）でスライスを分類する。バケット定義（ラベル・最小日数・最大日数）で任意の区間に集計。バケットに含まれないチケットは集計対象外
  - バケット例: `[{label: "1日", min: 1, max: 1}, {label: "5日以上", min: 5}]` → 「1日: 5件」「5日以上: 12件」
  - スライスクリック時は `updated_on` フィルタ（絶対 JST 日付）に変換して Redmine チケット一覧を開く
    - `{min: N, max: undefined}` → `op=<=, v=[today-N]`（N日以上経過）
    - `{min: N, max: M}` → `op=><, v=[today-M, today-N]`（範囲、両端含む）

## グラフ設定UI（GraphSettingsPanel）

グラフ上部に折り畳みパネルとして表示する系列設定UI。

- **系列数制限なし**（「＋ 系列を追加」ボタンで随時追加、1系列の場合は削除不可）。各系列行の末尾に ↑↓ ボタンと削除ボタンを配置
- **グラフ表示設定**（全系列共通）:
  - 開始日: グラフX軸の表示開始日（空欄=自動、デフォルト: 今日の14日前）
  - 土日を非表示: チェック時は土日をX軸から除外し、土日分のチケットは月曜に計上
  - 左軸の最小値: Y軸左軸の最小値を指定（空欄=自動スケール）。「最大値の8割」チェックボックスをオンにすると入力欄が無効になり、左軸系列データの最大値×0.8を `floor(/10)×10`（1の位=0）で計算した値が自動適用される（例: 最大613 → 490）
  - 右軸の最大値: Y軸右軸の最大値を指定（空欄=自動スケール）
- **チームプリセット**（グラフ表示設定と個人プリセットの間に表示）:
  - `data-team-presets` 属性に `TeamPreset[]` 形式のJSONが設定されている場合のみ表示（管理者が View Customize で定義）
  - ボタンクリックで現在の設定に即時適用（削除・保存不可の読取専用）
  - チームメンバー全員が同じプリセットを使用可能
- **プリセット**（チームプリセットの下に表示）:
  - 名前を入力して「プリセットとして保存」: 現在の全設定（系列・開始日・土日非表示・軸最小/最大値等）を名前付きで保存
  - 「Preset JSON DL」: 現在の設定を `data-team-presets` にそのまま貼り付けられる `TeamPreset[]` 形式のJSONとしてダウンロード。管理者が View Customize に設定するためのワークフロー用
  - ドロップダウンから選択して「読み込む」: 現在のプロジェクトの設定に上書き適用（即時グラフ反映）
  - 「削除」: 選択中のプリセットを削除
  - プリセットはプロジェクトを横断して利用可能（グローバルに保存）
- 各系列に設定できる項目:
  - 表示/非表示: 行左端のチェックボックスで系列の表示・非表示を切り替え。非表示時は設定行が薄く（opacity: 0.45）表示される。対応する Y 軸の全系列が非表示の場合はその軸も自動的に非表示になる。設定は localStorage に保存される（`visible?: boolean`、省略時 = 表示として扱う）
  - 色: 系列の色インジケーターをクリックしてカラーパレット（6色）から選択
  - 系列名（ラベル）
  - 集計対象日付フィールド: `created_on`（作成日）/ `closed_on`（完了日）/ `custom`（特殊な日付）
    - `custom` 選択時: `window.availableFilters` の `type === 'date'` フィールド（開始日・期日・カスタム日付フィールドなど）から選択するセレクトUIが追加表示される
  - グラフ種類: `bar`（棒）/ `line`（折れ線）
  - 表示軸: `left`（左軸）/ `right`（右軸）
  - 集計方法: `daily`（日別）/ `cumulative`（累計）
  - 対象ステータス: Redmine APIから取得したステータス一覧から複数選択（空=全ステータス）。集計軸が `custom`（特殊な日付）の場合は非活性（グレーアウト）
  - 絞り込み条件: チケットの項目で絞り込み。フィールド（react-select、テキスト入力補完あり）・演算子（=、!=、>=（以上））・値（`<select multiple>` またはテキスト入力）の組み合わせ。複数条件はAND。対応フィールド: ステータス、トラッカー、優先度、カスタムフィールド（リスト系）、経過日数（日）。ページリロード後も復元のため、マウント時に設定済みフィールドの選択肢を事前取得する
    - **経過日数（`elapsed_days`）フィールド**: 仮想フィールド。`updated_on`（未更新時は `created_on`）からJST換算の経過日数を数値入力で指定。演算子 `=`（ちょうどN日）または `>=`（N日以上）が使用可能。Redmine URLフィルタには変換されない（円グラフ内部フィルタのみ）
  - 順序変更: ↑↓ ボタンで系列の並び順を変更。先頭の ↑・末尾の ↓ は無効（グレー）。`series` 配列の順序がグラフ凡例の表示順に直結する（凡例はカスタムレンダラーで `visibleSeries` の順序と同期）
- **集計カード設定**（系列設定パネルの上部、2軸グラフの上に表示）:
  - 「＋ カードを追加」ボタンで任意個数追加可能
  - 各カードに設定できる項目:
    - アクセントカラー: カード上辺ボーダー色 + 数値テキスト色（12色パレットから選択）
    - タイトル: カードの見出しテキスト
    - 分子条件: 系列と同様の ConditionsEditor（条件に合致するチケット数を大きく表示）
    - 分母条件: 省略可能（「分母条件を追加」ボタンで表示）。指定時は「分子 / 分母」形式で表示
    - ↑↓ ボタンで並び順を変更。削除ボタンでカードを削除
  - カードクリック: 分子数値クリック→分子条件でRedmineチケット一覧を新タブで開く / 分母数値クリック→分母条件で開く
  - データ未取得中（ローディング）は「—」を表示
  - 設定は `localStorage` の `UserSettings.summaryCards` へ保存
- **円グラフ設定**（系列設定パネルの下部）:
  - グループキー: `window.availableFilters` のリスト系フィールド + 固定フィールド「経過日数(日)」から選択（react-select）
  - グラフタイトル（省略時 = フィールド表示名）
  - 絞り込み条件（系列と同様の ConditionsEditor）
  - スライスグルーピング（`PieGroupRulesEditor`）: グループキーが `elapsed_days` 以外のとき表示。複数値を1スライスにまとめるルールを定義
  - バケット定義（`ElapsedDaysBucketsEditor`）: グループキーが `elapsed_days` のとき表示。[ラベル] [最小日数] [最大日数（空=以上）] [削除ボタン] の行を追加・削除・並べ替えで定義
  - 円グラフは任意個数追加可能（`pies[]` 配列）。各円グラフに独立したグループキー・条件・バケット定義を設定可能
- 設定変更はlocalStorageに即時保存（プロジェクトIDをキーに）

### ユーザー設定の永続化（storage.ts）

- **保存先**: `localStorage`
- **キー形式**: `redmine-graph:settings:{projectId}`（プロジェクトID別に独立）
- **バージョン管理**: `version: 1`（スキーマ変更時にリセット）
- 初回表示時は `data-combo-left` / `data-combo-right` 属性からデフォルト設定を生成（開始日は今日の14日前をデフォルトとして設定）
- `UserSettings` のフィールド: `version`, `series[]`, `startDate?`, `hideWeekends?`, `yAxisLeftMin?`, `yAxisLeftMinAuto?`, `yAxisRightMax?`, `weeklyMode?`, `anchorDay?`, `dateFormat?`, `chartHeight?`, `pies?`, `summaryCards?`
  - `yAxisLeftMinAuto?: boolean`: `true` のとき左軸最小値を「最大値の8割」で自動計算（`yAxisLeftMin` より優先）
  - `pies?: PieSeriesConfig[]`: 任意個数の円グラフ設定。各要素は `{ groupBy, label?, conditions?, groupRules?, elapsedDaysBuckets? }`
  - `summaryCards?: SummaryCardConfig[]`: 任意個数の集計カード設定。各要素は `{ title, color, numerator: { conditions }, denominator?: { conditions } }`

### プリセットの永続化（storage.ts）

- **保存先**: `localStorage`
- **キー**: `redmine-graph:presets`（プロジェクトIDを含まないグローバルキー）
- **形式**: `Preset[]`（バージョン管理なし）
- `Preset` 型: `{ id: string, name: string, settings: PresetSettings }`
- `PresetSettings` 型: `UserSettings` から `version` を除いたもの（`series[]`, `startDate?`, `hideWeekends?`, `yAxisLeftMin?`, `yAxisLeftMinAuto?`, `yAxisRightMax?`, `weeklyMode?`, `anchorDay?`, `dateFormat?`, `chartHeight?`）

### チームプリセット（data-team-presets 属性）

管理者が View Customize の JS コードで `moca-react-graph-root` の `data-team-presets` 属性に定義する共有プリセット。

- **定義場所**: View Customize の JS コード内（`graphDiv.setAttribute('data-team-presets', JSON.stringify([...]))）`
- **形式**: `TeamPreset[]` の JSON 文字列
- `TeamPreset` 型: `{ name: string, settings: PresetSettings }`（`id` フィールドなし）
- ブラウザローカルには保存されない（ページ読み込み時に毎回 data 属性から取得）
- **Preset JSON DL ボタン**: 現在の設定を `TeamPreset[]` 形式でダウンロードできる。このJSONを View Customize に貼り付けることでチームプリセットを配布できる

**チームプリセット設定ワークフロー**:
1. グラフ設定パネルで目的の設定に調整する
2. プリセット名入力欄に名前を入力して「Preset JSON DL」をクリック
3. ダウンロードした `redmine-graph-preset.json` の内容を View Customize コードに貼り付ける:
   ```javascript
   graphDiv.setAttribute('data-team-presets', JSON.stringify([
     { "name": "週次報告用", "settings": { ... } }
   ]));
   ```

## Redmine APIとの連携

### 使用エンドポイント（redmineApi.ts）

| エンドポイント | 用途 |
|---|---|
| `GET /projects/{id}/issues.json` | チケット一覧取得（ページネーション対応） |
| `GET /queries/filter?project_id={id}&type=IssueQuery&name={field}` | 絞り込み条件の選択肢取得（`filterValues.ts`） |

**ステータス一覧の取得方法**（優先順位順）:
1. **ページDOMから取得**（本番環境）: Redmineチケット一覧ページに埋め込まれた `window.availableFilters.status_id.values` を読み取る。プロジェクト固有のステータスのみが含まれ、追加APIコール不要
2. **`GET /issue_statuses.json`**（フォールバック）: ページから取得できない場合（開発環境等）にAPIで取得
3. **`FALLBACK_STATUSES`**: API接続失敗時のハードコードされたフォールバック

- **認証**: `X-Redmine-API-Key` ヘッダーに `data-api-key` 属性の値をセット
- **ページネーション**: `limit=100`、`offset` を増分して `total_count` に達するまで全件取得。各ページ取得後に `onProgress` コールバックで進捗（取得済み件数・合計件数）を通知し、UIにプログレスバーを表示
- **フィルタ**: `window.location.search` をそのままAPIリクエストに転送（`query_id`・`f[]`・`op[]`・`v[][]` 等を含む）
- **全ステータス取得**: `status_id=*` を強制設定して closed チケットも含めて取得（`closed_on` 集計のため）
- API接続失敗時（開発環境・認証エラーなど）はダミーデータにフォールバック

### チケット集計（issueAggregator.ts）

チケット一覧を系列設定に基づいて `SeriesDataPoint[]` に集計する。

- **日付範囲**: ユーザー指定の `startDate`（デフォルト: 今日の14日前）を優先。未設定時は取得済みチケットの最古作成日〜今日
- **X軸日付生成**: `formatDate()` はローカルタイム（JST）で YYYY-MM-DD を生成。`toISOString()`（UTC基準）を使うとJST環境で1日ずれるため注意
- **集計日付の取得**: `getIssueDateForSeries()` ヘルパー関数で系列ごとに一元取得
  - `created_on` 系列: UTC文字列の日付部分（先頭10文字）をそのまま使用
  - `closed_on` 系列: `utcToJstDate()` でUTC→JST変換してから集計。`closed_on` が null のチケットはスキップ
  - `custom` 系列: `customDateFieldKey` で指定したフィールドを取得。`cf_{id}` 形式はカスタムフィールドから、`start_date`・`due_date` 等はチケットの直接プロパティから取得。値が空/null/未設定のチケットはスキップ。UTC変換不要（Redmineはカスタム日付をYYYY-MM-DD形式で返す）
- **ステータスフィルタ**: `statusIds` が空でない系列は、対象ステータスIDに一致するチケットのみカウント
- **条件フィルタ**: `conditions[]` に設定された絞り込み条件でチケットをフィルタ（AND条件）。対応フィールド: `status_id`・`tracker_id`・`priority_id`・`assigned_to_id`・`category_id`・`fixed_version_id`・`cf_{id}`（カスタムフィールド）・`elapsed_days`（経過日数、仮想フィールド）。演算子: `=`（一致）、`!`（不一致）、`>=`（以上）
- **経過日数バケット集計**: `groupBy === 'elapsed_days'` かつ `elapsedDaysBuckets` が定義されている場合、通常のフィールドグルーピングの代わりにバケット分類を実行。各チケットの `updated_on`（未更新時は `created_on`）からJST換算の経過日数を計算し、最初に条件が合致したバケットに計上。バケット順序はユーザー定義順を維持
- **累計変換**: `aggregation === 'cumulative'` の系列は日別値を累計に変換。`startDate` 指定時は `startDate` より前のチケット数を初期値として積算（グラフ開始時点の既存チケット数を反映）

### フィルタフィールド・選択肢取得（filterValues.ts）

絞り込み条件UIで使用するフィールド一覧と選択肢を取得するユーティリティ。

- **`getAvailableFilterFields()`**: `window.availableFilters`（Redmineページ埋め込みJS変数）からリスト系フィールドを抽出。対象タイプ: `list`, `list_optional`, `list_with_history`, `list_optional_with_history`, `list_status`（`status_id` フィールド用）
- **`getAvailableDateFilterFields()`**: `window.availableFilters` から日付型フィールドを抽出。対象タイプ: `date`のみ（`date_past` の `created_on`/`closed_on` は除外）。キーに `.` を含むフィールド（バージョン関連）も除外。「特殊な日付」集計軸の選択肢として使用
- **`fetchFilterFieldOptions(fieldKey, apiKey)`**: 指定フィールドの選択肢を取得。
  - `remote: false` の場合: `availableFilters[key].values` からそのまま返す
  - `remote: true` の場合: `/queries/filter?project_id={id}&type=IssueQuery&name={field}` API を呼び出し（これはRedmine内部エンドポイント、REST APIとは別）
  - レスポンス形式: `["QA","BUG"]`（CF系）または `[["name","id"],...]`（標準フィールド系）
  - 結果はページライフサイクル内でキャッシュ

### UTC→JST変換・経過日数計算（dateUtils.ts）

`closed_on` はRedmineがUTCで返すため、+9時間してJST日付に変換する。

```typescript
export function utcToJstDate(utcString: string): string {
  const date = new Date(utcString)
  const jstMs = date.getTime() + 9 * 60 * 60 * 1000
  return new Date(jstMs).toISOString().slice(0, 10)
}
```

**`calcElapsedDays(utcString: string): number`**: UTC日時文字列をJST日付に変換し、今日（JST）からの経過日数を返す。バケット分類・経過日数フィルタで使用。

```typescript
export function calcElapsedDays(utcString: string): number {
  const jstDateStr = utcToJstDate(utcString)
  const todayJst = utcToJstDate(new Date().toISOString())
  const ms = new Date(todayJst).getTime() - new Date(jstDateStr).getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}
```

## data属性による設定

`id="moca-react-graph-root"` の要素に以下の属性を付与することで動作を変更できる。
`data-combo-left` / `data-combo-right` はlocalStorageに保存済み設定がない場合の初期値として使用される。

```html
<div
  id="moca-react-graph-root"
  data-combo-left="cumulative"
  data-combo-right="daily"
  data-pie-group-by="status"
  data-api-key="..."
></div>
```

| 属性 | 型 | デフォルト | 内容 |
|---|---|---|---|
| `data-combo-left` | `'cumulative'` \| `'daily'` | `cumulative` | 左軸系列（series-0）の初期集計方法 |
| `data-combo-right` | `'cumulative'` \| `'daily'` | `daily` | 右軸系列（series-1）の初期集計方法 |
| `data-pie-group-by` | `string` | `status` | 円グラフのグループキー |
| `data-api-key` | `string` | `""` | Redmine APIキー（`ViewCustomize.context.user.apiKey` から取得） |
| `data-team-presets` | `TeamPreset[]` のJSON文字列 | `""` | チームプリセット定義。設定パネルに「チームプリセット」ボタンとして表示される（読取専用） |

## URLパラメータ解析（urlParser.ts）

`window.location.pathname` からプロジェクト識別子を取得する。

### プロジェクトID取得

URLパスの `/projects/{id}/` からプロジェクト識別子を抽出する。localStorageのキーおよびAPIパス構築に使用。

### フィルタ条件（API転送）

`window.location.search`（クエリ文字列）をそのままAPIリクエストに転送するため、URLパラメータの解析は行わない。`query_id`・`f[]`・`op[]`・`v[][]` 等のRedmine標準パラメータはそのままAPIに渡される。

## ダミーデータ（dummyData.ts）

API接続不可時のフォールバック。`issueState.issues === null` の場合に使用される。

- **2軸グラフ**: `startDate`（デフォルト: 今日の14日前）から今日までの期間で、系列設定に応じた乱数データを生成
- **円グラフ**: `data-pie-group-by` の値に対応するプリセットデータを返す（Redmine接続失敗時のフォールバックおよび開発環境での表示用。ローディング中はダミーデータではなく「Now Loading...」を表示する）

## ビルド設定

- **形式**: iife（即時実行関数式）
- **ファイル名**: `dist/moca-react-graph.iife.js`
- **CSS**: `vite-plugin-css-injected-by-js` によりJSに内包（別ファイル不要）
- **依存関係**: React・Rechartsを含む（外部CDN不要）
- **`define`**: `process.env.NODE_ENV` を `"production"` に置換（ブラウザに `process` が存在しないため必須）

## ホスティング・デプロイ

- **配信**: jsDelivr CDN（URLのバージョン指定はCLAUDE.mdの「jsDelivr CDN URLのバージョン指定」を参照）
- **自動デプロイ**: `master` push → GitHub Actions（[.github/workflows/deploy.yml](../.github/workflows/deploy.yml)）が以下を実行:
  1. `npm run build` でビルド
  2. `dist/moca-react-graph.iife.js` をリポジトリにコミット（jsDelivrはリポジトリのファイルを配信するため必要）
  3. GitHub Pages にデプロイ
  4. jsDelivr キャッシュをパージ

## Redmine View Customize への組み込み方

種別: **JavaScript**、挿入位置: 全ページのヘッダ

JavaScriptでチケット一覧の「オプション」折り畳みの直後に「Graph」折り畳みセクションを動的に挿入し、`#moca-react-graph-root` divを作成してからスクリプトをロードする。

- `fieldset#options.collapsible` が存在しないページでは何もしない（チケット一覧以外はスキップ）
- Rechartsの幅計算のため、Graphセクションは初期状態で展開表示
- Redmineの `toggleFieldset()` を使って折り畳み動作を実現
- `data-api-key` に `ViewCustomize.context.user.apiKey` をセットすることでAPI認証を行う

## マウント方法

```tsx
const container = document.getElementById('moca-react-graph-root')
if (container) {
  createRoot(container).render(<App container={container} />)
}
```

`moca-react-graph-root` のIDを持つ要素が存在しない場合は何もしない。

## 型定義（types/index.ts）の主要インターフェース

### `SeriesCondition`
絞り込み条件の1件。`operator` は `'=' | '!' | '>='`。

| フィールド | 型 | 説明 |
|---|---|---|
| `field` | `string` | `availableFilters` のキー（例: `cf_628`, `tracker_id`, `elapsed_days`） |
| `operator` | `'=' \| '!' \| '>='` | 一致 / 不一致 / 以上 |
| `values` | `string[]` | 選択値の配列（数値は文字列として格納） |

### `ElapsedDaysBucket`
経過日数バケット定義。`groupBy === 'elapsed_days'` の円グラフでスライスの区間を定義する。

| フィールド | 型 | 説明 |
|---|---|---|
| `label` | `string` | スライス名（例: `"5日以上"`） |
| `min` | `number` | 最小経過日数（含む） |
| `max` | `number?` | 最大経過日数（含む）。省略 = 上限なし |

### `SummaryCardConfig`
集計カード1枚の設定。

| フィールド | 型 | 説明 |
|---|---|---|
| `title` | `string` | カードの見出しテキスト |
| `color` | `string` | アクセントカラー（HEX）。カード上辺ボーダーと数値テキスト色に使用 |
| `numerator` | `{ conditions: SeriesCondition[] }` | 分子の絞り込み条件 |
| `denominator` | `{ conditions: SeriesCondition[] }?` | 分母の絞り込み条件（省略時 = 分母なし） |

### `PieSeriesConfig`
円グラフ1枚の設定。

| フィールド | 型 | 説明 |
|---|---|---|
| `groupBy` | `string` | グループキー（例: `'status_id'`, `'tracker_id'`, `'cf_123'`, `'elapsed_days'`） |
| `label` | `string?` | グラフタイトル（省略時 = フィールド表示名） |
| `conditions` | `SeriesCondition[]?` | 集計対象の絞り込み条件 |
| `groupRules` | `PieGroupRule[]?` | スライスグルーピングルール（`elapsed_days` 以外で有効） |
| `elapsedDaysBuckets` | `ElapsedDaysBucket[]?` | バケット定義（`groupBy === 'elapsed_days'` のとき有効） |

## 今後の課題

（特になし）
