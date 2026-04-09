# スパニングヘッダ内の縦線問題（未解決）

## 状況

2026-04-09 時点で未解決。スパニングヘッダ機能自体は動作しているが、
スパニングヘッダ行内のグループ境界以外の縦線が消えていない。

## 期待する見た目

```
[左列]│[ ToTal ]│[──────── Until this week ────────]│[ Delta ]│[ Delay/Ahead ]│[── Next Week ──]
      │  Total  │ Until this week │  今週まで │ Start │ End │  予実差  │  Delay │  Ahead │  Start │  End
```

グループ境界（ToTal / Until this week / Delta / Next Week の間）は太い縦線、
グループ内（Until this week 内の各セクション間）は縦線なし（または背景色と同色で不可視）。

## 根本原因

`border-collapse: collapse` モードでは、`colSpan` セルの下の行にあるセルの
`borderLeft` が物理的に同一の線として共有（bleed through）される CSS 仕様。

スパニングヘッダ行で `borderLeft: '1px solid #d1d5db'`（背景色 `#d1d5db` と同色）を
設定すれば不可視になるはずだが、実際には下の行のセル（セクションラベル行）の
`borderLeft: '2px solid #9ca3af'` または `'1px solid #d1d5db'` が勝ってしまい縦線が残る。

## 試した方法

1. スパニングヘッダのセルに `borderLeft: 'none'` → `collapse` モードでは下の行が勝つ
2. スパニングヘッダのセルに `borderLeft: '1px solid #d1d5db'`（背景色と同色）→ 変化なし（下の行が勝つ）
3. `border-collapse: separate` + `border-spacing: 0` に変更し各セルの罫線を独立化
   → 外枠・ダブルボーダー問題が複雑になり見た目が崩れた
4. `sectionHeaderStyle` の `border` shorthand を削除し `borderTop/Bottom/Left` 個別指定
   → キャッシュ or 別の問題で変化が確認できず

## 参考: AssignmentMappingPanel の月行の仕組み

`AssignmentMappingPanel.tsx` の「月」行は同じ `border-collapse: collapse` で
月ラベルなしセルには `borderLeft` を設定せず（月境界セルのみ `2px solid`）、
見た目上は月内に縦線がない状態を実現している。

これが可能な理由は「月」行のベーススタイル `thStyle` の `border: '1px solid #e5e7eb'`（薄いグレー）と
`background: '#f9fafb'`（ほぼ白）が非常に近い色のため、縦線がほぼ不可視。

スパニングヘッダは背景 `#d1d5db`（やや濃いグレー）のため同じ手法では消えない。

## 次のアプローチ候補

### A. `outline` + `clip-path` または `box-shadow` で縦線を上書き
スパニングヘッダセルの `after` 疑似要素や絶対位置要素で白線を上書き。
→ inline style では `::after` が使えないため、CSS クラス追加が必要。

### B. セクションラベル行のスパニングヘッダ直下セルの `borderTop` を消す
セクションラベル行（スパニングヘッダの真下）の各セルに `borderTop: 'none'` を設定する。
`border-collapse: collapse` では隣接セルの境界線はより「優先度が高い線」が勝つため、
スパニングヘッダ側の `borderBottom` でなくセクションラベル行の `borderTop: 'none'` が
使われる可能性がある。
→ 縦線は変わらないが横線の制御には有効かもしれない。

### C. スパニングヘッダ行のセルを `position: relative` + `z-index` + 白い `::before` で上書き
→ inline style 制約のため難しい。

### D. 背景色をスパニングヘッダと同じ `#d1d5db` にしたセクションラベル行の「ダミー」セルを使う
現在の実装を逆転させ、グループ内セクションのセクションラベル行を
スパニングヘッダと同じ背景色・同じ border 色にして「境界のない帯」に見せる。

### E. スパニングヘッダ行のみ `<div>` + absolute/relative 配置で `<table>` の外に重ねて描画
テーブルヘッダ部分だけ別レイヤーで描画し CSS 的に独立させる。
→ 実装が複雑。

## 現在の実装状態（2026-04-09）

`CrossTable.tsx` の `if (sections)` ブロック内：

- `hasSpanning`: いずれかのセクションに `spanningHeader` が設定されていれば `true`
- `isFirstInSpanningGroup(si)`: セクション `si` が同一 spanningHeader グループの先頭かどうか
- スパニングヘッダ行: `hasSpanning` が true のとき 1セクション=1セルで描画
  - 先頭セル: `borderLeft: '2px solid #9ca3af'`、テキスト表示
  - 非先頭セル: `borderLeft: '1px solid #d1d5db'`（背景色と同色を意図）、テキスト空
- セクションラベル行以降: `isFirstInSpanningGroup` で `2px` / `1px` を切り替え

機能自体（スパニングヘッダの表示・グループ境界の太線）は正常動作中。
縦線を完全に消す対応は後回し。
