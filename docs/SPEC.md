# 仕様書

## グラフ仕様

### 2軸グラフ（ComboChart）

Recharts の `ComposedChart` を使用した折れ線と棒グラフの複合グラフ。

- **横軸**: 日付（YYYY-MM-DD）。日付数が多い場合はラベルを間引き表示するが、tick line（軸の外側に伸びる短い線）はすべての日付位置に表示する。縦のグリッド線（CartesianGrid）は非表示（横のグリッド線のみ表示）
- **左軸・右軸**: 各系列の `yAxisId` 設定に従う
- **系列**: 系列数制限なし（追加ボタンで随時追加可能）。各系列のグラフ種類（棒/折れ線）・軸・集計方法・対象ステータスはユーザーが設定UIで変更可能

### 円グラフ（PieChart）

Recharts の `PieChart` を使用した割合表示グラフ。

- **グループキー**: `data-pie-group-by` 属性で指定（デフォルト: `status`）
- ラベルにグループ名とパーセントを表示
- 対応するプリセット: `status`（ステータス別）、`tracker`（トラッカー別）
- 現在はダミーデータを表示（Redmine API連携は未実装）

## グラフ設定UI（GraphSettingsPanel）

グラフ上部に折り畳みパネルとして表示する系列設定UI。

- **系列数制限なし**（「＋ 系列を追加」ボタンで随時追加、1系列の場合は削除不可）。各系列行の末尾に ↑↓ ボタンと削除ボタンを配置
- **グラフ表示設定**（全系列共通）:
  - 開始日: グラフX軸の表示開始日（空欄=自動、デフォルト: 今日の14日前）
  - 土日を非表示: チェック時は土日をX軸から除外し、土日分のチケットは月曜に計上
  - 左軸の最小値: Y軸左軸の最小値を指定（空欄=自動スケール）
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
  - 絞り込み条件: チケットの項目で絞り込み。フィールド（react-select、テキスト入力補完あり）・演算子（=、!=）・値（`<select multiple>`）の組み合わせ。複数条件はAND。対応フィールド: トラッカー、優先度、カスタムフィールド（リスト系）。ページリロード後も復元のため、マウント時に設定済みフィールドの選択肢を事前取得する
  - 順序変更: ↑↓ ボタンで系列の並び順を変更。先頭の ↑・末尾の ↓ は無効（グレー）。`series` 配列の順序がグラフ凡例の表示順に直結する（凡例はカスタムレンダラーで `visibleSeries` の順序と同期）
- 設定変更はlocalStorageに即時保存（プロジェクトIDをキーに）

### ユーザー設定の永続化（storage.ts）

- **保存先**: `localStorage`
- **キー形式**: `redmine-graph:settings:{projectId}`（プロジェクトID別に独立）
- **バージョン管理**: `version: 1`（スキーマ変更時にリセット）
- 初回表示時は `data-combo-left` / `data-combo-right` 属性からデフォルト設定を生成（開始日は今日の14日前をデフォルトとして設定）
- `UserSettings` のフィールド: `version`, `series[]`, `startDate?`, `hideWeekends?`, `yAxisLeftMin?`, `yAxisRightMax?`, `weeklyMode?`, `anchorDay?`, `dateFormat?`, `chartHeight?`

### プリセットの永続化（storage.ts）

- **保存先**: `localStorage`
- **キー**: `redmine-graph:presets`（プロジェクトIDを含まないグローバルキー）
- **形式**: `Preset[]`（バージョン管理なし）
- `Preset` 型: `{ id: string, name: string, settings: PresetSettings }`
- `PresetSettings` 型: `UserSettings` から `version` を除いたもの（`series[]`, `startDate?`, `hideWeekends?`, `yAxisLeftMin?`, `yAxisRightMax?`, `weeklyMode?`, `anchorDay?`, `dateFormat?`, `chartHeight?`）

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
- **条件フィルタ**: `conditions[]` に設定された絞り込み条件でチケットをフィルタ（AND条件）。対応フィールド: `tracker_id`・`priority_id`・`cf_{id}`（カスタムフィールド）
- **累計変換**: `aggregation === 'cumulative'` の系列は日別値を累計に変換。`startDate` 指定時は `startDate` より前のチケット数を初期値として積算（グラフ開始時点の既存チケット数を反映）

### フィルタフィールド・選択肢取得（filterValues.ts）

絞り込み条件UIで使用するフィールド一覧と選択肢を取得するユーティリティ。

- **`getAvailableFilterFields()`**: `window.availableFilters`（Redmineページ埋め込みJS変数）からリスト系フィールドを抽出。対象タイプ: `list`, `list_optional`, `list_with_history`, `list_optional_with_history`
- **`getAvailableDateFilterFields()`**: `window.availableFilters` から日付型フィールドを抽出。対象タイプ: `date`のみ（`date_past` の `created_on`/`closed_on` は除外）。キーに `.` を含むフィールド（バージョン関連）も除外。「特殊な日付」集計軸の選択肢として使用
- **`fetchFilterFieldOptions(fieldKey, apiKey)`**: 指定フィールドの選択肢を取得。
  - `remote: false` の場合: `availableFilters[key].values` からそのまま返す
  - `remote: true` の場合: `/queries/filter?project_id={id}&type=IssueQuery&name={field}` API を呼び出し（これはRedmine内部エンドポイント、REST APIとは別）
  - レスポンス形式: `["QA","BUG"]`（CF系）または `[["name","id"],...]`（標準フィールド系）
  - 結果はページライフサイクル内でキャッシュ

### UTC→JST変換（dateUtils.ts）

`closed_on` はRedmineがUTCで返すため、+9時間してJST日付に変換する。

```typescript
export function utcToJstDate(utcString: string): string {
  const date = new Date(utcString)
  const jstMs = date.getTime() + 9 * 60 * 60 * 1000
  return new Date(jstMs).toISOString().slice(0, 10)
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
- **円グラフ**: `data-pie-group-by` の値に対応するプリセットデータを返す

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

## 今後の課題

- 円グラフをRedmine APIの実データに対応させる
- `data-pie-group-by` に任意のRedmineカスタムフィールドを指定できるようにする
