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
│   ├── ComboChart.tsx        # 2軸グラフ（折れ線 + 棒グラフ）
│   ├── GraphSettingsPanel.tsx # グラフ系列設定UI（折り畳みパネル）
│   └── PieChart.tsx          # 円グラフ
├── utils/
│   ├── config.ts         # HTMLのdata属性から設定を読み取る・デフォルト設定生成
│   ├── dateUtils.ts      # UTC→JST変換ユーティリティ
│   ├── dummyData.ts      # 開発用ダミーデータ生成（API接続不可時のフォールバック）
│   ├── issueAggregator.ts # チケット一覧を系列設定に基づいて集計
│   ├── redmineApi.ts     # Redmine API呼び出し（ステータス・チケット一覧取得）
│   ├── storage.ts        # localStorageによるユーザー設定の永続化
│   └── urlParser.ts      # URLパスからプロジェクトIDを取得
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

## ホスティング

ビルド成果物は GitHub Pages にデプロイし、jsDelivr CDN 経由で配信している。

- **リポジトリ**: https://github.com/kysayo/redmine-graph
- **GitHub Pages**: https://kysayo.github.io/redmine-graph/moca-react-graph.iife.js
- **自動デプロイ**: `master` ブランチへの push で GitHub Actions が自動ビルド・デプロイ・jsDelivrキャッシュパージ
  （ワークフロー: [.github/workflows/deploy.yml](.github/workflows/deploy.yml)）

### jsDelivr CDN URLのバージョン指定

| 用途 | URL形式 | 特徴 |
|---|---|---|
| **開発中（頻繁に更新）** | `@{コミットハッシュ}` | キャッシュを確実に回避。例: `@ae594ce` |
| 安定運用 | `@master` | 常に最新だがCDNキャッシュ伝播に時間がかかる場合あり |
| バージョン管理 | `@v1.0.0` | タグ指定で永続キャッシュ（内容が変わらないと保証できる） |

**現在使用中のURL（View Customize設定値）**:
```
https://cdn.jsdelivr.net/gh/kysayo/redmine-graph@939c014/dist/moca-react-graph.iife.js
```

> **開発時の更新手順**: `master` push 後に View Customize のコミットハッシュを最新のものに変更する。

## Redmineへの埋め込み方

View Customize（管理 → 表示のカスタマイズ）で以下のように設定する。

**種別: JavaScript、挿入位置: 全ページのヘッダ**（コード欄）:

```javascript
(function() {
  function insertGraph() {
    if (document.getElementById('graph-section')) return;

    var optionsFieldset = document.querySelector('fieldset#options.collapsible');
    if (!optionsFieldset) return;

    var graphFieldset = document.createElement('fieldset');
    graphFieldset.className = 'collapsible';
    graphFieldset.id = 'graph-section';

    var legend = document.createElement('legend');
    legend.setAttribute('onclick', 'toggleFieldset(this);');
    legend.className = 'icon icon-collapsed'; // Redmine標準の折り畳みアイコンスタイル
    legend.textContent = 'Graph';

    var graphDiv = document.createElement('div');
    graphDiv.id = 'moca-react-graph-root';
    graphDiv.setAttribute('data-combo-left', 'cumulative');
    graphDiv.setAttribute('data-combo-right', 'daily');
    graphDiv.setAttribute('data-pie-group-by', 'status');
    graphDiv.setAttribute('data-api-key', (ViewCustomize && ViewCustomize.context && ViewCustomize.context.user && ViewCustomize.context.user.apiKey) || '');
    // チームプリセットを設定する場合は以下のように追加（設定パネルの「Preset JSON DL」でJSONを取得できる）
    // graphDiv.setAttribute('data-team-presets', JSON.stringify([
    //   { name: "週次報告用", settings: { weeklyMode: true, hideWeekends: true, anchorDay: 1, series: [...] } }
    // ]));
    graphDiv.classList.add('hidden'); // 初期非表示（toggleFieldset が hidden クラスを制御）

    graphFieldset.appendChild(legend);
    graphFieldset.appendChild(graphDiv);
    graphFieldset.classList.add('collapsed'); // 初期状態を折り畳みにする

    optionsFieldset.parentNode.insertBefore(graphFieldset, optionsFieldset.nextSibling);

    var script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/gh/kysayo/redmine-graph@939c014/dist/moca-react-graph.iife.js';
    document.head.appendChild(script);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', insertGraph);
  } else {
    insertGraph();
  }
})();
```

- `fieldset#options`（オプション折り畳み）が存在するページ（チケット一覧）のみ動作する
- **`moca-react-graph-root` のIDを持つ要素が存在しない場合は何もしない**（自動）。

## グラフの設定（data属性）

`moca-react-graph-root` の div に以下の data 属性を指定することで動作を変更できる。
系列設定（左軸・右軸の内容）はユーザーがグラフ上の設定UIで変更でき、localStorageに保存される。
data属性の値はlocalStorageに保存済み設定がない場合の**初期値**として使用される。

| 属性 | 値 | デフォルト | 説明 |
|---|---|---|---|
| `data-combo-left` | `cumulative` / `daily` | `cumulative` | 2軸グラフの左軸の初期設定（左軸: series-0の集計方法） |
| `data-combo-right` | `cumulative` / `daily` | `daily` | 2軸グラフの右軸の初期設定（右軸: series-1の集計方法） |
| `data-pie-group-by` | `status` / `tracker` / 任意の文字列 | `status` | 円グラフのグループキー |
| `data-api-key` | RedmineのAPIキー | `""` | `ViewCustomize.context.user.apiKey` から取得してセットする。空の場合はクッキー認証 |
| `data-team-presets` | JSON文字列（`TeamPreset[]`） | `""` | チームプリセット定義。設定パネルに「チームプリセット」ボタンとして表示される（読取専用） |

**設定例（棒グラフと折れ線を入れ替える）**:

```html
<div
  id="moca-react-graph-root"
  data-combo-left="daily"
  data-combo-right="cumulative"
  data-pie-group-by="tracker"
></div>
```
