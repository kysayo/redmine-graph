# 仕様書

## グラフ仕様

### 2軸グラフ（ComboChart）

Recharts の `ComposedChart` を使用した折れ線と棒グラフの複合グラフ。

- **横軸**: 日付（YYYY-MM-DD）。日付数が多い場合はラベルを間引き表示するが、tick line（軸の外側に伸びる短い線）はすべての日付位置に表示する。縦のグリッド線（CartesianGrid）は非表示（横のグリッド線のみ表示）。**未来の日付表示**が有効な場合は今日の位置にオレンジの破線と「今日」ラベルを表示する
- **左軸・右軸**: 各系列の `yAxisId` 設定に従う
- **系列**: 系列数制限なし（追加ボタンで随時追加可能）。各系列のグラフ種類（棒/折れ線）・軸・集計方法・対象ステータスはユーザーが設定UIで変更可能
- **棒グラフ積み上げ（`barStackMode`）**: タイル単位のフラグで `'grouped'`（省略時デフォルト=隣接配置）/ `'stacked'`（積み上げ）を切り替える。`'stacked'` のとき棒系列は `yAxisId` ごとに独立して積み上げられる（左軸の棒と右軸の棒は混ざらない）。折れ線（`line`）系列は積み上げ非対象で従来通り重ね描画される。設定パネルの「グラフ表示設定」末尾の「棒グラフを積み上げ」チェックボックスで切り替え。OFF時は値が `undefined` で保存される（`'grouped'` は保存しない）。件数ラベル表示時は積み上げモードでは `position="insideTop"`（各セグメント上端内側）に切り替わり、各セグメントの値が個別に表示される

### 横棒グラフ（HBarChart）

Recharts の `BarChart`（`layout="vertical"`）を使用したランキング表示グラフ。

- **グループキー・絞り込み条件**: 円グラフと同じ設定（`PieSeriesConfig` の `groupBy`・`conditions` を使用）
- **ソート**: 件数降順（多い順に上から並ぶ）
- **表示上限**: `topN` が設定されている場合は上位N件のみ表示。超過件数がある場合はグラフ下部に「他 N 件（全 M 件中）」のメッセージを区切り線付きで表示
- **値ラベル**: 各バーの右端（外側）に「N Case」形式で表示。`margin.right=90` でラベル用スペース確保（狭いコンテナでのラベルクリッピング防止）
- **バークリック**: 円グラフのスライスクリックと同様に、対応する条件でRedmineチケット一覧を新規タブで開く（実データ取得済みの場合のみ有効）
- **積み上げモード（colorBy指定時）**: `colorBy` フィールドと `colorRules` を設定すると積み上げ棒グラフ表示になり、セグメントごとに色分けされる。セグメントをクリックすると `colorBy` フィールド（例: `status_id`）のフィルタが付いたRedmineチケット一覧を開く。`colorRules` でグループ化されたセグメント（例: WIP = [In Progress, In Progress(Permanent), ...]）のクリック時は、グループ定義の**全ステータスID**をURLフィルタに含める（観測されたIDのみでなくグループ内の全IDを使用）。グループ名ラベルをクリックした場合はセグメントフィルタなし（グループ全体の集計条件）で開く
- **レイアウト**: `fullWidth`（省略時 = `true`）が `true` のとき全幅（`gridColumn: 1/-1`）、`false` のとき3列グリッドの1マスで表示。設定パネルの「全幅表示」チェックボックスで切り替え
- **グラフ高さ**: `Math.max(200, 表示件数 × 36 + 40)` px で動的計算
- **設定**: `PieSeriesConfig` の `chartType: 'bar'` で有効化。設定パネルの「＋ 横棒グラフを追加」で追加（デフォルトのグループキーは `assigned_to_id`）

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
- **経過日数/到来日数グループ化（`elapsed_days`）**: グループキーに `elapsed_days` を指定すると、モード・ベース日付フィールドに基づいてスライスを分類する。バケット定義（ラベル・最小日数・最大日数）で任意の区間に集計。バケットに含まれないチケットは集計対象外。ベース日付フィールドが空（未設定）のチケットは集計対象外（スキップ）
  - **モード（`elapsedDaysMode`）**: `past`=経過日数（今日←ベース日付、正値=N日前、省略時デフォルト）/ `future`=到来日数（今日→ベース日付、正値=N日後、負値=期限超過）
  - 到来日数モードではバケットの `min` に負値を指定可能（例: `{min: -3, max: 0}` = 0〜3営業日超過チケット）。ベース日付フィールドの指定が必須（未指定時はチケットを除外）
  - 経過日数バケット例: `[{label: "1日", min: 1, max: 1}, {label: "5日以上", min: 5}]` → 「1日: 5件」「5日以上: 12件」
  - 到来日数バケット例: `[{label: "超過", min: -99, max: -1}, {label: "今日", min: 0, max: 0}, {label: "1-3日後", min: 1, max: 3}, {label: "4日以降", min: 4}]`
  - スライスクリック時はベース日付フィールドのフィルタ（絶対 JST 日付）に変換して Redmine チケット一覧を開く
    - 経過日数: `{min: N}` → `op=<=, v=[today-N]`、`{min: N, max: M}` → `op=><, v=[today-M, today-N]`
    - 到来日数: `{min: N}` → `op=>=, v=[today+N]`、`{min: N, max: M}` → `op=><, v=[today+N, today+M]`（負値はオフセット計算で過去日付に変換）
  - **バケット未定義時**: `elapsedDaysBuckets` が空または未定義の場合、円グラフの代わりに「バケット定義が設定されていません。設定パネルの『バケット定義』から追加してください。」のガイドメッセージを表示する（0件表示ではなくユーザーへの案内）

## グラフ設定UI（GraphSettingsPanel）

グラフ上部に折り畳みパネルとして表示する系列設定UI。

- **セクション折りたたみ**: 各設定セクション（タイル順序・2軸グラフ・集計カード・円グラフ・クロス集計テーブル・EVM・担当数マッピング・見出し・ジャーナル収集・ジャーナル更新回数）はヘッダー行（`▶/▼` + セクション名）をクリックすることで折りたたみ/展開できる。折りたたみ状態は `collapsedSections: Set<string>` で管理し、`localStorage`（`redmine-graph:ui-state:{projectId}`）に永続化される
- **各タイル設定カードの個別折りたたみ**: 同一セクション内に複数のカード設定がある場合（例: 3つのクロス集計テーブル設定）、各カードの先頭にある `▶/▼` をクリックして個別に折りたたみ/展開できる。折りたたみ時もタイトル入力・↑↓・削除ボタンは引き続き操作可能。折りたたみ状態は `collapsedCards: Set<string>`（キー形式: `combo-{id}` / `pie-{id}` / `table-{id}` / `evm-{id}` / `assignment-{id}` / `summaryCard-{index}`）で管理し、`localStorage` に永続化される
- **折りたたみ状態の永続化**: パネル自体の開閉（`isOpen`）・セクション折りたたみ（`collapsedSections`）・カード折りたたみ（`collapsedCards`）はすべて `localStorage` の `redmine-graph:ui-state:{projectId}` に保存され、ページリロード後も復元される

- **系列数制限なし**（「＋ 系列を追加」ボタンで随時追加、1系列の場合は削除不可）。各系列行の末尾に ↑↓ ボタンと削除ボタンを配置
- **グラフ表示設定**（全系列共通）:
  - 開始日: グラフX軸の表示開始日。2つの指定方法がある:
    - **N週前から指定**: チェックボックスをオンにして週数を入力すると「今日からN週前」を開始日として動的計算。翌日になると自動的に1日ずれる。デフォルト値 2
    - **固定日付指定**: チェックボックスがオフのときに日付ピッカーで固定日付を指定（空欄=自動、デフォルト: 今日の14日前）
  - 未来を表示: チェック時は今日以降の日付を横軸に追加。チェックボックスの隣の数値で何週先まで表示するかを指定（デフォルト: 2週）。未来表示が有効な場合、グラフ上に今日の位置を示すオレンジ破線を表示
  - 土日を非表示: チェック時は土日をX軸から除外し、土日分のチケットは月曜に計上
  - 左軸の最小値: Y軸左軸の最小値を指定（空欄=自動スケール）。「最大値の8割」チェックボックスをオンにすると入力欄が無効になり、左軸系列データの最大値×0.8を `floor(/10)×10`（1の位=0）で計算した値が自動適用される（例: 最大613 → 490）
  - 左軸の件数表示: チェック時は左軸系列の棒グラフ・折れ線グラフの各データ点に値ラベルを常時表示（デフォルト: 非表示）。0値は表示しない。折れ線は `offset={12}` でドットから離して表示。ラベル表示時はグラフ上部マージンを自動拡張（8px→32px）してラベルの見切れを防ぐ
  - 右軸の最大値: Y軸右軸の最大値を指定（空欄=自動スケール）
  - 右軸の件数表示: チェック時は右軸系列の値ラベルを常時表示（左軸の件数表示と同様）
  - 棒グラフを積み上げ: チェック時は棒グラフ系列を `yAxisId` ごとに独立して積み上げ表示（左軸棒・右軸棒は混ざらない）。折れ線（line）系列は積み上げ非対象で従来通り重ね描画。OFF=`undefined`/ON=`'stacked'` を `ComboChartConfig.barStackMode` に保存。件数表示 ON 時は積み上げモードでは `position="insideTop"` でセグメント上端内側に値が表示される
  - **共通絞り込み条件**: 軸設定の下、系列カードの上に折り畳みセクションとして表示。系列ごとの絞り込み条件と同じ `ConditionsEditor`（日付・テキスト型CFの `~`/`!~`・経過日数モードなど全機能対応）で、ComboChart タイル単位の共通条件を 1 度だけ記述できる。集計時は **各系列の絞り込み条件と AND で結合**され、両方を満たすチケットのみが集計対象になる。`difference`/`sum` 系列は元々絞り込みを参照しないので影響を受けない（参照元系列の集計結果に共通条件が反映される）。条件 0 件のときは `ComboChartConfig.commonConditions` が `undefined` のままとなり、従来通りフィルタは適用されない（後方互換）。折り畳み状態は `collapsedCards` に `combo-{id}-common` キーで永続化される。複数の ComboChart タイルはそれぞれ独立した共通条件を持つ。設定 JSON エクスポート / TeamPreset / 個人プリセットには自動的に追従する
