# Redmine-Graph プロジェクト

## 概要

My Redmine（SaaS）のチケット一覧画面にグラフを表示するバンドルファイルを作成するプロジェクト。

My Redmineはサーバー側の設定が変更できないが、View Customize設定でJavaScriptを埋め込むことができる。
当プロジェクトで作成した1ファイルのバンドルを、View CustomizeのJavaScriptでインジェクションすることでグラフを表示する。

## 技術スタック

| 項目 | 採用技術 |
|---|---|
| ビルドツール | Vite（ライブラリモード / iife形式） |
| UI | React 18 + TypeScript |
| グラフ | Recharts |
| CSS処理 | vite-plugin-css-injected-by-js（CSSをJSに内包） |
| Lint | ESLint（Viteデフォルト） |

## ディレクトリ構造

```
src/
├── main.tsx              # エントリポイント（moca-react-graph-root にマウント）
├── App.tsx               # ルートコンポーネント（data属性を読んでグラフに渡す）
├── components/
│   ├── ComboChart.tsx    # 2軸グラフ（折れ線 + 棒グラフ）
│   └── PieChart.tsx      # 円グラフ
├── utils/
│   ├── config.ts         # HTMLのdata属性から設定を読み取る
│   ├── urlParser.ts      # URLパラメータ（Redmineフィルタ条件）を解析
│   └── dummyData.ts      # 初期開発用ダミーデータ生成
└── types/
    └── index.ts          # 共通型定義
```

## コマンド

npmのパスについては `d:\Project\CLAUDE.md` を参照。

```bash
# 開発サーバー起動（localhost:5173 でブラウザ確認）
npm run dev

# プロダクションビルド → dist/moca-react-graph.iife.js を生成
npm run build

# Lint
npm run lint
```

## ビルド成果物

`npm run build` を実行すると `dist/moca-react-graph.iife.js` が生成される。

- CSS込みの1ファイル（追加の `.css` ファイルは不要）
- iife形式のため `<script src="...">` で読み込むだけで即時実行される

## Redmineへの埋め込み方

View Customize で以下のように設定する。

**1. グラフを表示したいページのHTMLに挿入するマークアップ**（View Customizeのコード欄）:

```html
<div
  id="moca-react-graph-root"
  data-combo-left="cumulative"
  data-combo-right="daily"
  data-pie-group-by="status"
></div>
<script src="https://YOUR_HOST/moca-react-graph.iife.js"></script>
```

**2. `moca-react-graph-root` のIDを持つ要素が存在しない場合は何もしない**（自動）。

## グラフの設定（data属性）

`moca-react-graph-root` の div に以下の data 属性を指定することで動作を変更できる。

| 属性 | 値 | デフォルト | 説明 |
|---|---|---|---|
| `data-combo-left` | `cumulative` / `daily` | `cumulative` | 2軸グラフの左軸の内容 |
| `data-combo-right` | `cumulative` / `daily` | `daily` | 2軸グラフの右軸の内容 |
| `data-pie-group-by` | `status` / `tracker` / 任意の文字列 | `status` | 円グラフのグループキー |

**設定例（棒グラフと折れ線を入れ替える）**:

```html
<div
  id="moca-react-graph-root"
  data-combo-left="daily"
  data-combo-right="cumulative"
  data-pie-group-by="tracker"
></div>
```
