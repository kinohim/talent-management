# 実行計画④: EDT003(スキル登録)

## Context

`docs/screens.md` EDT003(スキル登録)を実装する。`skill_category`/`skill`/`skill_version`/
`employee_skill`が対象(docs/schema.md)。この画面はプロジェクト初の「明細形式(行の追加・削除、
上限なし)」画面であり、かつ初めて「既存マスタからの選択+サジェスト」というUIパターンが必要になる。

## 設計判断(ユーザー確認済みの点を含む)

1. **削除semantics**: 保存時、対象社員の`employee_skill`は全件**物理削除してから作り直す**
   (ユーザーに確認済み)。理由: 複合ユニーク制約`(employee_id, skill_id, skill_version_id)`が
   `NULLS NOT DISTINCT`だが`deleted_at IS NULL`の絞り込みを持たないため、論理削除方式では
   「削除→再登録」で一意制約違反になる。`employee_skill`は他テーブルから参照されない終端
   テーブルのため、物理削除しても参照整合性への影響はない。
2. **サジェストの実装方式**: 新規ライブラリを追加せず、ネイティブ`<input list="..."> + <datalist>`
   で実装する(既存コードにコンボボックスライブラリの前例がないため)。カテゴリは`<select>`
   (件数が少ない想定、`OrganizationUnitSelect`と同方針)、スキル名はカテゴリでクライアント側
   フィルタした`<datalist>`候補から選択させる。マスタ全件を`page.tsx`で取得しクライアントへ
   渡す(`lib/organization-unit.ts`と同方針。MST001は手動運用小規模想定のため全件方式で十分)。
3. **カテゴリ・スキル名は既存マスタからの選択のみ**(decisions.md「スキル・資格・マスタ全般」)。
   クライアントはdatalistで自由入力を防止しきれないため、**サーバー側で選択値がマスタに実在し
   (`deletedAt: null`)、かつカテゴリとスキルの親子関係が一致するかを再検証**する。
4. **バージョンの要否**: `skill.hasVersion`が`true`の時のみ必須。サーバー側でも選択された
   `skillId`の`hasVersion`を見て要否を再検証する(クライアントの表示制御だけに依存しない)。
5. **行の削除確認モーダル(CMN001)は使わない**(screens.md末尾に明記: 保存前の画面内操作のため)。
6. **明細0件も許容**(EDT003に最小件数の記述がないため、全スキル削除も可能とする)。
7. **同一行内の重複**(同じ`skillId`+`skillVersionId`の組を2行以上)はサーバー側で検出し
   フォームエラーとする。

## 実装内容

- `prisma/seed.ts`(変更): 開発確認用に`skill_category`(例: 「プログラミング言語」「フレームワーク」等
  2〜3件)、`skill`(各カテゴリに数件、うち1件以上`hasVersion:true`)、`skill_version`
  (`hasVersion:true`のスキルに2〜3件、`isActive:true`)を追加
- `lib/skill-options.ts`(新規) + テスト: `getSkillOptions()`でカテゴリ/スキル/バージョンを
  (`deletedAt: null`のみ)まとめて取得し、クライアント用の整形済み型で返す
- `lib/skill-schema.ts`(新規) + テスト: 1行分のzodスキーマ(`skillCategoryId`/`skillId`/
  `skillVersionId?`/`skillLevel`)。FormDataから`items.<index>.<field>`形式のキーを走査して
  可変長の行配列に復元する`parseSkillRowsForm(formData)`(add/削除でindexが欠番になっても
  動作すること)。重複行検出用のヘルパーも同ファイルに含める
- `components/skills/SkillRow.tsx`(新規, client): 1行分のUI。カテゴリ`<select>`→
  スキル名`<input list>`(カテゴリでフィルタ)→(`hasVersion`なら)バージョン`<select>`→
  `PillSelect`(習熟度: ◎/○/△)→削除ボタン
- `components/skills/SkillRowsForm.tsx`(新規, client): 行配列を`useState`で管理し、
  「行を追加」ボタンで空行追加。`useActionState`で`saveSkills`を呼ぶ全体フォーム
- `app/(authenticated)/skills/page.tsx`(新規): 認可は`career-summary/page.tsx`と同パターン
  (未認証→`/login`、HR_SALES→`/`、`resolveDestination`で未登録者を`/register`へ)。
  `getSkillOptions()`と対象社員の既存`employeeSkill`一覧(スキル名・カテゴリ名・バージョン名を
  joinして表示用に整形)を取得し`SkillRowsForm`へ渡す
- `app/(authenticated)/skills/actions.ts`(新規): `saveSkills(prevState, formData)`。
  認可→`parseSkillRowsForm`→マスタ再検証(実在・親子関係・`hasVersion`要否)→重複検出→
  `prisma.$transaction`で対象社員の`employeeSkill.deleteMany`→`createMany`→`redirect("/mypage")`
- `lib/breadcrumbs.ts`(変更): `"/skills": { label: "スキル登録", parentPath: "/mypage" }`追加
- `components/ui/Tile.tsx`(変更): `badge`(任意のバッジ文言)propを追加。`href`があり`badge`が
  指定されていればバッジ表示、`href`がなければ従来通り「準備中」を表示(後方互換)