- **チームプリセット**（グラフ表示設定と個人プリセットの間に表示）:
  - `data-team-presets` 属性に `TeamPreset[]` 形式のJSONが設定されている場合のみ表示（管理者が View Customize で定義）
  - ボタンクリックで現在の設定に即時適用（削除・保存不可の読取専用）
  - チームメンバー全員が同じプリセットを使用可能
- **プリセット**（チームプリセットの下に表示）:
  - 名前を入力して「プリセットとして保存」: 現在の全設定（系列・開始日・土日非表示・軸最小/最大値等）を名前付きで保存。同名のプリセットが既に存在する場合は上書き更新（`id` を維持したまま `settings` を差し替え）。存在しない名前の場合は新規追加
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
  - 集計方法: `daily`（日別）/ `cumulative`（累計）/ `difference`（差: A − B）/ `sum`（和: A + B）
    - `difference` / `sum` 選択時: 集計対象日付・対象ステータス・絞り込み条件の設定は非表示となり、代わりに参照する「系列A」「系列B」のセレクタが表示される。グラフ値は各日付において系列Aの値 ± 系列Bの値として計算される。`difference`/`sum` 系列は互いに参照系列の候補に現れない（ネスト防止）
  - 対象ステータス: Redmine APIから取得したステータス一覧から複数選択（空=全ステータス）。集計軸が `custom`（特殊な日付）の場合は非活性（グレーアウト）
  - 絞り込み条件（系列ごと）: チケットの項目で絞り込み。フィールド（react-select、テキスト入力補完あり）・演算子・値の組み合わせ。複数条件はAND。`ComboChartConfig.commonConditions`（共通絞り込み条件）が設定されている場合、それと **AND** で結合される。対応フィールド: ステータス、トラッカー、優先度、カスタムフィールド（リスト系・テキスト型）、経過日数（日）、**日付フィールド**（開始日・期日・カスタム日付フィールドなど `type === 'date'` のフィールド）。ページリロード後も復元のため、マウント時に設定済みフィールドの選択肢を事前取得する（日付・経過日数・テキスト型フィールドはAPIフェッチ不要）
    - **日付フィールド絞り込み**: 日付型フィールドを選択すると専用UIに切り替わる。演算子は「記入済み / 空（未設定） / より前（<）/ 以前（<=）/ より後（>）/ 以降（>=）」から選択。`<`/`<=`/`>`/`>=` 選択時は「今日」チェックボックスまたは固定日付ピッカーで比較値を指定。`SeriesCondition.dateCondition` フィールドに格納（`values` は使用しない）。日付型フィールドでは演算子セレクトを非表示にし、`dateCondition` 内で演算子を管理
    - **テキスト型カスタムフィールド絞り込み**: `window.availableFilters` で `type: 'string'`（または `'text'`）のCFを選択すると、演算子に「含む（`~`）/ 含まない（`!~`）/ =（完全一致）/ !=（完全不一致）」が出現し、値入力が複数テキスト入力欄に切り替わる。各キーワードは `+ OR` ボタンで追加可能で、`~` は「いずれか1つでも含めばマッチ」、`!~` は「どれも含まない場合にマッチ」の OR 評価。比較はすべて **case-insensitive**（大文字/小文字を区別しない）。`SeriesCondition.values: string[]` に各キーワードが格納される。空文字のキーワードは評価時に無視される。テキスト型CFの値が null/未設定のチケットは `~` ではマッチせず、`!~` ではマッチする扱い
    - **経過日数/到来日数（`elapsed_days`）フィールド**: 仮想フィールド。「経過日数」を選択すると追加でモードセレクトとベース日付フィールドのセレクタが表示される。
    - **モード**: `経過日数`（今日←ベース日付、正値=N日前）または `到来日数`（今日→ベース日付、正値=N日後、負値=期限超過日数）を選択（デフォルト: 経過日数）
    - ベース日付フィールドが空（未設定）のチケットは条件に**マッチしない**（除外される）
    - 到来日数モードではベース日付フィールドの指定が必須（未指定時は除外）
    - 演算子 `=`（ちょうどN日）、`>=`（N日以上）、`<=`（N日以内）が使用可能。Redmine URLフィルタへの変換時はベース日付フィールドのフィルタに変換される
  - 未来を非表示: 「未来を表示」が有効なコンボチャートでのみ表示。チェック時はその系列の未来日付の値を null にして棒・折れ線を描画しない（例: 発生数・完了数など未来に値が存在しない系列に設定する）。週次集計モードでは「今週のアンカー日（今日以降で最初の基準曜日）」は未来とみなさず表示する（例: 今日=木曜・基準曜日=金曜のとき、翌日の金曜が今週の代表日として表示される）
  - 順序変更: ↑↓ ボタンで系列の並び順を変更。先頭の ↑・末尾の ↓ は無効（グレー）。`series` 配列の順序がグラフ凡例の表示順に直結する（凡例はカスタムレンダラーで `visibleSeries` の順序と同期）
- **集計カード設定**（系列設定パネルの上部、2軸グラフの上に表示）:
  - 「＋ カードを追加」ボタンで任意個数追加可能
  - 各カードに設定できる項目:
    - アクセントカラー: カード上辺ボーダー色 + 数値テキスト色（12色パレットから選択）
    - タイトル: カードの見出しテキスト（`\n` で任意改行可。1行目は太文字、2行目以降は通常ウェイト。設定UIはテキストエリア。`[r]text[/r]` で囲んだ部分は赤色（`#ef4444`）で表示）
    - **集計値スロット（統合スロットリスト）**: 先頭が「分子」として大きく表示され、以降は「追加値」として `/N` 形式で並ぶ。ラベルを設定した場合は数値の下に小さく表示
      - **追加値スロット（kind: 'value'）**: 「+ 追加値を追加」ボタンで追加。絞り込み条件に合致するチケット数を集計して表示
      - **計算値スロット（kind: 'computed'）**: 「+ 計算値を追加」ボタンで追加。他のスロット（value）を参照して係数付きの加減算で計算した値を表示（例: 分子 − 値1 = 残数）。各計算項は `+`/`−` ボタンと値セレクタで構成
      - ↑↓ ボタンでスロットの並び順を変更。value スロットを並び替えた場合、computed スロットの `valueIndex` 参照も自動的に更新される
      - 削除ボタンでスロットを削除（先頭スロットも削除可）
    - ↑↓ ボタンでカード自体の並び順を変更。削除ボタンでカードを削除
  - カードクリック: 分子（先頭 value スロット）数値クリック→その条件でRedmineチケット一覧を新タブで開く / 追加値スロットクリック→その条件で開く（計算値スロットはクリック不可）
  - データ未取得中（ローディング）は「—」を表示
  - 設定は `localStorage` の `UserSettings.summaryCards` へ保存
- **円グラフ設定**（系列設定パネルの下部）:
  - グループキー: `window.availableFilters` のリスト系フィールド + 固定フィールド「経過日数(日)」から選択（react-select）
  - グラフタイトル（省略時 = フィールド表示名）
  - 絞り込み条件（系列と同様の ConditionsEditor）
  - スライスグルーピング（`PieGroupRulesEditor`）: グループキーが `elapsed_days` 以外のとき表示。複数値を1スライスにまとめるルールを定義
  - バケット定義（`ElapsedDaysBucketsEditor`）: グループキーが `elapsed_days` のとき表示。ベース日付フィールドセレクタ（更新日・作成日・完了日・カスタム日付フィールドから選択、デフォルト: 更新日）と [ラベル] [最小日数] [最大日数（空=以上）] [削除ボタン] の行を追加・削除・並べ替えで定義
  - 円グラフは任意個数追加可能（`pies[]` 配列）。各円グラフに独立したグループキー・条件・バケット定義を設定可能
- 設定変更はlocalStorageに即時保存（プロジェクトIDをキーに）

### ユーザー設定の永続化（storage.ts）

- **保存先**: `localStorage`
- **キー形式**: `redmine-graph:settings:{projectId}`（プロジェクトID別に独立）
- **バージョン管理**: `version: 1`（スキーマ変更時にリセット）
- 初回表示時は `data-combo-left` / `data-combo-right` 属性からデフォルト設定を生成（開始日は今日の14日前をデフォルトとして設定）
- `UserSettings` のフィールド: `version`, `series[]`, `startDate?`, `hideWeekends?`, `yAxisLeftMin?`, `yAxisLeftMinAuto?`, `yAxisRightMax?`, `showLabelsLeft?`, `showLabelsRight?`, `weeklyMode?`, `anchorDay?`, `dateFormat?`, `chartHeight?`, `pies?`, `summaryCards?`, `tables?`, `evmTiles?`, `hiddenTiles?`
  - `hiddenTiles?: string[]`: タイルIDの配列。一致するタイルは細いバーで代替表示され、バー全体または「表示」ボタンのクリックで復元できる
  - `yAxisLeftMinAuto?: boolean`: `true` のとき左軸最小値を「最大値の8割」で自動計算（`yAxisLeftMin` より優先）
  - `showLabelsLeft?: boolean`: `true` のとき左軸系列の各データ点に値ラベルを常時表示
  - `showLabelsRight?: boolean`: `true` のとき右軸系列の各データ点に値ラベルを常時表示
  - `pies?: PieSeriesConfig[]`: 任意個数の円グラフ設定。各要素は `{ groupBy, label?, conditions?, groupRules?, elapsedDaysBuckets?, elapsedDaysBaseField? }`
  - `summaryCards?: SummaryCardConfig[]`: 任意個数の集計カード設定。各要素は `{ title, color, numerator, slots?, denominators?, computedValues? }`。`slots` が存在する場合は `numerator`/`denominators`/`computedValues` より優先（後方互換のため旧フィールドも同期保存）

