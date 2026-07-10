# 実行計画: EDT005(プロジェクト経歴登録) + REF006(プロジェクト経歴一覧)

## Context

EDT001〜EDT004(基本情報・経歴概要自己PR・スキル・資格)の実装が完了し、マイページ編集系の最後のピースとしてEDT005(プロジェクト経歴登録)が残っていた。`docs/screen-flow.md`ではマイページ→REF006(一覧)→EDT005(登録・編集)という導線であり、REF006はEDT005への入口としての薄い一覧画面のため、両方をセットで実装した。

現場マスタ(MST005)・現場ポジションマスタ(MST003)の管理画面は未実装だが、EDT003(スキル登録)・EDT004(資格登録)がMST001/MST002未実装のままマスタをseedデータのみで先行実装した前例を踏襲し、Site/ProjectRoleは`prisma/seed.ts`にサンプルデータを追加するだけで進めた(ユーザー承認済み)。

EDT005はEDT003/004と異なり「1プロジェクト=1レコードの単票フォーム」であり、本リポジトリで初めて次の3つを実装した:
- 動的ルート(`/projects/[id]`)による個別レコードの編集
- 複数の関連テーブル(project本体・project_role_link・project_detail・project_skill)を1つのフォームで同時に保存する構成
- CMN001(削除確認モーダル)の共通コンポーネント化

## 設計判断

1. **保存方式**: `project`本体はcreate/update(新規時create、編集時id+employeeId条件でupdate)。子テーブル(`project_role_link`・`project_skill`)はEDT003/004と同じ「全削除→createMany」の全置換、`project_detail`は1対1なのでupsert。すべて`prisma.$transaction(async (tx) => {...})`のインタラクティブ形式でまとめる(配列形式では対応できないため)。
2. **経験年数の再計算**: `lib/experience-years.ts`に`recalculateExperienceYears(tx, employeeId)`を実装。対象社員の`deletedAt: null`な`project`を全件取得→区間`[startDate, endDate ?? 今日]`を月数に変換→区間をマージ(和集合)→合計月数を12で除した整数部を`employee.experienceYears`に反映。保存・削除のトランザクション内、他の変更が確定した後に呼ぶ。
3. **削除は論理削除+カスケード**: `docs/schema.md`一般ルール「親レコードを論理削除する場合、従属する子レコードも同一トランザクションで論理削除する」に従い、`project`・`projectDetail`・`projectSkill`・`projectRoleLink`の`deletedAt`等を同一トランザクションで更新し、その後`recalculateExperienceYears`を呼ぶ。
4. **認可**: EDT003/004と同じ「HR_SALESは`/login`へ防御的リダイレクト」パターンに加え、EDT005は個別レコード操作のため、取得・更新・削除のすべてで`where: { id, employeeId: session.user.employeeId }`を必須にし、他人のプロジェクトを操作できないようにする。存在しない/他人のIDの場合は`/projects`へリダイレクト。
5. **CMN001(削除確認モーダル)**: `components/ui/ConfirmDialog.tsx`を新規作成。`message`・`confirmLabel`・`onConfirm`・`onCancel`・`isPending`を受け取る汎用モーダル(将来MST系・EDT007からも使う想定だが、今回はEDT005呼び出し分のみ実装)。デフォルトの論理削除実行は呼び出し元(EDT005側)が担う。
6. **役割・担当工程の複数選択UI**: 役割は`components/ui/PillMultiSelect.tsx`(新規、`PillSelect`の複数選択版)。チェックボックスに共通の`name`を持たせ、`formData.getAll(name)`で取得する。担当工程は7項目とも別々のフィールド名を持つ単純な真偽値のため、`PillMultiSelect`は使わず`ProjectForm.tsx`内で個別チェックボックスとして実装した。
7. **使用スキルのタグ入力(ユーザーフィードバックにより改訂)**: 当初はカテゴリ選択を省いた簡易版で実装したが、「スキル登録画面(EDT003)と同じ内容(習熟度は除く)で登録したい」との指摘を受け、`components/projects/ProjectSkillRow.tsx`をEDT003の`SkillRow`と同一の入力形式(カテゴリ選択→スキル名サジェスト(カテゴリで絞込み)→バージョン選択、習熟度のみ除く)に修正した。`lib/project-schema.ts`の行スキーマに`skillCategoryId`を追加し、`lib/project-options.ts`の`validateProjectSkillsAgainstMaster`でカテゴリ実在・親子関係もサーバー側で再検証する。行の追加・削除はProjectForm内のローカルstateで管理する(EDT003のような独立ページではなく、フォーム内の一部)。`project_skill`の複合ユニーク制約に合わせ、同一スキル+同一バージョンの重複行検出(`findDuplicateProjectSkillRowKey`)も実装。
8. **開始/終了年月**: `<input type="month">` + 「現在」チェックボックスで終了年月入力を無効化(disabled)する、コードベース初のインタラクション。`lib/date-format.ts`の`parseYearMonth`/`toMonthInputValue`をそのまま流用(コメントの卒業年月限定の記述は汎用的な説明に更新した)。終了年月を入力する場合は開始年月以降であることをサーバー側でも検証する(仕様に明記はないが、経験年数計算の整合性を守るための最小限の実装判断)。
9. **パンくず**: 動的ルート`/projects/[id]`は`lib/breadcrumbs.ts`の従来の「pathname完全一致」方式では解決できないため、`getBreadcrumbTrail`にパス中の数値セグメントを`[id]`に正規化してからマップ照合する処理を追加し、`BREADCRUMB_MAP`に`/projects`・`/projects/new`・`/projects/[id]`を追加した(ancestorのpathは正規化不要な静的パスのみを使うため、既存の`parentPath`チェーンはそのまま機能する)。
10. **業務詳細の項目名(ユーザーフィードバックにより改訂)**: 当初「業務詳細（概要）」としていたが、「詳細なのか概要なのか矛盾している」との指摘を受け「業務詳細」に修正した(`docs/screens.md`・画面ラベル・バリデーションメッセージの3箇所)。

