# 実行計画: EDT004(資格登録)

## Context

`docs/screens.md` EDT004(資格登録)を実装する。マイページ編集系(EDT001〜EDT004)のうち
EDT001〜EDT003は実装済みで、EDT004を実装すればこの系列が一通り揃う。`certification_category`/
`certification`/`employee_certification`が対象(docs/schema.md)。EDT003(スキル登録)と
「カテゴリ選択→マスタからサジェスト」という明細形式のUIパターンを共有するため、既存実装を
1対1でミラーする形で実装した。

## 設計判断

1. **保存semantics**: `employee_skill`と異なり`employee_certification`には複合ユニーク制約が
   ない(同一資格の再取得は更新ではなく新規レコード追加として扱う、というdocs/decisions.mdの
   方針)。ただしこれはEDT003が採用する「全削除→全createMany」の保存パターンと矛盾しない。
   画面に表示されている行の集合がそのまま保存後の状態になるだけなので、同じ資格を複数行
   登録すればそのまま複数レコードとして保存され、再取得の意味論も自然に満たされる。
2. **重複行チェックは行わない**: EDT003の`findDuplicateRowKey`(同一スキル+バージョンの重複行を
   弾く仕組み)は資格には適用しない。再取得(同一資格の複数回登録)を許容するため。
3. **認定団体は表示専用**: 選択された`certification.certificationOrganization`をクライアント側で
   読み取り専用表示するのみで、送信データには含めない(DBには保存しない、資格マスタ側の値を
   都度参照する設計)。
4. **日付の相関バリデーション**: 取得年月日は本日以前、有効期限(任意)は取得年月日より後、を
   zodの`.check()`(オブジェクトレベルの相関チェック)で実装。`lib/date-format.ts`の
   `parseDateOnly`を用いてUTC日付として比較する。

## 実装内容

- `lib/certification-options.ts`(新規) + テスト: `getCertificationOptions()`でカテゴリ/資格
  (`deletedAt: null`)を取得。`validateCertificationRowsAgainstMaster()`でカテゴリ実在・資格実在・
  親子関係をサーバー側で再検証
- `lib/certification-schema.ts`(新規) + テスト: 1行分のzodスキーマ
  (`certificationCategoryId`/`certificationId`/`acquiredDate`/`expirationDate?`)。
  `items.<index>.<field>`形式のFormDataから可変長行を復元する`parseCertificationRowsForm()`。
  日付の相関バリデーションを含む
- `components/certifications/CertificationRow.tsx`(新規, client): カテゴリ`<select>`→
  資格名`<input list>`(カテゴリでフィルタ)→認定団体(自動表示・読み取り専用)→
  取得年月日/有効期限(`<input type="date">`)→削除ボタン
- `components/certifications/CertificationRowsForm.tsx`(新規, client): EDT003の
  `SkillRowsForm.tsx`と同じ行管理・`useActionState`・remount処理
- `app/(authenticated)/certifications/page.tsx`(新規): 認可は`skills/page.tsx`と同パターン
  (未認証→`/login`、HR_SALES→`/`、`resolveDestination`で未登録者を`/register`へ)
- `app/(authenticated)/certifications/actions.ts`(新規): `saveCertifications(prevState, formData)`。
  認可→パース→マスタ再検証→`prisma.$transaction`で対象社員の
  `employeeCertification.deleteMany`→`createMany`→`redirect("/mypage")`
- `lib/breadcrumbs.ts`(変更): `"/certifications": { label: "資格登録", parentPath: "/mypage" }`追加
- `components/mypage/MyPageTiles.tsx` / `app/(authenticated)/mypage/page.tsx`(変更):
  `certifications`タイルに`href="/certifications"`と件数バッジを設定
- `prisma/seed.ts`(変更): 開発確認用に`certification_category`(IT系/語学系)、`certification`
  (基本情報技術者試験/AWS認定ソリューションアーキテクト/TOEIC)を追加

## 検証方法

- `npm run verify`
- Playwright(開発用ログイン`000002`)で以下を確認する:
  1. マイページの「資格」タイルが件数バッジ付きでリンク可能になっている
  2. カテゴリ選択→資格名サジェスト→認定団体の自動表示が機能する
  3. 未来日の取得年月日、取得年月日以前の有効期限がそれぞれエラー表示される
  4. 保存後`/mypage`へ遷移し、タイルの件数が更新される
  5. 再訪問で保存済みの行が初期表示される
  6. 同一資格を複数行(再取得)登録しても保存できる
  7. 行を削除して保存するとDB上からも消えている

## Critical Files

- `lib/certification-options.ts`, `lib/certification-schema.ts`
- `app/(authenticated)/certifications/{page.tsx,actions.ts}`
- `components/certifications/*`
- `components/mypage/MyPageTiles.tsx`, `app/(authenticated)/mypage/page.tsx`
- `lib/breadcrumbs.ts`
- `prisma/seed.ts`

---

## 実装結果(実施済み)

上記プラン通りに実装した。開発DBへの資格マスタ投入は、既存employee/user行を壊さないよう
`prisma/seed.ts`とは別に一時スクリプトで追加実行した(`prisma/seed.ts`自体は新規インストール時に
まとめて投入されるよう更新済み)。

### 検証結果

`npm run verify`(lint・tsc・vitest 76件)が通過。Playwrightで開発用ログイン(`000002`)を使い、
以下をすべて確認した。

1. 資格0件時、マイページの「資格」タイルが「0件」、`/certifications`が空状態表示になっている
2. カテゴリ(IT系)選択→資格名サジェスト(`<datalist>`)→認定団体「IPA」が自動表示される。
   カテゴリ未選択時は資格名欄が無効化される
3. 取得年月日に`2999-01-01`(未来日)を入力して保存→
   「取得年月日は本日以前の日付を入力してください。」がエラー表示され保存されない
4. 取得年月日`2020-01-01`・有効期限`2019-01-01`(取得年月日以前)で保存→
   「有効期限は取得年月日より後の日付を入力してください。」がエラー表示され保存されない
5. 取得年月日`2020-01-01`・有効期限`2025-01-01`で保存→`/mypage`へ遷移し「資格 1件」に更新される
6. `/certifications`再訪問で保存済みの行(カテゴリ・資格名・認定団体・両日付)が正しく初期表示される
7. 同一資格(基本情報技術者試験)を取得年月日`2023-06-01`で2行目として追加保存→
   「資格 2件」に更新され、再取得が新規レコードとして保存されることを確認
8. 2行目を削除して保存→「資格 1件」に戻る
9. コンソールエラー・警告なし

未認証時の`/login`リダイレクト・人事・営業ロールでの`/`リダイレクトは、EDT002/EDT003確認時に
同一の`resolveDestination`パターンで検証済みのため、EDT004では個別確認を省略した。