### UI状態の永続化（storage.ts）

- **保存先**: `localStorage`
- **キー形式**: `redmine-graph:ui-state:{projectId}`（プロジェクトID別に独立）
- **形式**: `{ isOpen: boolean, collapsedSections: string[], collapsedCards: string[] }`
- 設定パネル自体の開閉（`isOpen`）・セクション折りたたみ・カード折りたたみをページをまたいで保持する

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
| `GET /issues/{id}.json` | 祝日チケットの description 取得（`data-holidays-issue-id` 指定時） |

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
- **条件フィルタ**: `conditions[]` に設定された絞り込み条件でチケットをフィルタ（AND条件）。対応フィールド: `status_id`・`tracker_id`・`priority_id`・`author_id`・`assigned_to_id`・`category_id`・`fixed_version_id`・`cf_{id}`（カスタムフィールド：リスト系・テキスト型の両方）・`elapsed_days`（経過日数、仮想フィールド）。演算子: `=`（一致）、`!`（不一致）、`>=`（以上）、`<=`（以内）、`~`（含む／部分一致、case-insensitive）、`!~`（含まない）
  - **特殊値 `"me"` の解決**: フィールド値として `"me"`（Redmineの「自分」選択肢）が指定された場合、`window.ViewCustomize.context.user.id` を参照して現在ログイン中のユーザーIDに変換してから比較する。`author_id`・`assigned_to_id` どちらでも有効
- **経過日数バケット集計**: `groupBy === 'elapsed_days'` かつ `elapsedDaysBuckets` が定義されている場合、通常のフィールドグルーピングの代わりにバケット分類を実行。各チケットの `elapsedDaysBaseField`（省略時は `updated_on || created_on`）からJST換算の経過日数を計算し、最初に条件が合致したバケットに計上。ベース日付フィールドが空（未設定）のチケットはスキップ（集計対象外）。バケット順序はユーザー定義順を維持
- **累計変換**: `aggregation === 'cumulative'` の系列は日別値を累計に変換。`startDate` 指定時は `startDate` より前のチケット数を初期値として積算（グラフ開始時点の既存チケット数を反映）
- **差分・和分計算**: `aggregation === 'difference'` の系列は各日付で `A - B`、`aggregation === 'sum'` の系列は `A + B` を計算して代入（A・Bは `refSeriesIds` で指定した参照系列の値）。累計変換後に実行されるため、参照系列に累計系列を指定した場合はその累計値を使って計算される

### フィルタフィールド・選択肢取得（filterValues.ts）

絞り込み条件UIで使用するフィールド一覧と選択肢を取得するユーティリティ。

- **`getAvailableFilterFields()`**: `window.availableFilters`（Redmineページ埋め込みJS変数）からリスト系およびテキスト型フィールドを抽出。対象タイプ: `list`, `list_optional`, `list_with_history`, `list_optional_with_history`, `list_status`（`status_id` フィールド用）、および `string`, `text`（テキスト型CF、部分一致用途）。返却 `FilterField.type` はリスト系が `'list'`、テキスト型が `'string'`
- **`getAvailableDateFilterFields()`**: `window.availableFilters` から日付型フィールドを抽出。対象タイプ: `date`のみ（`date_past` の `created_on`/`closed_on` は除外）。キーに `.` を含むフィールド（バージョン関連）も除外。「特殊な日付」集計軸の選択肢として使用。返す `FilterField` の `type` は `'date'`
- **`getAvailableColumnFilterFields()`**: クロス集計テーブルの列フィールド選択用。リスト系フィールド（`type: 'list'`）と日付型フィールド（`type: 'date'`）の両方を返す。`FilterField.type` で種別を区別できる
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

**`calcElapsedDaysFromStr(dateStr: string): number`**: UTC ISO文字列またはYYYY-MM-DD文字列から今日（JST）までの経過日数を返す。UTC ISO（`T` を含む）は `utcToJstDate()` でJST変換し、YYYY-MM-DD はそのまま使用する。無効な日付文字列の場合は `0` を返す（NaN保護）。カスタム日付フィールド等の多様なフォーマットに対応するために `calcElapsedDays` と併用する。

**`getIssueDateByField(issue, fieldKey: string): string | null`**: フィールドキーに対応する日付文字列をチケットから取得する。対応フィールド: `updated_on`・`created_on`・`closed_on`・`start_date`・`due_date`・`cf_{id}`（カスタムフィールド）。値が空/未設定の場合は `null` を返す。

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
| `data-holidays-issue-id` | 数値文字列（チケットID） | `""` | 祝日リストを記録したRedmineチケットのID。指定時はアプリ起動時にそのチケットのdescriptionをフェッチし、JSON配列（例: `["2026-3-20","2026-4-29"]`）をパースして祝日として登録する。祝日は経過営業日数の計算（バケット集計・URLフィルタ日付）でスキップされる。空の場合は祝日なし（従来動作） |

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

- **配信**: Cloudflare Pages（Direct Upload モード）
- **デプロイ方法**: ローカルで `npm run build` → `npx wrangler pages deploy dist/ --project-name redmine-graph`
- **URL**: デプロイごとに固有URL（`https://{デプロイID}.redmine-graph.pages.dev/moca-react-graph.iife.js`）が発行される
- `dist/` は `.gitignore` で git 管理対象外。GitHub Actions は使用しない

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

### `FilterField`
フィルタフィールドの1件。`filterValues.ts` の各関数が返す型。

| フィールド | 型 | 説明 |
|---|---|---|
| `key` | `string` | `availableFilters` のキー（例: `cf_123`, `tracker_id`） |
| `name` | `string` | 表示名（例: `'Type'`, `'トラッカー'`） |
| `type` | `'list' \| 'date' \| 'string'?` | フィールド種別。`getAvailableFilterFields()` はリスト系を `'list'`、テキスト型CF（`type: 'string'`/`'text'`）を `'string'` として返す。`getAvailableColumnFilterFields()` は `'list'` / `'date'` のみ返す。`getAvailableDateFilterFields()` は `'date'` のみ返す |

### `SeriesCondition`
絞り込み条件の1件。`operator` は `'=' | '!' | '>='` など。

| フィールド | 型 | 説明 |
|---|---|---|
| `field` | `string` | `availableFilters` のキー（例: `cf_628`, `tracker_id`, `elapsed_days`） |
| `operator` | `'=' \| '!' \| '>=' \| '<=' \| '!*' \| '*' \| '><' \| '~' \| '!~'` | 一致 / 不一致 / 以上 / 以内（`<=` は `elapsed_days` フィールドでのみ使用可能）/ 値なし（`!*` はクロス集計テーブルの `(No data)` グループクリック時に内部生成。URLでは `op[field]=!*` に変換）/ 値あり（`*` は日付条件の `not_empty` 判定時に内部生成）/ 期間（`><` は週キーワード使用時に内部生成。URLでは `op[field]=%3E%3C&v[field][]=start&v[field][]=end` に変換）/ 含む（`~`）・含まない（`!~`）はテキスト型CF用の部分一致（case-insensitive、複数 `values` は OR 評価） |
| `values` | `string[]` | 選択値の配列（数値は文字列として格納）。`~` / `!~` のときは各要素が検索キーワード（OR）で、空文字は評価時に無視 |
| `elapsedDaysBaseField` | `string?` | `field === 'elapsed_days'` のとき: 経過日数計算のベース日付フィールドキー（例: `updated_on`, `cf_123`）。省略時は `updated_on || created_on` の旧来動作 |
| `elapsedDaysMode` | `'past' \| 'future'?` | `field === 'elapsed_days'` のとき: `past`=経過日数（省略時デフォルト）/ `future`=到来日数 |
| `dateCondition` | `PieGroupRuleDateCondition?` | `field` が日付型フィールドのとき: 日付比較条件（`values` の代わりに使用）。演算子: `not_empty`（記入済み）/ `empty`（空・未設定）/ `<`（より前）/ `<=`（以前）/ `>`（より後）/ `>=`（以降）/ `this_week`（今週月〜日）/ `next_week`（来週月〜日）/ `last_week`（先週月〜日）/ `to_this_week`（〜今週日曜）/ `to_next_week`（〜来週日曜）/ `from_next_week`（来週月曜〜）。`value: 'today'` で実行時の今日JST日付と比較、省略時は固定日付文字列（`YYYY-MM-DD`）。週キーワード使用時は `value` 不要 |

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
| `title` | `string` | カードの見出しテキスト（`\n` で改行可。1行目太文字。`[r]text[/r]` で囲んだ部分は赤色（`#ef4444`）で表示） |
| `color` | `string` | アクセントカラー（HEX）。カード上辺ボーダーと数値テキスト色に使用 |
| `numerator` | `{ label?: string; conditions: SeriesCondition[] }` | 分子の絞り込み条件（`slots` 未使用時のフォールバック） |
| `denominators` | `SummaryCardDenominator[]?` | 追加値の配列（`slots` 未使用時のフォールバック） |
| `computedValues` | `SummaryCardComputedValue[]?` | 計算値の配列（`slots` 未使用時のフォールバック） |
| `slots` | `SummaryCardSlot[]?` | 統合スロットリスト（存在時は `numerator`/`denominators`/`computedValues` より優先） |