## 実装ファイル

### 新規
- `lib/project-options.ts` + テスト: `getProjectOptions()`(site・project_roleを`deletedAt: null`で取得)、`validateProjectFormAgainstMaster()`(siteId・roleIds存在チェック)、`validateProjectSkillsAgainstMaster()`(カテゴリ・スキル・バージョンの整合性チェック)
- `lib/project-schema.ts` + テスト: プロジェクト全体のzodスキーマ。`parseProjectForm(formData)`でスカラー・`roleIds`(`getAll`)・`skills.<index>.*`形式のスキル行(カテゴリ含む)をまとめて解析。終了年月の順序チェック・スキル重複チェックを含む
- `lib/experience-years.ts` + テスト: `recalculateExperienceYears(tx, employeeId)`(区間マージのロジックは純粋関数`sumUnionMonths`/`calculateExperienceYears`として切り出しテスト容易にした)
- `components/ui/PillMultiSelect.tsx`: チェックボックスによる複数選択ピル(役割用)
- `components/ui/ConfirmDialog.tsx`: CMN001削除確認モーダル
- `components/projects/ProjectSkillRow.tsx`: カテゴリ→スキル名→バージョンの明細行(EDT003と同一形式)
- `components/projects/ProjectForm.tsx`(client): 単票フォーム全体。新規・編集どちらの画面でも共通利用(`projectId`の有無で分岐)。編集時のみ削除ボタン→`ConfirmDialog`表示。全フィールドをcontrolled stateで保持し、action完了ごとに再マウントする(下記「実装結果」参照)
- `app/(authenticated)/projects/page.tsx`(REF006): 本人の`project`一覧(`deletedAt: null`、`orderBy: startDate desc`)。期間・現場名・役割を表示。「新規追加」→`/projects/new`、各行の編集→`/projects/[id]`
- `app/(authenticated)/projects/new/page.tsx`(EDT005新規): options取得のみ、`ProjectForm`に初期値なしで渡す
- `app/(authenticated)/projects/[id]/page.tsx`(EDT005編集): `id`+`employeeId`で対象取得(`projectDetail`・`projectRoleLinks`・`projectSkills`をinclude)。見つからなければ`/projects`へ`redirect`
- `app/(authenticated)/projects/actions.ts`: `saveProject(prevState, formData)`(新規/編集共通、`projectId`はhidden inputで渡す)、`deleteProject(projectId)`

### 変更
- `lib/date-format.ts`: コメントを汎用化(卒業年月限定の記述を削除)
- `lib/breadcrumbs.ts` + テスト: 動的セグメント正規化、`/projects`系3エントリ追加
- `components/mypage/MyPageTiles.tsx` / `app/(authenticated)/mypage/page.tsx`: `projects`タイルに`href="/projects"`と件数バッジ(`prisma.project.count()`)を設定
- `prisma/seed.ts`: 開発確認用の`site`(2件)・`project_role`(SE/PG/リーダー)を追加
- `docs/screens.md`: EDT005の「使用スキル」「業務詳細」の記述を実装内容に合わせて更新

## 検証方法

- `npm run verify`
- Playwright(開発用ログイン`000002`)で以下を確認する:
  1. マイページの「プロジェクト経歴」タイルが件数バッジ付きでリンク可能になり、`/projects`へ遷移する
  2. `/projects`が空状態表示、「新規追加」→`/projects/new`
  3. 現場名選択、役割複数選択(1つ未満はエラー)、開始年月必須、終了年月+現在チェックの排他動作、担当工程・使用スキル(カテゴリ→スキル名→バージョンあり/なし双方)を入力し保存→`/projects`へ遷移し一覧に反映、マイページの件数バッジも更新
  4. 一覧から編集画面(`/projects/[id]`)を開き、保存済み内容が全項目正しく初期表示される
  5. 同一スキル+同一バージョンを2行登録するとフォームエラーになる
  6. 削除ボタン→`ConfirmDialog`表示→実行で論理削除され、一覧・件数バッジから消える
  7. 複数プロジェクト(重複期間あり)を登録し、`employee.experienceYears`が和集合方式で正しく再計算される
  8. 他人の`id`で`/projects/[id]`に直接アクセスすると`/projects`へリダイレクトされる
  9. パンくず・戻る導線が`/projects`・`/projects/new`・`/projects/[id]`で正しく表示される
  10. コンソールエラーなし

