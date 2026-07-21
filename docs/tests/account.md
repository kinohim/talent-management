# アカウント管理 テスト仕様

アカウント一覧の検索・絞込・ソート、アカウント登録・編集フォームのバリデーション、社員IDの採番、権限・社員属性のラベル変換、表示名の解決をテストする。

| テストファイル | 対象ソース | ケース数 |
|---|---|---|
| `lib/account-list.test.ts` | `lib/account-list.ts` | 19 |
| `lib/account-schema.test.ts` | `lib/account-schema.ts` | 10 |
| `lib/employee-id.test.ts` | `lib/employee-id.ts` | 3 |
| `lib/employee-labels.test.ts` | `lib/employee-labels.ts` | 10 |
| `lib/employee-name.test.ts` | `lib/employee-name.ts` | 4 |
| `lib/role-label.test.ts` | `lib/role-label.ts` | 3 |
| `lib/applied-filter-chips.test.ts`(account分) | `lib/applied-filter-chips.ts` | 4 |

## deriveAccountStatus

対象: `lib/account-list.ts` / テスト: `lib/account-list.test.ts`
概要: 社員の `isRegistered` × `employmentStatus` からアカウント状態（初回未登録／在籍中／退職）を判定する（退職を最優先）
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | 退職済みなら未登録有無を問わず退職を返す | 正常系 |
| 2 | 退職していなければ isRegistered=false で初回未登録 | 正常系 |
| 3 | 退職しておらず登録済みなら在籍中 | 正常系 |

## parseAccountFilters

対象: `lib/account-list.ts` / テスト: `lib/account-list.test.ts`
概要: アカウント一覧のURL searchParams から検索フォーム・列フィルタの条件をパースする
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | 空の searchParams は全項目デフォルト（空）になる | 境界値 |
| 2 | 氏名は前後空白を trim する | 正常系 |
| 3 | 所属組織 id は複数値を数値配列にパースする | 正常系 |
| 4 | 単一値の searchParams も配列として扱う | 正常系 |
| 5 | 不正な権限値は除外する | 異常系 |
| 6 | 不正な状態値は除外する | 異常系 |
| 7 | 列フィルタをパースする（テキストは trim、所属組織は "none" 許容） | 正常系 |

## buildAccountStatusWhere

対象: `lib/account-list.ts` / テスト: `lib/account-list.test.ts`
概要: アカウント状態フィルタを Prisma の where 条件（employmentStatus × isRegistered）に変換する
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | 空配列は null（絞込なし） | 境界値 |
| 2 | 単一状態は単一条件を返す | 正常系 |
| 3 | 複数状態は OR 合成する | 正常系 |
| 4 | where の判定は deriveAccountStatus と整合する（全4通りの社員状態で検証） | 正常系 |

## buildAccountOrderBy

対象: `lib/account-list.ts` / テスト: `lib/account-list.test.ts`
概要: ヘッダソートのソートキーと昇降順から Prisma の orderBy 配列（employeeId タイブレーク付き）を組み立てる
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | null（デフォルト）は氏名昇順 + employeeId タイブレーク | 境界値 |
| 2 | email/role/lastLogin は user リレーション経由でソートする | 正常系 |
| 3 | status は employmentStatus + isRegistered の組でソートする | 正常系 |
| 4 | org は組織名でソートする | 正常系 |
| 5 | lastLogin の未ログイン（-）は昇順・降順のどちらでも末尾に置く | 境界値 |

## parseNewAccountForm

対象: `lib/account-schema.ts` / テスト: `lib/account-schema.test.ts`
概要: アカウント新規登録フォーム（社員ID・メール・権限・任意の氏名）を zod でバリデーションする
前提: モックなし（純粋関数、FormData を組み立てて検証）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | 正常な入力で成功する | 正常系 |
| 2 | 氏名を入力した場合は前後空白を除いて受け付ける | 正常系 |
| 3 | 社員IDが6桁でなければエラー | 異常系 |
| 4 | 社員IDが数字以外を含むとエラー | 異常系 |
| 5 | メールアドレスの形式が不正ならエラー | 異常系 |
| 6 | 権限が未指定ならエラー | 異常系 |

## parseEditAccountForm