### `SummaryCardSlot`
集計カードの統合スロット。`kind` フィールドで種別を判別する。

```
type SummaryCardSlot =
  | { kind: 'value'; label?: string; conditions: SeriesCondition[] }
  | { kind: 'computed'; label?: string; formula: SummaryCardFormulaTerm[] }
```

- `kind: 'value'` — 条件に合致するチケット数を集計して表示
- `kind: 'computed'` — 他の value スロットを参照して係数付き加減算で計算した値を表示

### `SummaryCardFormulaTerm`
計算値スロット（`kind: 'computed'`）の計算式1項。

| フィールド | 型 | 説明 |
|---|---|---|
| `valueIndex` | `number` | 参照する value スロットのインデックス（`slots` 内の `kind === 'value'` スロットの順序） |
| `coefficient` | `number` | 係数（`1` = 加算 / `-1` = 減算） |

### `SummaryCardComputedValue`
計算値（`slots` 未使用時の後方互換フィールド）。

| フィールド | 型 | 説明 |
|---|---|---|
| `label` | `string?` | 任意ラベル。指定時は数値の下に小さく表示 |
| `formula` | `SummaryCardFormulaTerm[]` | 計算式の項リスト |

### `SummaryCardDenominator`
集計カードの追加値1スロットの設定（`slots` 未使用時の後方互換フィールド）。

| フィールド | 型 | 説明 |
|---|---|---|
| `label` | `string?` | 任意ラベル（例: "予定"、"実績"）。指定時は数値の下に小さく表示 |
| `conditions` | `SeriesCondition[]` | 絞り込み条件 |

### `PieSeriesConfig`
円グラフ1枚の設定。

| フィールド | 型 | 説明 |
|---|---|---|
| `groupBy` | `string` | グループキー（例: `'status_id'`, `'tracker_id'`, `'cf_123'`, `'elapsed_days'`） |
| `label` | `string?` | グラフタイトル（省略時 = フィールド表示名） |
| `conditions` | `SeriesCondition[]?` | 集計対象の絞り込み条件 |
| `groupRules` | `PieGroupRule[]?` | スライスグルーピングルール（`elapsed_days` 以外で有効） |
| `elapsedDaysBuckets` | `ElapsedDaysBucket[]?` | バケット定義（`groupBy === 'elapsed_days'` のとき有効） |
| `elapsedDaysBaseField` | `string?` | `groupBy === 'elapsed_days'` のとき: 経過日数計算のベース日付フィールドキー（例: `updated_on`, `cf_123`）。省略時は `updated_on || created_on` の旧来動作 |
| `elapsedDaysMode` | `'past' \| 'future'?` | `groupBy === 'elapsed_days'` のとき: `past`=経過日数（省略時デフォルト）/ `future`=到来日数。到来日数ではバケット `min` に負値を指定可能 |
| `chartType` | `'pie' \| 'bar'?` | グラフ種別（省略時 = `'pie'`）。`'bar'` のとき横棒グラフとして表示 |
| `topN` | `number?` | `chartType === 'bar'` のとき: 上位表示件数（省略時 = 全件） |
| `fullWidth` | `boolean?` | `chartType === 'bar'` のとき: 全幅表示（省略時 = `true`）。`false` にすると3列グリッドの1マスで表示 |

### `PieGroupRule`
スライスグルーピング / クロス集計テーブルのグルーピングルール定義。

| フィールド | 型 | 説明 |
|---|---|---|
| `name` | `string` | グループ名（スライス名または行/列ヘッダに表示） |
| `values` | `string[]` | グループ対象の値リスト（`getIssueGroupValue` が返す表示名と一致させる）。`dateCondition` 設定時は無視される |
| `dateCondition` | `PieGroupRuleDateCondition?` | 日付フィールド用条件（`values` の代わりに使用。クロス集計テーブルのみ有効） |
| `andConditions` | `PieGroupRuleAndCondition[]?` | 追加AND条件（クロス集計テーブルのみ評価） |
| `subHeaders` | `string[]?` | クロス集計テーブル用サブヘッダラベル `[level0, level1, ...]`（`subHeaderLevels` が1以上のセクションで使用） |
| `colGroupBy` | `string?` | `colSections` 内でこのルールに適用する列フィールドキー（セクションの `colGroupBy` を上書き） |

### `PieGroupRuleDateCondition`
`PieGroupRule.dateCondition` / `PieGroupRuleAndCondition.dateCondition` で使用する日付比較条件。

| フィールド | 型 | 説明 |
|---|---|---|
| `op` | `'empty' \| 'not_empty' \| '<' \| '<=' \| '>' \| '>=' \| 'this_week' \| 'next_week' \| 'last_week' \| 'to_this_week' \| 'to_next_week' \| 'from_next_week'` | 比較演算子。`empty`=未設定、`not_empty`=設定あり、その他=日付文字列の辞書順比較。週キーワード: `this_week`/`next_week`/`last_week`=週内（月曜〜日曜）、`to_this_week`=今週まで（〜今週日曜）、`to_next_week`=来週まで（〜来週日曜）、`from_next_week`=来週以降（来週月曜〜）。いずれもJST基準 |
| `value` | `'today' \| string?` | 比較基準値。`'today'` は実行時の今日（JST）に解決。比較演算子のときのみ使用（`empty`/`not_empty`/週キーワードでは不要） |

### クロス集計テーブル（CrossTable）

行フィールドと列フィールドを指定し、チケット件数をマトリクス形式で表示するテーブル。

- **行・列フィールド**: `window.availableFilters` のリスト系フィールドに加え、日付型フィールド（`due_date`, `start_date`, カスタム日付フィールド等）も列フィールドとして選択可能（`getAvailableColumnFilterFields()` を使用）。値は自動で全件取得する
- **グルーピング（`rowGroupRules` / `colGroupRules`）**: 複数の値を1行/列にまとめるルールを定義可能（`PieGroupRulesEditor` を再利用）
  - グルーピング未設定時: 全値を件数降順で表示
  - **グルーピング設定時: ルールで定義した行/列のみ表示。どのルールにも属さない値（未グループ値）は除外される**
  - **ユーザー型カスタムフィールドのグループ値解決**: Redmine API（`/issues.json`）はユーザー型 CF の値をユーザーID（数値文字列）で返す。グルーピングルールの `values` は表示名（`/queries/filter` API から取得）を格納しているため、集計時に `rowOptions`/`colOptions` を使って ID → 表示名に解決してからルールマッチングを行う（`aggregateCrossTable` / `aggregateCrossTableMultiSection` 内で処理）。URLフィルタ構築には引き続きID値を使用する
  - グルーピング設定時の表示順序 = ルール定義順（件数降順ではなく定義順が優先）
  - **ルールの並び替え**: `PieGroupRulesEditor` の各ルール行に ↑↓ ボタンを配置。ルールを上下に移動するとルール定義順（＝表示順）が変わる。`computed` セクションが当該セクションのルールを `formula[].ruleIndex` で参照している場合、ルール移動時に `ruleIndex` が自動更新される
  - 0件でもルールに定義された行/列は常に表示される
  - **`(No data)` 対応**: 値選択リストの先頭に `(No data)` が常に表示される。ルールの values に `(No data)` を含めると、対象フィールドが未記入（空値）のチケットをそのグループとして集計する。クリック時のURLフィルタは Redmine の「値なし」演算子 `op[field]=!*` を使用
  - **`(記入がある)` 対応**: 値選択リストの `(No data)` の次に `(記入がある)` が常に表示される。ルールの values に `(記入がある)` を含めると、対象フィールドに何らかの値が記入されているチケット（`(No data)` と背反）をそのグループとして集計する。クリック時のURLフィルタは Redmine の「値あり」演算子 `op[field]=*` を使用。AND条件の値に `(記入がある)` を選択した場合も同様（`op[field]=*` に変換）
  - **日付条件グルーピング（`dateCondition`）**: ルールに `dateCondition` を設定すると `values` の代わりに日付比較で集計する。演算子: `empty`（未設定）/ `not_empty`（設定あり）/ `<`（より前）/ `<=`（以前）/ `>`（より後）/ `>=`（以降）/ `this_week`（今週月〜日）/ `next_week`（来週月〜日）/ `last_week`（先週月〜日）/ `to_this_week`（今週まで）/ `to_next_week`（来週まで）/ `from_next_week`（来週以降）。`value: 'today'` で実行時の今日JST日付と比較。クリック時のURLフィルタ: 単方向演算子は `<=`/`>=` に変換、週内キーワード（`this_week` 等）は Redmine の `><`（between）演算子を用いた期間指定に変換、`to_*`/`from_*` は `<=`/`>=` に変換される
  - **ルール別列フィールド上書き（`PieGroupRule.colGroupBy`）**: `colSections` 内の各ルールに `colGroupBy` を設定すると、そのルールの集計と URL フィルタ構築に使うフィールドをセクションの `colGroupBy` から上書きできる。異なるフィールドを1セクションにまとめる場合に使用
  - **AND条件（`andConditions`）**: 各グルーピングルールにAND条件を追加可能（クロス集計専用）。設定UIの「＋ AND条件を追加」ボタンで追加。AND条件1件 = フィールド選択（react-select） + 値の複数選択（**チェックボックスリスト**）または日付条件（`dateCondition`）。主フィールド値がマッチしても AND条件を満たさないチケットは当該グループに計上されない（別ルールへのマッチ判定に進む）。AND条件付きのグループをクリックした場合、URLフィルタに主フィールドの条件に加えAND条件フィールドのフィルタも付加される（日付条件の場合はルール定義から直接変換）。CF フィールドの場合、セル内の観測値が少ない場合もルール定義の全値を URL に補完する（`augmentAndCondFvsFromRuleDef`）。AND条件の値に `(No data)` のみが含まれる場合は Redmine の「値なし」演算子 `op[field]=!*` に変換する（CF・非CFフィールドともに対応。日付型フィールドに対してリスト選択で `(No data)` を選んだ場合も同様）。AND条件の値に `(記入がある)` を選択した場合は Redmine の「値あり」演算子 `op[field]=*` に変換する
