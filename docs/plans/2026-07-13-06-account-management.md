# 実行計画: アカウント管理系(REF007/EDT006/EDT007)

## Context

マスタ管理系5画面(MST001〜005)完了に続き、合意した実装順序に従いアカウント管理系(REF007アカウント一覧 → EDT006新規アカウント登録 → EDT007アカウント編集)を実装した。3画面は`Employee`(所属・氏名・在籍状態)と`User`(メール・権限・最終ログイン)の1対1ペアを管理職が閲覧・作成・編集する一連の機能。

### 発見した仕様の矛盾と対応(ユーザー確認済み)

`docs/screens.md`のREF007詳細節(148行目)に「一般社員ロールの場合は、所属組織フィルタに自身のロールが自動設定され…」という一般社員のアクセスを前提にした文言があったが、画面一覧表ではREF007のロールは「管理職」のみであり、README.mdのロール定義(アカウント管理は管理職のみ)とも矛盾していた。文言自体がREF002(経歴書一覧)の実際の仕様とほぼ同一で、コピペ由来の誤記と判断。ユーザー確認の結果、**REF007は管理職専用(一般社員はアクセス不可)として実装**し、`docs/screens.md`の誤記も修正した。

### 最終ログインの配線(ユーザー確認済み)

`User.lastLoginAt`はスキーマに存在したが現状どこからも更新されておらず常に`null`だった。今回`lib/auth.ts`のsignInイベントでログイン成功のたびに更新するよう配線した。

## 実装ファイル

### 新規
- `app/(authenticated)/accounts/page.tsx`(REF007)・`new/page.tsx`(EDT006)・`[employeeId]/page.tsx`(EDT007)・`actions.ts`(`createAccount`・`updateAccount`・`retireAccount`・`reinstateAccount`)
- `components/accounts/AccountFilterForm.tsx`: 氏名検索+所属組織ツリー+権限/状態Pillを内包するフィルタフォーム。`router.push`でURLの`searchParams`を更新し、Server Component側がそのままDBクエリのwhere条件に変換する
- `components/accounts/OrganizationUnitTreeFilter.tsx`: 所属組織フィルタ用の階層インデント付きチェックボックス
- `components/accounts/AccountTable.tsx`: 一覧表示(Server Component)
- `components/accounts/NewAccountForm.tsx`(EDT006)・`EditAccountForm.tsx`(EDT007+退職処理/現職に戻す)
- `lib/account-schema.ts` + テスト: 社員ID(6桁)・メール・権限のzodバリデーション
- `lib/account-list.ts` + テスト: `deriveAccountStatus`(状態の優先順位判定)、`parseAccountFilters`(searchParamsパース)

### 変更
- `lib/organization-unit-tree.ts` + テスト: `collectDescendantIds`追加(所属組織フィルタで上位選択時に配下を含めるため)
- `lib/date-format.ts` + テスト: `toDisplayDateTime`追加(最終ログイン表示用、既存の日付のみのフォーマッタと異なり時刻・ローカルタイムゾーン)
- `components/home/HomeTiles.tsx`: `account-list`タイルに`href: "/accounts"`
- `lib/breadcrumbs.ts`: `/accounts`・`/accounts/new`・`/accounts/[id]`エントリ追加
- `lib/auth.ts`: signInイベントで`lastLoginAt`を更新
- `docs/screens.md`: REF007の誤記修正(管理職専用である旨を明記)、状態判定の優先順位を明記
- `docs/decisions.md`: `lastLoginAt`配線について設計判断を追記

## 設計判断

1. **状態の優先順位**: 「初回未登録/在籍中/退職」の3条件は文字通りには排他的でないため、退職を最優先(`employment_status=2`なら常に「退職」)、次に初回未登録、それ以外を在籍中と判定する。
2. **所属組織フィルタの階層展開**: 選択した組織単位とその配下すべてを検索対象に含める(`collectDescendantIds`)。
3. **退職処理/現職に戻すは同一画面に留まる**: `redirect`せず`revalidatePath`でEDT007編集画面自体を再描画し、ボタンの表示切替(退職済みなら「現職に戻す」のみ表示等)をその場で反映する。EDT007の「保存後REF007へ戻る」ルールは所属・権限の主保存ボタンにのみ適用する。
4. **社員ID・メール重複の個別エラー**: `Employee.create`と`User.create`を順に個別にtry/catchし、どちらのユニーク制約違反かで「この社員IDは既に使用されています。」/「このメールアドレスは既に使用されています。」を区別する。

