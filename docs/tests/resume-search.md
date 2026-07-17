# 経歴書の検索・閲覧範囲 テスト仕様

経歴書一覧(resume-list)の検索フィルタ・ソートのパース処理、経歴書詳細(resume-detail)の表示整形、および組織単位に基づく閲覧範囲判定・組織単位管理のロジックをテストする。

| テストファイル | 対象ソース | ケース数 |
|---|---|---|
| `lib/resume-search.test.ts` | `lib/resume-search.ts` | 16 |
| `lib/resume-view.test.ts` | `lib/resume-view.ts` | 8 |
| `lib/organization-unit.test.ts` | `lib/organization-unit.ts` | 34 |

## parseResumeSearchFilters

対象: `lib/resume-search.ts` / テスト: `lib/resume-search.test.ts`
概要: 経歴書一覧の検索フォーム・列フィルタの条件を URL の searchParams からパースする純粋関数
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | 空の searchParams は全項目デフォルト値になる | 境界値 |
| 2 | 氏名は前後空白を trim する | 正常系 |
| 3 | 所属組織 id・スキル id・資格 id は複数値を数値配列にパースする | 正常系 |
| 4 | 現場 id は単一選択(先頭のみ採用、不正値は null) | 正常系 |
| 5 | AND/OR モードは AND 以外なら常に OR にフォールバックする | 異常系 |
| 6 | 経験年数は 0〜99 にクランプする | 境界値 |
| 7 | 下限 > 上限なら入れ替える | 境界値 |
| 8 | includeRetired は文字列 "true" のときのみ true になる | 正常系 |
| 9 | 列フィルタのテキストは trim される | 正常系 |
| 10 | 列フィルタのスキル・資格は id 複数 + AND/OR をパースする(検索フォームと同仕様) | 正常系 |
| 11 | 列フィルタの所属組織は数値 id と "none"(未所属)を受け付ける | 正常系 |
| 12 | 列フィルタの経験年数もクランプ・下限 > 上限の入れ替えを行う | 境界値 |

## buildResumeOrderBy

対象: `lib/resume-search.ts` / テスト: `lib/resume-search.test.ts`
概要: 経歴書一覧のヘッダソート用の Prisma orderBy を組み立てる(常に employeeId のタイブレークを末尾に付ける)
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | null(デフォルト)は氏名昇順 + employeeId タイブレーク | 正常系 |
| 2 | name はカナ→氏名の順でソートし nulls は末尾 | 正常系 |
| 3 | org は組織名でソートする | 正常系 |
| 4 | experience は経験年数でソートし nulls は末尾 | 正常系 |

## groupSkillsByCategory

対象: `lib/resume-view.ts` / テスト: `lib/resume-view.test.ts`
概要: ソート済みの社員スキル一覧から、連続する同カテゴリを 1 グループにまとめる(経歴書詳細のカテゴリ別スキル表示用)
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | 0 件なら空配列を返す | 境界値 |
| 2 | 連続する同カテゴリを 1 グループにまとめる | 正常系 |
| 3 | カテゴリが切り替わったら新しいグループを作る | 正常系 |

## buildProcessFlagLabels

対象: `lib/resume-view.ts` / テスト: `lib/resume-view.test.ts`
概要: 担当工程フラグのうち true のものだけを日本語ラベルの配列にする(経歴書詳細のプロジェクト経歴カード表示用)
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | null / undefined なら空配列を返す | 境界値 |
| 2 | 全て false なら空配列を返す | 境界値 |
| 3 | true の項目だけを順序通りラベル化する | 正常系 |

## formatSkillWithVersion

対象: `lib/resume-view.ts` / テスト: `lib/resume-view.test.ts`
概要: スキル名にバージョンがあれば "TypeScript(5.x)" のように括弧で連結する
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | バージョンがなければスキル名のみ | 境界値 |
| 2 | バージョンがあれば括弧で連結する | 正常系 |

## resolveSelectionFromLeaf

対象: `lib/organization-unit.ts` / テスト: `lib/organization-unit.test.ts`
概要: 保存済みの最下層組織単位 id から、事業部/部署/Gr の 3 セレクトボックスの初期選択値を逆算する
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | leafId が null なら全て null | 境界値 |
| 2 | Gr 選択時は事業部/部署/Gr すべて解決される | 正常系 |
| 3 | 部署までの選択時は groupId は null | 正常系 |
| 4 | 事業部のみの選択時は departmentId / groupId は null | 正常系 |

## resolveOrganizationUnitId