- **絞り込み条件**: 他のグラフと同様の `ConditionsEditor`（AND条件）
- **合計行・合計列（単一列セクションモード）**: 右端に行合計、下端に列合計、右下に総計を表示
  - **セルクリック**: 行条件＋列条件＋テーブル条件でRedmineチケット一覧を新タブで開く（実データ取得済みの場合のみ有効）
  - **行合計クリック**: 行条件＋テーブル条件で開く
  - **列合計クリック**: 列条件＋テーブル条件で開く
  - **総計クリック**: テーブル条件のみで開く
- **0件セル**: 空欄でクリック無効
- **sticky ヘッダ**: 横スクロール時に行ラベル列・列ヘッダ行が固定
- **行ホバー**: ホバー中の行全体を薄い青でハイライト
- **複数テーブル**: `tables[]` 配列で任意個数追加可能。3列グリッドレイアウト上に配置される
- **レイアウト**: `tileColumns`（`1` / `2` / `3`）でタイル幅を指定。`1` = 3列グリッドの1マス、`2` = 2マス分、`3`（省略時デフォルト）= 全幅（`gridColumn: 1/-1`）。設定パネルの「タイル幅」ラジオボタン（1列・2列・全幅）で切り替え。後方互換として `fullWidth: false` は `tileColumns: 1` 相当として扱われる
- **compact モード**: `tileColumns` が 1 または 2 のとき自動でコンパクト表示に切り替わる（セルの上下パディング縮小・フォントサイズ 12px）。それでも幅が足りない場合は横スクロール（`overflowX: auto`）にフォールバック
- **セル左右余白の調整 (`cellPaddingX`)**: `CrossTableConfig.cellPaddingX` に数値（px）を指定すると、テーブル全体の全セル（行ラベル・ヘッダ・データセル・合計行・サブヘッダ・スパニングヘッダ）の左右パディングを上書きする。設定パネルの「タイル幅」横の「セル左右余白(px)」入力欄から指定可能。空欄/未設定 = 従来通り（compact なら 8px、通常 12px）。狭い値を指定することで横幅を圧縮し、横スクロールを回避できる
- **グループ名の改行 (列・行両対応)**: ヘッダ系セル（行ラベル・列ヘッダ・サブヘッダ・セクションラベル・スパニングヘッダ）は `white-space: pre` で描画する。`PieGroupRule.name`（行/列のグルーピングルール名）に改行を含めると表ヘッダで改行として表示されるが、**自動折り返しは行わない**（"Kusakabe Junji" のような単語が列幅不足で勝手に折り返されることを防ぐ）。1 画面に収めたい場合はユーザーが name に `\n` を入れるか `cellPaddingX` を狭くして調整する。グルーピング設定UIの名前入力欄は `<textarea>` で Enter キーによる改行入力に対応。データセル・合計セルは `white-space: nowrap` を維持するため数値が折り返らない
  - 円グラフ・横棒グラフのスライス名／カテゴリ名／凡例では同じ `PieGroupRule.name` が再利用されるが、Recharts の凡例・ラベルが崩れないように表示前に `\n` を半角スペースに置換する
- **設定**: `GraphSettingsPanel` の「クロス集計テーブル設定」セクションから追加・編集・削除・並べ替え可能
- **設定は `localStorage` の `UserSettings.tables` へ保存**
- **EVMタイル設定**（クロス集計テーブル設定の下に表示）:
  - 「＋ EVMタイルを追加」ボタンで任意個数追加可能
  - 各タイルに設定できる項目: タイトル / 対象期間（開始日〜終了日）/ Actualとする日付項目（完了日・登録日・更新日・カスタム日付フィールドから選択）/ グルーピングに使う項目（リスト系フィールドから選択）/ 対象とするチケット条件（`ConditionsEditor` を再利用）/ グループ設定（グループ名・予定数・工数/枚を手動入力、行の追加・削除が可能）/ 月別実績工数（係数逆算用、月の追加・削除が可能）
  - グループ名は `getIssueGroupValue()` が返す値（フィールドの表示名）と一致させる必要がある
  - ↑↓ ボタンで並び順を変更。削除ボタンでタイルを削除
- **係数逆算パネル**（`EvmRegressionPanel`）: 月別実績工数が1件以上入力されている場合、EVMタイルカード下部に表示
  - **入力**: 設定パネルの「月別実績工数（係数逆算用）」テーブルで月（YYYY-MM）と実際投入工数を入力。月数がグループ数以上になると逆算が実行される
  - **最小二乗法**: 月×グループの実績チケット数行列 T と実際工数ベクトル a から Normal equations `T^T T c = T^T a` を部分ピボット付き Gauss-Jordan 消去で解く
    - 全月0件のグループ（ゼロ列）は逆算対象外（`zeroDataGroups` に記録）
    - 逆算値が負になったグループは 0 にクランプ（`clampedGroups` に記録）
  - **折れ線グラフ**: X軸=月、「実際工数（青）」と「予測工数（橙、逆算係数ベース）」の2本の折れ線で乖離を視覚確認
  - **係数比較テーブル**: グループ名 / 現在の係数 / 逆算係数 / 差分（色分け）を並べて表示
  - **「この係数を設定に適用」ボタン**: 逆算した `effortPerTicket` をグループ設定に上書き（月数 < グループ数のとき disabled）
  - **警告バナー**: 月数不足 / ゼロデータグループ / クランプ発生を条件付きで表示
  - 実績チケット数の集計には既存の `aggregateEVM()` を月単位で再利用（`startDate`/`endDate` を当月範囲に変えて呼び出す）

#### 複数列セクション（`colSections`）

同じ行グループに対して、**異なる列集計を複数並べる**機能。例: 行=開発プロセス、列セクション1=ステータス別（New/In Progress/Completed）、列セクション2=遅延フラグ別（Delay/On Track）。

- **表示形式**: 1行目がセクションラベルを横断する結合ヘッダ、2行目が各セクションの列ヘッダ。セクション境界に太い縦線を表示
- **行合計列・総計セルなし**（複数セクションモード時）。各セクションの列合計行は表示される
- **セクション絞り込み条件**: 各セクションにテーブルレベルの `conditions` と AND される独自の絞り込み条件を設定可能
- **クリック動作**: セル/列合計クリック時のURLフィルタに「テーブル条件 + セクション条件 + 行条件 + 列条件」が含まれる
- **行キーの確定**: テーブル条件 + 行グループのみで行を確定し、列セクションは独立して集計（同一チケットが複数セクションの異なる列にカウントされる）
- **列ルールの独立評価**: 各セクション内でも、全ルールを独立評価して集計する（最初にマッチしたルールで打ち切らない）。同一チケットが同一セクション内の複数ルールにマッチした場合は複数列に重複カウントされる。列合計は行合計（テーブル全体での一意カウント）を超えることがある
- **スパニングヘッダ（`spanningHeader`）**: 各セクションに `spanningHeader` を設定すると、セクションラベル行の上に1行追加される。同一文字列のセクションが隣接する場合、先頭セクションにのみラベルを表示し内部セルは空にすることで視覚的にグループを表現する（技術的には colSpan でマージせず1セクション=1セルで描画）。グループ境界に太い縦線、グループ内は背景色と同色の縦線（不可視）。設定UIの「グループ見出し」欄で入力。未設定のセクションは空セルとして表示される（後方互換: いずれのセクションも未設定の場合はスパニングヘッダ行は表示されない）
- **設定UI**: 「列を複数セクション化」ボタンで既存の colGroupBy を最初のセクションに変換。セクションごとにラベル・フィールド・グルーピングルール・絞り込み条件を設定可能。セクション行の ↑↓ ボタンでセクション自体の並び替え・削除も可能（セクション移動時、`computed` セクションの `formula[].sectionIndex` 参照を自動更新）。グルーピングルール行の ↑↓ ボタンでセクション内の列グループを並び替え可能。「セクション化を解除」で単一セクションモードに戻る（先頭セクションの設定が復元される）

#### 計算式セクション（`type: 'computed'`）

`colSections` 内に `type: 'computed'` を設定したセクションを追加すると、**他のデータセクションの値を使った計算式**で列の値を表示できる。チケット件数をカウントするのではなく、既存セクションの集計値を参照して差分・合計などを計算する。

- **用途例**: 「今日までに着手した実績（23件）」の隣に「遅延件数 − 前倒し件数 = −4」を `±N` 形式で表示する
- **表示形式**: 正値 = `+N`（緑）、負値 = `-N`（赤）、ゼロ = `±0`（グレー）
- **クリック動作なし**: 計算式セクションのセルはクリック不可（チケット一覧は開かない）
- **合計行**: 各列の行合計値も同じ `±N` 形式で表示される
- **サブヘッダ**: データセクションと同じく見出し行数（1〜2）と各列のサブヘッダテキストを設定可能
- **設定UI**: 「＋ 計算式セクションを追加」ボタンで追加。見出し行数・列ラベル・サブヘッダ・計算式（項の追加/削除・±係数・参照セクション/ルール選択）をGUIで設定可能

