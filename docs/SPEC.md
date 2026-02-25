# 仕様書

## グラフ仕様

### 2軸グラフ（ComboChart）

Recharts の `ComposedChart` を使用した折れ線と棒グラフの複合グラフ。

- **横軸**: 日付（YYYY-MM-DD）
- **左軸・右軸**: 各系列の `yAxisId` 設定に従う
- **系列**: 最大2系列。各系列のグラフ種類（棒/折れ線）・軸・集計方法・対象ステータスはユーザーが設定UIで変更可能

### 円グラフ（PieChart）

Recharts の `PieChart` を使用した割合表示グラフ。

- **グループキー**: `data-pie-group-by` 属性で指定（デフォルト: `status`）
- ラベルにグループ名とパーセントを表示
- 対応するプリセット: `status`（ステータス別）、`tracker`（トラッカー別）
- 現在はダミーデータを表示（Redmine API連携は未実装）

## グラフ設定UI（GraphSettingsPanel）

グラフ上部に折り畳みパネルとして表示する系列設定UI。

- **最大2系列**まで設定可能
- 各系列に設定できる項目:
  - 系列名（ラベル）
  - 集計対象日付フィールド: `created_on`（作成日）/ `closed_on`（完了日）
  - グラフ種類: `bar`（棒）/ `line`（折れ線）
  - 表示軸: `left`（左軸）/ `right`（右軸）
  - 集計方法: `daily`（日別）/ `cumulative`（累計）
  - 対象ステータス: Redmine APIから取得したステータス一覧から複数選択（空=全ステータス）
- 設定変更はlocalStorageに即時保存（プロジェクトIDをキーに）

### ユーザー設定の永続化（storage.ts）

- **保存先**: `localStorage`
- **キー形式**: `redmine-graph:settings:{projectId}`（プロジェクトID別に独立）
- **バージョン管理**: `version: 1`（スキーマ変更時にリセット）
- 初回表示時は `data-combo-left` / `data-combo-right` 属性からデフォルト設定を生成

## Redmine APIとの連携

### 使用エンドポイント（redmineApi.ts）

| エンドポイント | 用途 |
|---|---|
| `GET /issue_statuses.json` | ステータス一覧取得（設定UIのプルダウン用） |
| `GET /projects/{id}/issues.json` | チケット一覧取得（ページネーション対応） |

- **認証**: `X-Redmine-API-Key` ヘッダーに `data-api-key` 属性の値をセット
- **ページネーション**: `limit=100`、`offset` を増分して `total_count` に達するまで全件取得
- **フィルタ**: URLパラメータから取得した `created_on` 範囲・`tracker_id` をAPIリクエストに付与
- **全ステータス取得**: `status_id=*` で closed チケットも含めて取得（`closed_on` 集計のため）
- API接続失敗時（開発環境・認証エラーなど）はダミーデータにフォールバック

### チケット集計（issueAggregator.ts）

チケット一覧を系列設定に基づいて `SeriesDataPoint[]` に集計する。

- **日付範囲**: URLフィルタの `created_on` 範囲を使用。フィルタなしの場合は取得済みチケットの最古作成日〜今日
- **created_on 系列**: UTC文字列の日付部分（先頭10文字）をそのまま使用
- **closed_on 系列**: `utcToJstDate()` でUTC→JST変換してから集計。`closed_on` が null のチケットはスキップ
- **ステータスフィルタ**: `statusIds` が空でない系列は、対象ステータスIDに一致するチケットのみカウント
- **累計変換**: `aggregation === 'cumulative'` の系列は日別値を累計に変換

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

## URLパラメータ解析（urlParser.ts）

`window.location` からプロジェクト識別子とRedmineフィルタ条件を取得する。

### プロジェクトID取得

URLパスの `/projects/{id}/` からプロジェクト識別子を抽出する。localStorageのキーにも使用。

### フィルタ条件取得（window.location.search）

Redmine標準のURLフォーマット `f[]`/`f[N]`・`op[field]`・`v[field][]` に対応する。

| URLパラメータ | 対応演算子 | 取得内容 |
|---|---|---|
| `f[]=created_on`（または `f[N]=created_on`） | `><`（期間）/ `>=`（以降）/ `<=`（以前）/ `>t-`（過去N日） | 作成日フィルタ（from/to） |
| `v[created_on][]=YYYY-MM-DD` | — | 作成日の具体的な値 |
| `f[]=tracker_id` | `=`（等しい） | トラッカーIDフィルタ |
| `v[tracker_id][]=N` | — | トラッカーIDの値 |

- `>t-N`（相対指定「今日から過去N日」）は絶対日付に変換して使用
- 旧形式（`created_on=><date>YYYY-MM-DD`、`tracker_id[]=N`）との後方互換性あり

取得したフィルタ条件はAPIリクエストのパラメータおよび集計日付範囲の決定に使用する。

## ダミーデータ（dummyData.ts）

API接続不可時のフォールバック。`issueState.issues === null` の場合に使用される。

- **2軸グラフ**: URLの `created_on` パラメータから日付範囲を取得し、系列設定に応じた乱数データを生成
- **円グラフ**: `data-pie-group-by` の値に対応するプリセットデータを返す

## ビルド設定

- **形式**: iife（即時実行関数式）
- **ファイル名**: `dist/moca-react-graph.iife.js`
- **CSS**: `vite-plugin-css-injected-by-js` によりJSに内包（別ファイル不要）
- **依存関係**: React・Rechartsを含む（外部CDN不要）
- **`define`**: `process.env.NODE_ENV` を `"production"` に置換（ブラウザに `process` が存在しないため必須）

## ホスティング・デプロイ

- **配信**: GitHub Pages（https://kysayo.github.io/redmine-graph/moca-react-graph.iife.js）
- **自動デプロイ**: `master` push → GitHub Actions（[.github/workflows/deploy.yml](../.github/workflows/deploy.yml)）が `npm run build` を実行して `dist/` を配信

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
- グラフの色・サイズなどのスタイル設定を data 属性で制御できるようにする
