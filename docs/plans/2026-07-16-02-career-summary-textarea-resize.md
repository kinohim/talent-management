# 経歴概要・自己PR textarea のサイズ変更対応

## Context

EDT002(経歴概要・自己PR登録)の textarea(登録用フィールドと AI 生成結果の出力フォームの計4か所)が、ドラッグでサイズ変更できなくなっていた。原因はUI一括改修(`3260f4b`)で、登録用フィールドと AI 生成パネルを左右対称の同じ高さに揃えるために textarea 自体へ `flex-1` を付与したこと。flex レイアウトが textarea の高さを常に再決定するため、リサイズハンドルでドラッグしても即座に元の高さへ戻されていた(`resize-none` は不使用)。

リサイズ可能に戻したうえで、次の挙動を仕様とした:

1. 初期表示では外枠(カード)と内枠(textarea)の間に無駄なスペースを作らない(textarea がカード内の残り空間を埋める)
2. 内枠を初期より大きくリサイズしたら外枠も追従して広がる(横並び時は反対側のカードも追従)
3. 内枠を初期より小さくリサイズしても外枠は初期サイズより縮まない

## 変更内容

対象: `components/career-summary/CareerSummaryForm.tsx`(登録用)、`components/career-summary/AiGeneratePanel.tsx`(AI生成出力)。両者とも同一パターン。

### wrapper 方式による「カードを埋める＋リサイズ可能」の両立

textarea に直接 `flex-1` を付けるとリサイズ不能になるため、`flex-1` の wrapper div で textarea を包み、textarea 自体は `h-full w-full` とした。

- 初期表示: wrapper がカードの残り空間を埋め、textarea は `h-full` で wrapper を埋める → 余白なし(挙動1)
- 拡大: リサイズのドラッグはインラインスタイルの height で `h-full` を上書きする。wrapper の `min-height: auto` により wrapper→カード→グリッド行が内容分まで広がる(挙動2)
- 縮小: textarea は縮むが wrapper が高さを保つため外枠は縮まない(挙動3)

`rows` は 6(初期高さは「カードを埋める」で決まるため、rows は最低値の意味のみ)。

### 縮小開始時に外枠が一瞬広がる問題への対処

textarea はデフォルト `inline-block` のため、リサイズ開始でインライン height が設定された瞬間にベースライン整列の行ボックスが作られ、textarea の下に約6pxの隙間(ディセンダー分)が発生して外枠が一瞬広がって見えた。textarea に `block` を追加して解消。

### AI生成出力側の縮小で外枠ごと縮む問題への対処

AI 生成パネルはカード列の高さの基準(グリッド行の最大コンテンツ)のため、AI出力 textarea を縮小するとカードごと縮んでいた。両 wrapper に `min-h-[10.125rem]`(rows=6 相当 = 6行×24px + py-2 + border = 162px)を設定し、外枠の最小高さを初期表示サイズに固定した。これにより縦積みレイアウト(md未満)で登録用カードが縮む問題も解消。

最終形:

```jsx
<div className="min-h-[10.125rem] flex-1">
  <textarea rows={6} className="block h-full w-full rounded border px-3 py-2" ... />
</div>
```

## 検証

- `npm run verify` 全項目パス(ESLint / tsc / Vitest 376件)。
- Playwright でリサイズハンドルの実マウスドラッグにより、横並び(1280px)・縦積み(700px)の両レイアウトで確認:
  - 初期表示で textarea がカードを隙間なく埋める(登録用側の隙間 1px)
  - 縮小ドラッグ中も外枠の高さが1pxたりとも増減しない(修正前は開始直後に+6px、AI側は縮小で298px→218px)
  - 拡大ドラッグで左右カードとも追従(298px→398px)