**設定例（Preset JSON）:**
```json
{
  "label": "Delta",
  "type": "computed",
  "colGroupBy": "",
  "subHeaderLevels": 1,
  "computedCols": [
    {
      "label": "Start",
      "subHeaders": ["Δ"],
      "formula": [
        { "sectionIndex": 2, "ruleIndex": 1, "coefficient":  1 },
        { "sectionIndex": 2, "ruleIndex": 0, "coefficient": -1 }
      ]
    }
  ]
}
```
→ `colSections[2]`（例: Delay/Ahead）の `ruleIndex=1`（Ahead）から `ruleIndex=0`（Delay）を引いた値を表示

#### `CrossTableConfig` 型

| フィールド | 型 | 説明 |
|---|---|---|
| `label` | `string?` | 表のタイトル（省略時 = 行フィールド名 × 列フィールド名） |
| `rowGroupBy` | `string` | 行のグループキー（例: `'tracker_id'`, `'cf_123'`） |
| `colGroupBy` | `string` | 列のグループキー（`colSections` が存在する場合は無視） |
| `conditions` | `SeriesCondition[]?` | 集計対象の絞り込み条件（省略時 = フィルタなし） |
| `rowGroupRules` | `PieGroupRule[]?` | 行のグルーピングルール。設定時はルール定義の行のみ表示（未グループ値は除外）。各ルールに `andConditions` を追加可能（クロス集計専用） |
| `colGroupRules` | `PieGroupRule[]?` | 列のグルーピングルール（`colSections` がない場合のみ有効） |
| `colSections` | `CrossTableColSection[]?` | 複数列セクション定義。存在する場合 `colGroupBy`/`colGroupRules` より優先 |
| `fullWidth` | `boolean?` | 後方互換: 省略/`true` = 全幅、`false` = 1列。`tileColumns` が指定された場合はそちら優先 |
| `tileColumns` | `1 \| 2 \| 3?` | タイル幅（1=1/3幅、2=2/3幅、3=全幅）。省略時は `fullWidth` に従う |
| `cellPaddingX` | `number?` | セルの左右余白(px)。省略時は compact なら 8、通常は 12（従来動作）。1 画面に表を収めたいときに小さい値を指定する |

#### `CrossTableColSection` 型

| フィールド | 型 | 説明 |
|---|---|---|
| `label` | `string?` | セクションヘッダ表示名（省略時 = `colGroupBy` のフィールドキー） |
| `type` | `'data' \| 'computed'?` | セクション種別（省略時 = `'data'`）。`'computed'` の場合は `computedCols` を使用 |
| `colGroupBy` | `string` | このセクションの列グループキー（ルールに `colGroupBy` が設定されている場合はルール単位で上書き可能。`type: 'computed'` の場合は空文字でよい） |
| `colGroupRules` | `PieGroupRule[]?` | このセクションの列グルーピングルール（`type: 'data'` のみ有効） |
| `conditions` | `SeriesCondition[]?` | セクション固有の絞り込み条件（テーブルレベルの `conditions` と AND。`type: 'data'` のみ有効） |
| `subHeaderLevels` | `number?` | サブヘッダ行数 0〜2（省略時 = 0）。`colGroupRules` の各ルールまたは `computedCols` の各列に `subHeaders` を設定し、ヘッダを複数行に分けて表示する場合に使用 |
| `computedCols` | `ComputedCol[]?` | 計算式列の定義（`type: 'computed'` のみ使用） |
| `spanningHeader` | `string?` | スパニングヘッダ表示名（省略時 = 非表示）。隣接する同一文字列のセクションが `colSpan` で自動結合される。いずれかのセクションに設定するとセクションラベル行の上に1行追加される。未設定セクションは空セルで表示 |

#### `ComputedCol` 型

| フィールド | 型 | 説明 |
|---|---|---|
| `label` | `string?` | 列ヘッダ表示名 |
| `formula` | `ComputedColFormulaTerm[]` | 計算式の項リスト（各項の値を合算して列の値を求める） |
| `subHeaders` | `string[]?` | サブヘッダテキスト `[level0, level1, ...]`（`subHeaderLevels` が1以上のセクションで使用） |

#### `ComputedColFormulaTerm` 型

| フィールド | 型 | 説明 |
|---|---|---|
| `sectionIndex` | `number` | 参照する `colSections` のインデックス（`type: 'data'` のセクションのみ参照可能） |
| `ruleIndex` | `number` | 参照するルール（`colGroupRules`）のインデックス |
| `coefficient` | `number` | 係数（`1` で加算、`-1` で減算。整数以外も指定可能） |

### EVMタイル（EvmTile）

EVM（Earned Value Management）の考え方をチケット数に適用して、計画値・予想実績・実績を可視化するタイル。

- **Planned（計画値）**: グループごとに「予定チケット数 × 1枚あたり工数」で計算した計画工数を表示。グループ行の合計工数を下部に表示
- **Earned（予想実績）**: 対象期間の総営業日数に対する現時点の経過営業日数の割合（`経過営業日数 / 総営業日数`）× Planned合計工数を表示。進捗バーとKPIボックスで視覚的に示す
  - 今日 < 開始日: 進捗 = 0%
  - 今日 > 終了日: 進捗 = 100%
  - 期間中: 開始日〜今日の営業日数 / 開始日〜終了日の営業日数
  - 営業日計算は `data-holidays-issue-id` で指定された祝日を参照（設定済みの場合）
- **Actual（実績）**: 対象チケット条件にマッチし、かつ指定した日付項目の値が対象期間内のチケットをグルーピングフィールドで集計。Planned設定の工数単価をもとに実績工数を計算
  - 設定グループ名（`EVMGroupRow.groupName`）と一致するチケットはその行にカウント
  - 設定に存在しないグループ値のチケットは「その他」行にまとめる（工数 = 0）
- **表示レイアウト**: テーブル形式（グループ名 / Planned件数・工数 / Actual件数・工数）+ ヘッダエリア（期間・営業日進捗・KPIボックス）
- **KPIボックス**: Planned合計・Earned工数・Actual合計を色分けボックスで並べて表示
- **集計対象チケット**: App.tsx でフェッチ済みのチケット（URLの現在フィルタ条件で取得されたもの）を使用。URLに日付絞り込みがある場合は対象外になるチケットがある点に注意
- **複数タイル**: `evmTiles[]` 配列で任意個数追加可能
- **設定**: `GraphSettingsPanel` の「EVMタイル設定」セクションから追加・編集・削除・並べ替え可能
- **設定は `localStorage` の `UserSettings.evmTiles` へ保存**

#### `EVMTileConfig` 型

| フィールド | 型 | 説明 |
|---|---|---|
| `title` | `string` | タイルのタイトル |
| `startDate` | `string` | 対象期間 開始日（YYYY-MM-DD） |
| `endDate` | `string` | 対象期間 終了日（YYYY-MM-DD） |
| `conditions` | `SeriesCondition[]?` | 集計対象チケットの絞り込み条件（AND条件） |
| `actualDateField` | `string` | Actual判定に使う日付フィールドのキー（例: `'closed_on'`, `'cf_XXX'`） |
| `groupByField` | `string` | グルーピングフィールドのキー（例: `'tracker_id'`, `'cf_XXX'`） |
| `groups` | `EVMGroupRow[]` | グループ設定（手動定義） |
| `monthlyActuals` | `EvmMonthlyActual[]?` | 係数逆算用の月別実績工数（省略可） |

#### `EVMGroupRow` 型

| フィールド | 型 | 説明 |
|---|---|---|
| `groupName` | `string` | グループ値名。`getIssueGroupValue()` が返す値（名前文字列）と一致させる必要がある |
| `plannedCount` | `number` | 予定チケット数 |
| `effortPerTicket` | `number` | 1チケットあたりの工数 |

#### `EvmMonthlyActual` 型

| フィールド | 型 | 説明 |
|---|---|---|
| `month` | `string` | 対象月（YYYY-MM形式、例: `"2026-01"`） |
| `actualEffort` | `number` | その月に実際に投入した工数（ユーザー手入力） |

## 担当数マッピング（AssignmentMappingPanel）

チケット数を担当者×日付のマトリクス表で表示するパネル。**集計モード**（`mode`）によって集計方法が異なる。

### 集計モード

#### 期間モード（`mode: 'period'`、デフォルト）

チケットの「開始日〜終了日」期間が特定の日付と重なる件数を集計する。

- **集計ロジック**: `start_date`（開始日）〜終了日フィールドの期間が表示日付を含む場合にカウント。1チケットが複数の日付列に計上される
- **開始日フィールド**: `start_date` 固定。空のチケットはスキップ
- **終了日フィールド**: ユーザーが選択（`due_date` 等の日付型フィールド）
- **終了日が空の場合**: `start_date + fallbackDays 営業日`（祝日を考慮した `addBusinessDaysToDate` を使用）
- **セルクリック**: 担当者フィールド条件 + `start_date <= クリック日付` + `終了日フィールド >= クリック日付` + 設定済みconditionsで Redmine チケット一覧を新タブで開く

**ユースケース**: その日に「進行中の（担当している）チケット」が何件あるかを把握する

#### ピンポイントモード（`mode: 'pinpoint'`）

特定の日付フィールド（`dateField`）の値が表示日付と一致するチケット数を集計する。1チケットは1日のみに計上される。