## Critical Files

- `lib/project-options.ts`, `lib/project-schema.ts`, `lib/experience-years.ts`
- `app/(authenticated)/projects/{page.tsx,new/page.tsx,[id]/page.tsx,actions.ts}`
- `components/projects/*`
- `components/ui/{PillMultiSelect,ConfirmDialog}.tsx`
- `lib/breadcrumbs.ts`, `lib/date-format.ts`
- `components/mypage/MyPageTiles.tsx`, `app/(authenticated)/mypage/page.tsx`
- `prisma/seed.ts`

---

## 実装結果(実施済み)

上記プラン通りに実装した。開発DBへのsite/project_role投入は、既存データを壊さないよう`prisma/seed.ts`とは別に一時スクリプトで追加実行した(`prisma/seed.ts`自体は新規インストール時にまとめて投入されるよう更新済み)。

### 実施中に発見・修正した不具合(想定外)

Playwrightでの検証エラー確認中、**プロジェクトタイトル・開始/終了年月・役割・担当工程といった全フィールドが、検証エラーで同一画面に留まった際にReact DOMのフォームaction機能の自動リセットで失われる**不具合を発見した。EDT003で見つかったのと同種の問題だが、EDT005は単票フォームでフィールド数が多く影響範囲が画面全体に及んでいた。

調査の結果、`checked`/`value`をReact stateで制御する(controlled)だけでは不十分で、React DOMのフォームaction機能によるDOM側の暗黙リセットとReactの再コミット処理が競合し、特にチェックボックスの`checked`状態が視覚的に復元されないケースを実機で確認した。EDT003の`SkillRowsForm.tsx`と同じ「action完了ごとに全項目を再マウントする(`remountToken`)」対応を追加することで解消した(値自体はReact stateに保持されたまま残るため、再マウントしてもデータは失われない)。

### ユーザーフィードバックによる改訂

初回実装完了後、以下2点のフィードバックを受けて修正した:

1. 使用スキルの入力を、EDT003(スキル登録)と同じ「カテゴリ選択→スキル名サジェスト→バージョン選択」の形式に変更(習熟度のみ除く)。当初はカテゴリ選択を省いた簡易版だった
2. 「業務詳細（概要）」という項目名が「詳細か概要か矛盾している」との指摘を受け、「業務詳細」に修正

### 検証結果

`npm run verify`(lint・tsc・vitest 111件)が通過。Playwrightで開発用ログイン(`000002`)を使い、以下をすべて確認した。

1. プロジェクト0件時、マイページの「プロジェクト経歴」タイルが「0件」、`/projects`が空状態表示になっている
2. 現場名サジェスト、役割複数選択(必須)、開始年月必須、終了年月+「現在」チェックの排他動作(チェック時はdisabled)が機能する
3. カテゴリ選択→スキル名サジェスト(カテゴリで絞込み)→バージョン選択(hasVersionのスキルのみ)の一連の入力が機能する
4. 必須項目欠落(現場名・タイトル・開始年月・役割)がそれぞれエラー表示され保存されない
5. 終了年月が開始年月より前だとエラー表示され保存されない。「現在」チェック時はこのバリデーションが働かない
6. 同一スキル+同一バージョンの重複行を登録すると「同じスキル(バージョン含む)が複数行に登録されています。」がエラー表示され保存されない
7. 保存→`/projects`へ遷移し一覧に反映、マイページの件数バッジも更新される
8. 編集画面再訪問で保存済みの内容(現場名・役割・担当工程・使用スキルのカテゴリ含む全項目)が正しく初期表示される
9. 削除ボタン→`ConfirmDialog`(CMN001)表示→実行で論理削除され、子テーブル(`project_detail`・`project_skill`・`project_role_link`)も同一トランザクションでカスケード論理削除される
10. 重複期間のあるプロジェクトを複数登録し、`employee.experienceYears`が和集合方式(重複月を1回のみ数える)で正しく再計算されることをDB直接確認した
11. 削除後は`employee.experienceYears`も再計算され0に戻る
12. 他社員(`000001`)のプロジェクトIDへ`000002`としてログインした状態で直接アクセスすると`/projects`へリダイレクトされる(認可ガード)
13. パンくず・戻る導線が`/projects`・`/projects/new`・`/projects/[id]`(動的セグメント正規化)で正しく表示される
14. コンソールエラー・警告なし(修正前に発生していたホットリロード由来の一時的なエラーは修正後に再発しないことを確認)