対象: `lib/account-schema.ts` / テスト: `lib/account-schema.test.ts`
概要: アカウント編集フォーム（新規登録と同じバリデーション）を zod でバリデーションする
前提: モックなし（純粋関数、FormData を組み立てて検証）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | 正常な入力で成功する（社員ID・メール・権限） | 正常系 |
| 2 | 社員IDが6桁の数字でなければエラー | 異常系 |
| 3 | メールアドレスの形式が不正ならエラー | 異常系 |
| 4 | 権限が未指定ならエラー | 異常系 |

## nextEmployeeId

対象: `lib/employee-id.ts` / テスト: `lib/employee-id.test.ts`
概要: account-new の社員ID初期値を、既存の最大社員ID + 1 の6桁ゼロ埋めで採番する
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | 最大社員ID + 1 を6桁ゼロ埋めで返す | 正常系 |
| 2 | 社員が存在しない・形式不正なら 000001 を返す | 異常系 |
| 3 | 6桁の上限では 999999 のまま返す | 境界値 |

## genderLabel

対象: `lib/employee-labels.ts` / テスト: `lib/employee-labels.test.ts`
概要: 性別 enum を日本語ラベルに変換する
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | null なら空文字を返す | 境界値 |
| 2 | 全ての値をラベルに変換する | 正常系 |

## finalSchoolTypeLabel

対象: `lib/employee-labels.ts` / テスト: `lib/employee-labels.test.ts`
概要: 最終学歴区分 enum を日本語ラベルに変換する
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | null なら空文字を返す | 境界値 |
| 2 | 全ての値をラベルに変換する | 正常系 |

## graduationStatusLabel

対象: `lib/employee-labels.ts` / テスト: `lib/employee-labels.test.ts`
概要: 卒業区分 enum を日本語ラベルに変換する
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | null なら空文字を返す | 境界値 |
| 2 | 全ての値をラベルに変換する | 正常系 |

## skillLevelLabel

対象: `lib/employee-labels.ts` / テスト: `lib/employee-labels.test.ts`
概要: スキル習熟度 enum を記号付きの日本語ラベルに変換する
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | 全ての値をラベルに変換する | 正常系 |

## employeeDisplayName

対象: `lib/employee-labels.ts` / テスト: `lib/employee-labels.test.ts`
概要: 氏名と登録状態から表示名を組み立てる（初回未登録の間は「（仮登録）」を付与）
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | 初回未登録の間は氏名に（仮登録）を付ける | 正常系 |
| 2 | 本人登録済み（is_registered=true）なら素の氏名を返す | 正常系 |
| 3 | 氏名未登録なら null（呼び出し側が（未登録）等を表示する） | 境界値 |

## displayNameForEmployee

対象: `lib/employee-name.ts` / テスト: `lib/employee-name.test.ts`
概要: 社員IDから employee.name を都度参照してヘッダ等の表示名を解決する（未登録時は社員IDにフォールバック）
前提: `vi.mock` で Prisma（employee.findUnique）をモック

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | employee.name が登録済みなら名前を返す | 正常系 |
| 2 | 初回未登録の間は（仮登録）を付けて返す | 正常系 |
| 3 | employee.name が未登録（null）なら社員IDを返す | 境界値 |
| 4 | employee が見つからなければ社員IDを返す | 境界値 |

## roleLabel

対象: `lib/role-label.ts` / テスト: `lib/role-label.test.ts`
概要: ユーザー権限 enum を日本語ラベルに変換する
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | EMPLOYEE は一般社員 | 正常系 |
| 2 | HR_SALES は人事・営業 | 正常系 |
| 3 | MANAGER は管理職 | 正常系 |

## buildAccountAppliedFilterChips

対象: `lib/applied-filter-chips.ts` / テスト: `lib/applied-filter-chips.test.ts`
概要: account-listの検索フォーム条件(列フィルタを除く)から、一覧上部に表示する「適用中の条件」チップ(ラベル・個別解除用のURLパラメータ)を組み立てる純粋関数
前提: モックなし（純粋関数。マスタ名・ラベルの解決は呼び出し側から渡すlookup関数で行う）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | 条件が何もなければ空配列を返す | 境界値 |
| 2 | 権限・状態は選択値ごとに個別チップになる | 正常系 |
| 3 | 列フィルタ(col*)はチップの対象にしない | 異常系 |
| 4 | 「すべてクリア」対象キーは検索フォームの条件キー一式(列フィルタを含まない) | 正常系 |