- **集計ロジック**: `dateField` の値が表示日付と完全一致する場合にカウント。`start_date` は参照しない
- **集計日付フィールド**: ユーザーが選択（`due_date` 等の日付型フィールド）。値が空のチケットはスキップ
- **セルクリック**: 担当者フィールド条件 + `集計日付フィールド = クリック日付`（完全一致）+ 設定済みconditionsで Redmine チケット一覧を新タブで開く

**ユースケース**: `due_date`（期日）を指定すれば、その人がその日に何件終了させる予定かを把握する

---

- **担当者フィールド**: リスト系フィールドから選択（例: `assigned_to_id'`）
- **担当者追加UI**: テキスト部分入力 → オートコンプリート候補 → 選択でID自動紐付け（`fetchFilterFieldOptions` で取得した選択肢を検索）
- **0件セル**: 空欄表示
- **土日非表示**: `hideWeekends` オプションで日付列から除外
- **全幅表示**: `fullWidth` オプション（デフォルト: `true`）
- **複数マッピング**: `assignmentMappings[]` 配列で任意個数追加可能
- **設定**: `GraphSettingsPanel` の「担当数マッピング設定」セクションから追加・編集・削除・並べ替え可能
- **設定は `localStorage` の `UserSettings.assignmentMappings` へ保存**

### ヘッダー構造（3行）

日付列のヘッダーは3行構造：

| 行 | 内容 |
|---|---|
| 月行（1行目）| 各月の最初の日付列の上に英語月名（例: `Apr`）を表示。月の切り替わり位置に縦線 |
| 日行（2行目）| 日番号（例: `1`, `2`, ...） |
| 曜日行（3行目）| 3文字英語略称（`Mon`, `Tue`, `Wed`, `Thu`, `Fri`, `Sat`, `Sun`） |

- 名前列・追加列は `rowSpan=3` で3行をまたがる
- **週区切り縦線**: 日行・曜日行・データ行の月曜日（週の先頭）に濃い縦線を表示。月行には引かない

### 追加列（extraColumns / extraValues）

担当者名の右・日付列の左に静的情報列（Resource 等）を表示できる。

- **デフォルト**: Resource（number型）列のみ
- **列管理**: 設定パネルの「追加列」セクションで追加・削除・順序変更・列名編集が可能
- **インライン編集**: テーブルのセルをクリックすると入力フィールドになる。Enter/Blur でコミット、Escape でキャンセル。値は `extraValues`（personId → columnKey → 文字列）に保存される
- **スタイル**: 薄黄色背景（`#fefce8`）で日付列と視覚的に区別

### 担当者のクリップボード連携

**「担当者をクリップボードからペースト」ボタン**（設定パネル内）

JournalCountTile の「担当者をクリップボードにコピー」でコピーした CSV（またはテキストエディタで作成した CSV）を読み込んで担当者・追加列・値を一括設定する。

- **CSV形式**: JournalCountTile の CSV と同一形式（1列目=担当者名、2列目=Resource、3列目以降=追加列）
- ヘッダー行の有無を自動判定（1列目が Redmine ユーザー名と一致しなければヘッダー行とみなす）
- 担当者名と大文字小文字を無視して照合し、一致すれば ID を自動設定
- 一致しない担当者は `_csv_N`（仮ID）で登録され、タグが赤字 + ⚠ 表示になる（手動で再設定する）
- **「CSVから取り込む」ボタン**: ファイル選択ダイアログから同じ処理を実行

### `AssignmentMappingConfig` 型

| フィールド | 型 | 説明 |
|---|---|---|
| `title` | `string?` | パネルのタイトル（省略時 = 「担当数マッピング」） |
| `mode` | `'period' \| 'pinpoint'?` | 集計モード（省略時 = `'period'`） |
| `assigneeField` | `string` | 担当者フィールドキー（例: `'assigned_to_id'`） |
| `endDateField` | `string` | 終了日フィールドキー（例: `'due_date'`, `'cf_XXX'`）。期間モード用 |
| `fallbackDays` | `number` | 終了日が空の場合に `start_date` からの営業日数（デフォルト: 5）。期間モード用 |
| `dateField` | `string?` | 集計に使う日付フィールドキー（例: `'due_date'`）。ピンポイントモード用 |
| `displayStartDate` | `string` | 表示開始日（YYYY-MM-DD） |
| `displayEndDate` | `string` | 表示終了日（YYYY-MM-DD） |
| `conditions` | `SeriesCondition[]?` | 集計対象チケットの絞り込み条件（AND条件） |
| `persons` | `AssignmentMappingPerson[]` | 表示する担当者リスト（name + id） |
| `hideWeekends` | `boolean?` | 土日を非表示（省略時 = `false`） |
| `fullWidth` | `boolean?` | 全幅表示（省略/`true` = 全幅、`false` = 3列グリッドの1マスで表示） |
| `extraColumns` | `JournalCountExtraColumn[]?` | 追加列定義（省略時 = Resource のみ） |
| `extraValues` | `Record<string, Record<string, string>>?` | personId → columnKey → 入力値 |

### `AssignmentMappingPerson` 型

| フィールド | 型 | 説明 |
|---|---|---|
| `name` | `string` | 表示名（担当者選択時点の名前） |
| `id` | `string` | フィールド値ID（実際の集計に使う。名前が変わっても影響なし） |

## 見出しタイル（HeadingConfig）

タイル間の区切り・セクション見出しとして使用するシンプルな横一直線のカラーバー付きテキスト。

- **表示**: 左辺6pxの色付きボーダー＋薄い背景色のブロック。テキストは太字（`fontWeight: 700`）で表示。常に全幅（`gridColumn: 1/-1`）
- **設定**: `GraphSettingsPanel` の「見出し設定」セクションから追加・編集・削除。テキスト入力と12色パレットから色を選択
- **TileCard を使わない**: PNG Copy / PNG DL ボタンなし（区切り要素のため）
- **設定は `localStorage` の `UserSettings.headings` へ保存**

### `HeadingConfig` 型

| フィールド | 型 | 説明 |
|---|---|---|
| `text` | `string` | 見出しテキスト |
| `color` | `string` | アクセントカラー（HEX）。左ボーダーと薄い背景色に使用 |

## ジャーナル収集タイル（JournalCollectorTile）

Redmineチケットの更新履歴（journals）を一括収集し、指定チケットの `description` にJSONとして保存するタイル。担当者ごとの更新回数集計などのデータ蓄積が目的。

### 動作概要

- タイルに設定した条件（トラッカー等）に合致するチケットを対象に、各チケットの `include=journals` APIを1件ずつ呼び出して更新履歴を収集する
- 収集したデータは指定チケット（`targetIssueId`）の `description` にJSON配列として保存する
- **起票も1件として記録**: ジャーナルには起票が残らないため、チケットの `author.id` + `created_on` を起票レコードとして別途追加する
- **担当者はID保存**: 名前変更に強くするため `journal.user.id`（起票レコードは `issue.author.id`）をIDで記録する
- **更新日は JST 日付のみ**: `journal.created_on`（`journal.updated_on` は履歴修正のため使わない）をUTC→JST変換後に `YYYY-MM-DD` 形式で保存する
- **差分更新**: 前回収集完了後に保存先チケットが更新された日時を基準に `updated_on >= 前回日付` でチケットを絞り込み、全件再取得を防ぐ（Redmine APIの制約で日付部分のみ指定）
- **チケット単位マージ**: 差分フェッチで取得したチケットIDに対応する既存レコードを全削除し、最新のジャーナル全件で置き換える（`include=journals` はジャーナルの日付絞り込み不可のため全件取り直しが前提であり整合する）
- **スコープ**: 現在表示中のプロジェクト内のみ（`/projects/{id}/issues.json`）

### 保存するJSONの構造

```json
[
  { "issueId": 123, "date": "2026-03-10", "user": 101, "project": "ProjectA", "tracker": "バグ" },
  { "issueId": 123, "date": "2026-03-15", "user": 205, "project": "ProjectA", "tracker": "バグ" },
  { "issueId": 124, "date": "2026-03-11", "user": 101, "project": "ProjectB", "tracker": "機能" }
]
```

1チケットにつき「起票レコード × 1」＋「ジャーナルレコード × N」が生成される。

### 前回更新日の管理

- タイルロード時に保存先チケットの `updated_on` を API から取得して表示する
- 収集実行後: 保存先チケットを再取得し、その `updated_on` を `lastCollectedAt`（localStorage）に保存する
- **クリア**: `lastCollectedAt` を `null` にリセットする。次回収集実行時は全件フェッチになる
- タイル上に「（次回は全件取得）」バッジを表示して全件フェッチ予定であることを通知する

### 収集フロー

```
[収集実行]ボタン
  │
  ├─ lastCollectedAt == null → 全件フェッチ（updated_on フィルタなし）
  └─ lastCollectedAt != null → 差分フェッチ（updated_on >= 前回日付の日付部分）
            ↓
  fetchAllIssues(projectId, conditions + updated_on フィルタ, apiKey)
            ↓
  各 issue に対して GET /issues/{id}.json?include=journals（1件ずつ）
            ↓
  起票レコード + ジャーナルレコードを生成（collectionStartYearMonth が設定されている場合はその月の1日以降のレコードのみ）
            ↓
  既存JSON から差分取得 issueId を全削除 → 新レコードを追加（チケット単位マージ）
            ↓
  PUT /issues/{targetIssueId}.json  ← description に上書き保存
            ↓
  GET /issues/{targetIssueId}.json  ← 新 updated_on を lastCollectedAt に保存
```

### タイルUI

