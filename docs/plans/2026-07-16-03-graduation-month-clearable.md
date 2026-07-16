# 卒業年月: クリア可能化・中退対応・初期値タイミング変更

## Context

基本情報登録(EDT001)の卒業年月フィールドで以下の問題が報告された:

1. **クリアできない**: ×ボタンで消しても即座に予測値が再挿入される
2. **中退に対応できない**: 卒業年月を空(なし)の状態にできない
3. **初期値のタイミング**: 予測値(生年月日からの大学卒業相当年月)がフィールドにフォーカスしただけで入る。カレンダーボタンをクリックした時にだけ入れてほしい

### 根本原因(調査済み)

`components/ui/DateField.tsx` の `DateFieldBase`:

- `onFocus`(L73-78)で「値が空なら `defaultWhenEmpty` を差し込む」実装になっている
- ×クリアボタン(L116-118)は `setNativeValue("")` の直後に `inputRef.current?.focus()` を呼ぶため、その focus で `onFocus` が発火し予測値が即再挿入される → 問題1・2のメカニズム
- 問題3は onFocus 差し込みそのものが原因

`defaultWhenEmpty` を使っているのは卒業年月(`components/basic-info/BasicInfoForm.tsx` L253)のみ。zod スキーマ(`lib/basic-info-schema.ts` L57-60 optional)・Server Action・Prisma スキーマ(nullable)はすべて空を許容済みで、修正は UI 層のみで完結する。

## 変更内容

### 1. `components/ui/DateField.tsx`

- `onFocus` での `defaultWhenEmpty` 差し込み(L73-78)を削除(`onFocus` の透過だけ残すか、ハンドラ自体を rest 継承に戻す)
- カレンダーボタンの `onClick`(L87-95)で、`showPicker()` の**前**に「値が空なら `defaultWhenEmpty` を差し込む」処理を移動:
  ```tsx
  onClick={() => {
    const input = inputRef.current;
    if (!input) return;
    if (defaultWhenEmpty && input.value === "") {
      setNativeValue(defaultWhenEmpty);
    }
    try {
      input.showPicker();
    } catch {
      input.focus();
    }
  }}
  ```
- コメント(L14-16, L25)を新仕様に合わせて更新:「空の状態でカレンダーボタンをクリックした瞬間の初期値」

効果:
- 問題3: 初期値はカレンダーボタンクリック時のみに
- 問題1: ×クリア後の focus で再挿入されなくなり、クリアが機能する
- 問題2: 空のまま保存でき、中退(卒業年月なし)を表現できる

### 影響範囲

`defaultWhenEmpty` を渡しているのは卒業年月のみなので、挙動が変わるのはこのフィールドだけ。`MonthField` の他の使用箇所(ProjectForm の期間)や `DateField`(生年月日・資格)には影響しない。

### 2. `docs/screens.md`(EDT001 卒業年月の行、L223)

現行仕様「空の状態でフォーカスすると…予想値を初期表示」を、
「空の状態で**カレンダーボタンをクリック**すると…予想値を初期表示する。×ボタンでクリア可能(中退等で卒業年月なしにできる)」に更新。
(記憶メモに従い、改訂経緯は書かず最終仕様+理由のみ)

## 検証

1. `npm run verify`(lint + tsc + vitest)
2. `/ui-check` 相当: Playwright で基本情報登録画面を開き、
   - 卒業年月が空の状態でフィールドをタップ/フォーカスしても値が入らないこと
   - カレンダーボタンをクリックすると予測値が入りピッカーが開くこと
   - ×ボタンでクリアでき、再挿入されないこと
   - 空のまま保存 → 卒業年月 null で保存されること(中退ケース)
3. ProjectForm の期間フィールドの挙動が変わっていないことを目視確認
4. `npm run dev` を起動したままにして手動確認できるようにする