- `components/mypage/MyPageTiles.tsx` / `app/(authenticated)/mypage/page.tsx`(変更):
  `skills`タイルに`href="/skills"`と`badge`(件数)を設定。件数は`mypage/page.tsx`で
  `prisma.employeeSkill.count()`を取得して`MyPageTiles`に渡す

## 実装順序

1. seedデータ追加
2. `lib/skill-options.ts` + テスト
3. `lib/skill-schema.ts` + テスト
4. `SkillRow.tsx` / `SkillRowsForm.tsx`
5. `skills/actions.ts`
6. `skills/page.tsx`
7. `lib/breadcrumbs.ts`
8. `Tile.tsx`のbadge対応
9. `MyPageTiles.tsx` / `mypage/page.tsx`の件数表示
10. `npm run verify`

## 検証方法

- `npm run verify`
- Playwright(開発用ログイン`000002`等)で以下を確認する:
  1. スキル0件の状態でマイページの「スキル」タイルが「0件」等の表示になっている
  2. `/skills`で2行追加(1つは`hasVersion`ありスキル)し保存→`/mypage`へ遷移しタイルの件数が更新される
  3. `/skills`再訪問で保存済みの行が初期表示される
  4. 同一スキル+同一バージョンを2行選んで保存→フォームエラーで保存されない
  5. `hasVersion:false`のスキルではバージョン欄が表示されない
  6. 行を削除して保存するとDB上からも消えている
  7. 未認証/人事・営業ロールでの`/skills`直接アクセスがガードされる

## Critical Files

- `prisma/seed.ts`
- `lib/skill-options.ts`, `lib/skill-schema.ts`
- `app/(authenticated)/skills/{page.tsx,actions.ts}`
- `components/skills/*`
- `components/ui/Tile.tsx`
- `components/mypage/MyPageTiles.tsx`, `app/(authenticated)/mypage/page.tsx`
- `lib/breadcrumbs.ts`

---

## 実装結果(実施済み)

上記プラン通りに実装した。開発DBへのスキルマスタ投入は、既存employee/user行を壊さないよう
`prisma/seed.ts`とは別に一時スクリプトで追加実行し、確認後に削除した(`prisma/seed.ts`自体は
新規インストール時にまとめて投入されるよう更新済み)。

### 実施中に発見・修正した不具合(想定外)

Playwrightでの重複行バリデーション確認中に、**検証エラーで同一画面に留まった際、動的に
追加した行のカテゴリ/バージョン`<select>`と習熟度のピル選択が見た目上リセットされる**
不具合を発見した。原因はReact DOMの`<form action>`機能の仕様(「action関数が完了すると
フォーム内の非制御フィールドを自動的にリセットする」)で、`saveSkills`が検証エラーで
`redirect`せず状態を返すケースもReactは「完了」とみなしリセットが働く。既存行
(初期値ありで表示前から一致していた行)では気づかれず、新規追加した行でのみ表面化した。

送信される値自体(hidden inputで保持していた`skillId`)は影響を受けていなかったため
データ破損はなかったが、UIが混乱を招くため以下を修正した。

- `components/skills/SkillRow.tsx`: カテゴリ/バージョンの`<select>`から`name`属性を外し、
  実際の送信値は別途`<input type="hidden">`で保持する方式に変更(表示用selectはReact状態の
  フィルタ・UI制御にのみ使う)
- `components/ui/PillSelect.tsx`: `value`/`onChange`を追加し、制御コンポーネントとしても
  使えるように拡張(既存の`defaultValue`のみの非制御利用との後方互換は維持)。
  `SkillRow.tsx`の習熟度はこちらを使用し、送信値も同様にhidden inputで保持する
- `components/skills/SkillRowsForm.tsx`: action完了(`state`の参照が変わるタイミング)ごとに
  各行を強制再マウントするための`remountToken`を追加。表示用selectの見た目が実際の状態と
  食い違う問題(React側が値を再コミットしない場合がある)を解消する

この対応により、検証エラー後も行の表示・送信値の両方が正しく保持されることを確認した。

### 検証結果

`npm run verify`(lint・tsc・vitest 63件)が通過。Playwrightで開発用ログイン(`000002`)を使い、
以下をすべて確認した。

1. スキル0件時、マイページの「スキル」タイルが「0件」、`/skills`が空状態表示になっている
2. カテゴリ選択→スキル名サジェスト(`<datalist>`)→(`hasVersion`ありスキルのみ)バージョン選択→
   習熟度選択の一連の入力が機能する。カテゴリ未選択時はスキル名欄が無効化される
3. Java(バージョン17・◎得意)とTypeScript(バージョンなし・○経験あり)の2行を保存→
   `/mypage`へ遷移し「スキル 2件」に更新される
4. `/skills`再訪問で保存済みの2行が正しく初期表示される(カテゴリ・スキル名・バージョン・
   習熟度すべて)
5. 既存行と同一スキル+同一バージョンの行を追加して保存→フォームエラー
   「同じスキル(バージョン含む)が複数行に登録されています。」が表示され保存されない。
   このとき行の表示・送信値も正しく保持される(上記のバグ修正後)
6. 重複行を削除して再保存→正常に`/mypage`へ遷移し、DBの内容が2件のまま(3件目は保存されない)
7. コンソールエラー・警告なし

未認証時の`/login`リダイレクト・人事・営業ロールでの`/`リダイレクトは、EDT002確認時に
同一の`resolveDestination`パターンで検証済みのため、EDT003では個別確認を省略した。