- タイル名、保存先チケット番号、前回更新日（API取得）、収集条件を表示
- 収集中は進捗バー（「収集中... X / N 件」）を表示
- エラー発生時はエラーメッセージを表示
- 「設定」ボタンで設定パネル（タイル名・保存先チケット番号・収集条件）を開閉
- 「削除」ボタンでタイルを削除
- **常に全幅表示**（`gridColumn: 1/-1`）

### 設定

- `GraphSettingsPanel` の「ジャーナル収集タイル」セクションの「＋ ジャーナル収集タイルを追加」で追加
- 個別設定（タイル名・保存先チケット・収集開始年月・条件）はタイル上の「設定」ボタンから編集
- 条件の編集UIは既存の `ConditionsEditor`（`GraphSettingsPanel.tsx`）を再利用
- **設定は `localStorage` の `UserSettings.journalCollectors` へ保存**

### `JournalCollectorConfig` 型

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | `string` | タイル識別子 |
| `name` | `string` | タイル表示名 |
| `targetIssueId` | `number` | 収集データの保存先チケット番号 |
| `conditions` | `SeriesCondition[]` | 収集対象チケットの絞り込み条件 |
| `lastCollectedAt` | `string \| null` | 前回収集完了時の保存先チケット `updated_on`（UTC ISO文字列）。`null` = 次回は全件フェッチ |
| `collectionStartYearMonth` | `string?` | 収集開始年月（`"YYYY-MM"` 形式）。設定時はこの月の1日以降のレコードのみ保存。未設定=全期間 |

### `JournalRecord` 型

| フィールド | 型 | 説明 |
|---|---|---|
| `issueId` | `number` | チケットID |
| `date` | `string` | 更新日（`YYYY-MM-DD`、UTC→JST変換済み）。起票レコードは `issue.created_on`、ジャーナルレコードは `journal.created_on` から生成 |
| `user` | `number` | 更新者ID。起票レコードは `issue.author.id`、ジャーナルレコードは `journal.user.id` |
| `project` | `string` | プロジェクト名（`issue.project.name`） |
| `tracker` | `string` | トラッカー名（`issue.tracker.name`） |

## ジャーナル更新回数タイル（JournalCountTile）

`JournalCollectorTile` が収集・保存した `JournalRecord[]` JSON を参照し、担当者×期間のマトリクス形式でジャーナル更新回数を集計・表示するタイル。

### 表示概要

- **行**: 設定した担当者リスト（+ 合計行）
- **追加列**: Resource・Team・Role など任意の静的情報列（入力フィールド。CSVインポートで一括設定可能）
- **集計列**: 月単位列と週単位列を混在表示
  - デフォルトは月単位（「N月」列）
  - 「週単位表示月」で指定した1ヶ月分のみ週単位に展開（「M/D週」列）
  - 週単位表示月が未設定の場合は今月を自動選択
  - 週単位表示月かつ今日がその月内の場合、`endDate` の設定に関わらず現在の未完了週まで自動延長
- **合計列**: 各担当者の全期間合計
- **月平均列**: 月単位列の平均（例: `12-2月平均`）。月単位列が存在する場合のみ表示
- **週平均列**: 完了済み週のみを対象とした週平均（例: `3月週平均`）。今週（未完了）は除外。週単位列の過去分が存在する場合のみ表示
- 平均列は薄黄色で色分けして視覚的に区別
- **常に全幅表示**（`gridColumn: 1/-1`）

### 集計ロジック

- `effectiveStartDate`: `startDate` が空の場合は6ヶ月前の1日を自動使用（設定値は変更しない）
- `effectiveEndDate`: `endDate` が空の場合は**ローカル日付**で当日を自動使用（UTC日付ではなくローカルの年月日を使用。設定値は変更しない）
- 月単位列キー: `m:YYYY-MM`
- 週単位列キー: `w:YYYY-MM-DD`（週の月曜日）
- record の属する月が `effectiveWeeklyMonth` と一致 → `getWeekStart(record.date)` で週キーへ集計
- それ以外 → `record.date.slice(0, 7)` で月キーへ集計
- `filterTrackerIds` 設定時は該当トラッカーのレコードのみカウント

#### クロスマンス週の表示

月境界をまたぐ週（例: 月曜3月30日〜日曜4月5日）では、週列の**表示**と**合計計算**を分離して管理する：

- **`countMap`（合計計算用）**: 前月分は月単位列、当月分は週単位列に集計。ダブルカウントなし。合計列・平均列はこちらを使用
- **`weekCrossMonthMap`（表示用オーバーレイ）**: 前月に属するが週列が当月にかかっているレコードを追加で集計。週列セルの**表示数値**は `countMap + weekCrossMonthMap` の合計値を使用
- これにより「3月30日週」列には3月30〜31日分も含めて表示しつつ、合計列には3月分の重複計上を防ぐ

### CSVインポート

設定パネルの「CSVから取り込む」で CSV ファイルを読み込むと担当者と追加列を一括設定できる。

**CSV形式**:

| 列 | 内容 |
|---|---|
| 1列目 | 担当者名（固定） |
| 2列目 | Resource（固定・数値） |
| 3列目以降 | 追加列（テキスト。ヘッダー行が列名になる） |

- ヘッダー行必須。Redmine ユーザー名と大文字小文字を無視して照合し、一致すればユーザーIDを自動設定
- 一致しない担当者は `_csv_N`（仮ID）で登録され、テーブル・担当者エディタ上で名前が赤字表示される
- 未マッチの担当者は担当者エディタで削除後に再検索して追加することで修正できる

### 担当者のクリップボードコピー

設定パネルの「担当者をクリップボードにコピー」ボタンで、担当者リストと追加列の値を CSV 形式でクリップボードに書き出す。

- **出力 CSV 形式**: ヘッダー行（担当者名, Resource, 追加列...）＋データ行（担当者名と各列の値）
- AssignmentMappingPanel の「担当者をクリップボードからペースト」と同一形式のため、JournalCountTile → AssignmentMappingPanel へのワンアクション転送が可能
- ボタン押下後2秒間「コピー済み!」に表示が変わる

### タイルUI

- ヘッダーに「更新」「設定」「削除」ボタン。最終取得日を表示
- 設定パネルでタイル名・ソースチケット番号・集計開始日・集計終了日・週単位表示月・CSVインポート・**担当者をクリップボードにコピー**・トラッカーフィルタ・追加列・担当者を編集
- **常に全幅表示**（`gridColumn: 1/-1`）

### 設定

- `GraphSettingsPanel` の「ジャーナル更新回数タイルを追加」から追加
- **設定は `localStorage` の `UserSettings.journalCounts` へ保存**

### `JournalCountConfig` 型

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | `string` | タイル識別子 |
| `name` | `string?` | タイル表示名（省略時 = 「ジャーナル更新回数」） |
| `sourceIssueId` | `number` | `JournalRecord[]` JSON が保存されているチケット番号 |
| `persons` | `AssignmentMappingPerson[]` | 表示担当者リスト |
| `filterTrackerIds` | `number[]?` | トラッカーIDで絞り込み（空 = 全件） |
| `startDate` | `string` | 集計開始日 `YYYY-MM-DD`（空欄 = 6ヶ月前の1日を自動使用） |
| `endDate` | `string` | 集計終了日 `YYYY-MM-DD`（空欄 = 当日を自動使用） |
| `weeklyDetailMonth` | `string?` | 週単位展開する月 `YYYY-MM`（省略時 = 今月を自動使用） |
| `extraColumns` | `JournalCountExtraColumn[]?` | 追加列定義（省略時 = Resource のみ） |
| `extraValues` | `Record<string, Record<string, string>>?` | personId → columnKey → 入力値 |
| `fullWidth` | `boolean?` | 常に全幅 |

### `JournalCountExtraColumn` 型

| フィールド | 型 | 説明 |
|---|---|---|
| `key` | `string` | 列識別キー |
| `label` | `string` | 列ヘッダー表示名 |
| `type` | `'number' \| 'text'` | 入力フィールドの型 |

## タイルカード共通機能（TileCard）

2軸グラフ・円グラフ・横棒グラフ・クロス集計テーブル・EVMタイル・担当数マッピングは `TileCard` コンポーネントでラップされており、右上に以下のボタンが表示される。（見出しタイルは TileCard を使わない）

| ボタン | 機能 |
|---|---|
| **−** | タイルを非表示にする。非表示後はタイル1行分の細いバー（`▶ タイル名 [表示]`）に置き換わり、バー全体または「表示」ボタンのクリックで元に戻せる。非表示状態は `UserSettings.hiddenTiles` に保存される |
| **Copy graph** | タイルの直後に全く同じ設定の複製を挿入する。複製後の順序変更は設定パネルの「タイル順序」セクションの ↑↓ ボタンで行う |
| **PNG Copy** | タイルをPNG画像としてクリップボードにコピー（ボタン自体は画像に含まれない） |
| **PNG DL** | タイルをPNG画像としてダウンロード（2x 解像度） |

- **タイル複製の仕組み**: `tileOrder` の元タイルの直後に新しい `TileRef`（新規ID）を挿入し、対応する設定配列（`combos` / `pies` / `tables` / `evmTiles` / `assignmentMappings` / `headings`）に深いコピーを追加する。設定は `localStorage` に即時保存される
- **タイル順序（`tileOrder`）**: `UserSettings.tileOrder` に `{ type, id }` 配列として保存。`type` は `'combo' | 'pie' | 'table' | 'evm' | 'assignment' | 'heading' | 'journal-collector' | 'journal-count'`。設定パネルの「タイル順序」セクションで ↑↓ ボタンによる並べ替えが可能

## 今後の課題

（特になし）
