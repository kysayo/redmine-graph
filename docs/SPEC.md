# 仕様書

## グラフ仕様

### 2軸グラフ（ComboChart）

Recharts の `ComposedChart` を使用した折れ線と棒グラフの複合グラフ。

- **横軸**: 日付（YYYY-MM-DD）
- **左軸**: `data-combo-left` 属性で指定（デフォルト: `cumulative` = 累計チケット数）
- **右軸**: `data-combo-right` 属性で指定（デフォルト: `daily` = 日別チケット数）
- 左軸が `cumulative` のとき → 左軸=折れ線、右軸=棒グラフ
- 左軸が `daily` のとき → 左軸=棒グラフ、右軸=折れ線

### 円グラフ（PieChart）

Recharts の `PieChart` を使用した割合表示グラフ。

- **グループキー**: `data-pie-group-by` 属性で指定（デフォルト: `status`）
- ラベルにグループ名とパーセントを表示
- 対応するプリセット: `status`（ステータス別）、`tracker`（トラッカー別）
- 未対応のキーが指定された場合はダミーデータでプレースホルダーを表示

## data属性による設定

`id="moca-react-graph-root"` の要素に以下の属性を付与することで動作を変更できる。

```html
<div
  id="moca-react-graph-root"
  data-combo-left="cumulative"
  data-combo-right="daily"
  data-pie-group-by="status"
></div>
```

| 属性 | 型 | デフォルト | 内容 |
|---|---|---|---|
| `data-combo-left` | `'cumulative'` \| `'daily'` | `cumulative` | 2軸グラフの左軸の内容 |
| `data-combo-right` | `'cumulative'` \| `'daily'` | `daily` | 2軸グラフの右軸の内容 |
| `data-pie-group-by` | `string` | `status` | 円グラフのグループキー |

## URLパラメータ解析

`window.location.search` からRedmineのフィルタ条件を取得する（`src/utils/urlParser.ts`）。

| パラメータ | 例 | 取得内容 |
|---|---|---|
| `created_on` | `><date>2024-01-01` | 作成日の開始日（from） |
| `created_on` | `<=2024-12-31` | 作成日の終了日（to） |
| `tracker_id[]` | `1`, `2` | トラッカーIDの配列 |

取得した条件は現時点ではダミーデータの日付範囲生成に使用する。

## ダミーデータ（初期開発用）

現時点ではすべてのグラフにダミーデータを表示する（`src/utils/dummyData.ts`）。

- **2軸グラフ**: URLの `created_on` パラメータから日付範囲を取得し、その期間のデータを生成。日付範囲がない場合は直近30日分を生成。
- **円グラフ**: `data-pie-group-by` の値に対応するプリセットデータを返す。

## ビルド設定

- **形式**: iife（即時実行関数式）
- **ファイル名**: `dist/moca-react-graph.iife.js`
- **CSS**: `vite-plugin-css-injected-by-js` によりJSに内包（別ファイル不要）
- **依存関係**: React・Rechartsを含む（外部CDN不要）

## マウント方法

```tsx
const container = document.getElementById('moca-react-graph-root')
if (container) {
  createRoot(container).render(<App container={container} />)
}
```

`moca-react-graph-root` のIDを持つ要素が存在しない場合は何もしない。

## 今後の課題

- Redmine APIからチケットデータを取得してダミーデータと差し替える
- `data-pie-group-by` に任意のRedmineカスタムフィールドを指定できるようにする
- グラフの色・サイズなどのスタイル設定を data 属性で制御できるようにする