## バグ修正: `resolveOrganizationUnitId`が下位階層未選択時に上位の所属を保存できない(EDT001にも波及)

EDT007の動作確認中に、事業部のみ選択して保存すると所属が保存されない(`organizationUnitId`が`null`のまま)不具合を発見した。原因は`lib/organization-unit.ts`の`resolveOrganizationUnitId`が`selection.groupId ?? selection.departmentId ?? selection.divisionId`という`??`(nullish coalescing)判定をしていたこと。`OrganizationUnitSelect`コンポーネントは上位階層を選択すると下位階層の`<select>`が有効化される(が値は「なし」=空文字のまま)ため、FormDataには下位階層のキーが**空文字として存在**する。`??`は空文字を「値がある」とみなして通過させてしまうため、事業部のみ選択時に部署select(空文字)がgroupId未選択("")より先に採用され、結局空文字が最終的なleafIdStrになりnullが返っていた。

この問題は同じ`resolveOrganizationUnitId`を使う**EDT001(基本情報登録)にも既存の不具合として存在していた**(Gr/部署まで選ばず事業部だけ選択するケースで発生)。`??`を`||`に変更して修正し、この空文字混入パターンを再現する回帰テストを`lib/organization-unit.test.ts`に追加した。

## 検証方法

- `npm run verify`
- Playwright(開発用ログイン)で以下を確認:
  1. 管理職でトップ→アカウント一覧タイル→REF007が表示され、一般社員では`/accounts`直接アクセス・タイル非表示ともにトップへリダイレクトされる
  2. 氏名検索・所属組織フィルタ(配下含む)・権限フィルタ・状態フィルタがそれぞれ一覧を正しく絞り込む
  3. EDT006で新規アカウント(社員ID・メール・所属・権限)を登録できる。社員ID重複・メール重複それぞれで専用エラーが表示される
  4. 管理職としてログインし、REF007の「最終ログイン」列に自分の直近ログイン日時が表示されることを確認
  5. EDT007で所属(事業部のみ選択のケースを含む)・権限を変更して保存するとREF007に戻り、変更が反映されている
  6. EDT007で退職処理→現職に戻すボタンに切り替わる。現職に戻す→退職処理ボタンに戻る。それぞれCMN001の確認ダイアログが専用文言で表示される
  7. 検証用に作成したアカウントは後片付けする

## Critical Files

- `app/(authenticated)/accounts/page.tsx`, `new/page.tsx`, `[employeeId]/page.tsx`, `actions.ts`
- `components/accounts/*`
- `lib/account-list.ts`, `lib/account-schema.ts`, `lib/organization-unit-tree.ts`
- `lib/auth.ts`
- `lib/organization-unit.ts`(バグ修正箇所)

---

## 実装結果(実施済み)

上記プラン通りに実装した。仕様(docs/screens.md)との差異はなし。動作確認の過程で`resolveOrganizationUnitId`のバグを発見・修正した(EDT001にも波及する既存不具合)。

### 検証結果

`npm run verify`(lint・tsc・vitest 244件)が通過。Playwrightで以下をすべて確認した。

1. トップ→アカウント一覧タイル→REF007のパンくず・戻る導線が正しく機能した
2. 状態フィルタ(初回未登録)・所属組織フィルタ(システム事業部/営業事業部の配下展開)がそれぞれ一覧を正しく絞り込んだ
3. 新規アカウント(社員ID`000099`)を登録でき、社員ID重複・メール重複それぞれで専用エラーが表示された
4. 管理職(`000001`)自身のREF007「最終ログイン」列に直近ログイン日時が表示された
5. EDT007で所属(事業部のみ選択)・権限を変更して保存し、REF007に正しく反映されることを確認した(バグ修正の確認を兼ねる)
6. 退職処理→「現職に戻す」ボタンへの切替、現職に戻す→「退職処理」ボタンへの切替をそれぞれCMN001の専用文言確認ダイアログとともに確認した
7. 一般社員(`000002`)での`/accounts`直接アクセスがトップへリダイレクトされ、トップ画面にもタイルが表示されないことを確認した

検証用に作成したアカウント(`000099`)は確認後に削除して後片付けした。