対象: `lib/organization-unit.ts` / テスト: `lib/organization-unit.test.ts`
概要: フォームから送られた 3 階層の選択値のうち最下層の id を採用し、DB 上に実在し削除されていないことを確認する
前提: `vi.mock` で Prisma をモック（`organizationUnit.findFirst`）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | Gr > 部署 > 事業部の優先順位で最下層を採用する | 正常系 |
| 2 | groupId 未選択なら departmentId を採用する | 正常系 |
| 3 | 回帰: 下位階層が「未選択(空文字)」でも上位階層の id を採用する(事業部のみ選択時、部署/Gr の select は DOM 上有効化され空文字が FormData に含まれるため) | 回帰 |
| 4 | 回帰: 事業部 + 部署選択・Gr 未選択(空文字)なら departmentId を採用する | 回帰 |
| 5 | 何も選択されていなければ null を返す(DB を問い合わせない) | 境界値 |
| 6 | 存在しない/削除済み id なら null を返す | 異常系 |

## isWithinResumeViewScope

対象: `lib/organization-unit.ts` / テスト: `lib/organization-unit.test.ts`
概要: 一般社員が他の社員の経歴書を閲覧できるかの判定。双方が部署以下所属なら部署の一致、どちらかが事業部直下所属なら事業部の一致で判定する(docs/screens.md resume-list のルール a/b/c)
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | 片方または双方が未所属(NULL)なら false | 境界値 |
| 2 | 同じ Gr なら true | 正常系 |
| 3 | 同じ部署配下の別 Gr なら true(部署一致で判定) | 正常系 |
| 4 | 同じ事業部の別部署なら false(部署が不一致) | 正常系 |
| 5 | 事業部直下同士・同一事業部なら true | 正常系 |
| 6 | 事業部直下と、同一事業部内の部署所属者は双方向で true | 正常系 |
| 7 | 事業部直下と、別事業部の部署所属者は false | 正常系 |
| 8 | 事業部直下同士・別事業部なら false | 正常系 |

## resolveResumeViewScopeUnitIds

対象: `lib/organization-unit.ts` / テスト: `lib/organization-unit.test.ts`
概要: 一般社員が経歴書詳細を閲覧できる相手(閲覧範囲)の組織単位 id の集合を算出する(経歴書一覧の「詳細」導線の出し分けに使う。閲覧範囲ルール a/b を 1 回の集合計算に落とし込んだもの)
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | 未所属(null)なら空集合を返す | 境界値 |
| 2 | Gr 所属なら遡って到達する部署とその配下(Gr)+ 事業部直下(ルール b)が対象になる(ルール a) | 正常系 |
| 3 | 部署所属なら遡って到達する部署とその配下(Gr)+ 事業部直下(ルール b)が対象になる(ルール a) | 正常系 |
| 4 | 事業部直下所属なら事業部全体が対象になる(ルール b) | 正常系 |

## canViewEmployeeResume

対象: `lib/organization-unit.ts` / テスト: `lib/organization-unit.test.ts`
概要: 経歴書詳細のアクセス可否。本人・人事・営業・管理職は常に閲覧可、一般社員が他社員を見る場合のみ閲覧範囲判定に従う
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | isSelf なら role や所属に関係なく true | 正常系 |
| 2 | HR_SALES は閲覧範囲外の相手でも true | 正常系 |
| 3 | MANAGER は閲覧範囲外の相手でも true | 正常系 |
| 4 | EMPLOYEE は閲覧範囲判定に従う(範囲外は false) | 異常系 |
| 5 | EMPLOYEE でも閲覧範囲内なら true | 正常系 |

## formatOrganizationUnitPath

対象: `lib/organization-unit.ts` / テスト: `lib/organization-unit.test.ts`
概要: 所属組織を「事業部 / 部署 / Gr」の形式で連結する(経歴書詳細の所属組織表示用)
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | null なら「未所属」 | 境界値 |
| 2 | Gr まで辿った場合は事業部/部署/Gr を連結する | 正常系 |
| 3 | 事業部直下のみなら事業部名だけを返す | 正常系 |

## getOrganizationUnitDeleteBlockReason

対象: `lib/organization-unit.ts` / テスト: `lib/organization-unit.test.ts`
概要: 組織単位マスタの削除制約判定。ブロック理由があればエラーメッセージを、削除可能なら null を返す
前提: `vi.mock` で Prisma をモック（`organizationUnit.count` / `employee.count` / `site.count`）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | 配下の組織単位が存在すれば削除不可 | 異常系 |
| 2 | 現場マスタの主管部署として参照されていれば削除不可 | 異常系 |
| 3 | 所属社員が存在すれば削除不可 | 異常系 |
| 4 | 配下も所属社員も存在しなければ削除可能(null) | 正常系 |
