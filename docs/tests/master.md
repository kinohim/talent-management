# マスタ管理・組織単位管理 テスト仕様

マスタ管理（スキル・資格・現場・現場ポジション）と組織単位管理を支える lib/ 配下のロジック（削除制約判定・バージョン差分計画・フォーム入力のパース/バリデーション・組織ツリー構築）を対象としたユニットテスト。

| テストファイル | 対象ソース | ケース数 |
|---|---|---|
| `lib/skill-master.test.ts` | `lib/skill-master.ts` | 12 |
| `lib/skill-master-schema.test.ts` | `lib/skill-master-schema.ts` | 11 |
| `lib/certification-master.test.ts` | `lib/certification-master.ts` | 2 |
| `lib/certification-master-schema.test.ts` | `lib/certification-master-schema.ts` | 11 |
| `lib/site-master.test.ts` | `lib/site-master.ts` | 3 |
| `lib/site-master-schema.test.ts` | `lib/site-master-schema.ts` | 16 |
| `lib/project-role-master.test.ts` | `lib/project-role-master.ts` | 3 |
| `lib/project-role-master-schema.test.ts` | `lib/project-role-master-schema.ts` | 6 |
| `lib/organization-unit-schema.test.ts` | `lib/organization-unit-schema.ts` | 6 |
| `lib/organization-unit-tree.test.ts` | `lib/organization-unit-tree.ts` | 17 |

## planSkillVersionDiff

対象: `lib/skill-master.ts` / テスト: `lib/skill-master.test.ts`
概要: スキルの既存バージョン一覧と送信されたタグ名を比較し、新規作成・再表示化・削除候補の差分計画を返す
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | 新規タグのみ渡すとすべて toCreate になる | 正常系 |
| 2 | 既存 active なタグと完全一致すれば何もしない | 正常系 |
| 3 | 既存 inactive なタグと同名を送信すると再表示化対象になる（新規作成しない） | 正常系 |
| 4 | 既存 active なタグが送信リストになければ削除候補になる | 正常系 |
| 5 | 既存 inactive なタグが送信リストになくても削除候補にはならない（既に非表示のため） | 正常系 |

## getSkillDeleteBlockReason

対象: `lib/skill-master.ts` / テスト: `lib/skill-master.test.ts`
概要: スキルが社員スキル登録・プロジェクト経歴から参照されている場合に削除ブロック理由を返す（未参照なら null）
前提: `vi.mock` で Prisma（employeeSkill.count / projectSkill.count）をモック

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | 社員のスキル登録から参照されていれば削除不可 | 異常系 |
| 2 | プロジェクト経歴から参照されていれば削除不可 | 異常系 |
| 3 | どちらからも参照されていなければ削除可能（null） | 正常系 |
| 4 | 回帰: projectSkill の count は deletedAt: null で絞り込む（削除済みプロジェクトの残骸を使用中と誤判定しない） | 回帰 |

## isSkillVersionReferenced

対象: `lib/skill-master.ts` / テスト: `lib/skill-master.test.ts`
概要: スキルバージョンが社員スキル登録・プロジェクト経歴から参照されているかを判定する（削除か非表示化かの分岐に使用）
前提: `vi.mock` で Prisma（employeeSkill.count / projectSkill.count）をモック

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | いずれかから参照されていれば true | 正常系 |
| 2 | どちらからも参照されていなければ false | 正常系 |
| 3 | 回帰: projectSkill の count は deletedAt: null で絞り込む | 回帰 |

## parseSkillMasterForm

対象: `lib/skill-master-schema.ts` / テスト: `lib/skill-master-schema.test.ts`
概要: スキルマスタ登録・編集フォームの FormData をパースし、カテゴリ（既存選択/新規入力）・スキル名・バージョン名リストを検証する
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | 既存カテゴリ選択＋スキル名のみで成功する | 正常系 |
| 2 | 新規カテゴリ入力で成功する | 正常系 |
| 3 | バージョン名は重複除去・前後空白 trim・空文字除外する | 境界値 |
| 4 | categoryId 未指定はエラー | 異常系 |
| 5 | 新規カテゴリ名が空ならエラー | 境界値 |
| 6 | スキル名が空ならエラー | 境界値 |
| 7 | スキル名が101文字ならエラー | 境界値 |
| 8 | バージョン名が51文字ならエラー | 境界値 |

## parseCategoryNameForm（スキルカテゴリ）

対象: `lib/skill-master-schema.ts` / テスト: `lib/skill-master-schema.test.ts`
概要: スキルカテゴリの「カテゴリを追加」フォームのカテゴリ名を検証する
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | カテゴリ名を trim して返す | 正常系 |
| 2 | 空文字はエラー | 境界値 |
| 3 | 101文字はエラー | 境界値 |

## getCertificationDeleteBlockReason

対象: `lib/certification-master.ts` / テスト: `lib/certification-master.test.ts`
概要: 資格が社員の資格登録から参照されている場合に削除ブロック理由を返す（未参照なら null）
前提: `vi.mock` で Prisma（employeeCertification.count）をモック

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | 社員の資格登録から参照されていれば削除不可 | 異常系 |
| 2 | 参照されていなければ削除可能（null） | 正常系 |

## parseCertificationMasterForm

対象: `lib/certification-master-schema.ts` / テスト: `lib/certification-master-schema.test.ts`
概要: 資格マスタ登録・編集フォームの FormData をパースし、カテゴリ（既存選択/新規入力）・資格名・認定団体を検証する
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | 既存カテゴリ選択＋資格名＋認定団体で成功する | 正常系 |
| 2 | 新規カテゴリ入力で成功する | 正常系 |
| 3 | categoryId 未指定はエラー | 異常系 |
| 4 | 新規カテゴリ名が空ならエラー | 境界値 |
| 5 | 資格名が空ならエラー | 境界値 |
| 6 | 資格名が101文字ならエラー | 境界値 |
| 7 | 認定団体が空ならエラー | 境界値 |
| 8 | 認定団体が101文字ならエラー | 境界値 |

## parseCategoryNameForm（資格カテゴリ）

対象: `lib/certification-master-schema.ts` / テスト: `lib/certification-master-schema.test.ts`
概要: 資格カテゴリの「カテゴリを追加」フォームのカテゴリ名を検証する
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | カテゴリ名を trim して返す | 正常系 |
| 2 | 空文字はエラー | 境界値 |
| 3 | 101文字はエラー | 境界値 |

## getSiteDeleteBlockReason

対象: `lib/site-master.ts` / テスト: `lib/site-master.test.ts`
概要: 現場がプロジェクト経歴から参照されている場合に削除ブロック理由を返す（未参照なら null）
前提: `vi.mock` で Prisma（project.count）をモック

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | プロジェクト経歴から参照されていれば削除不可 | 異常系 |
| 2 | 参照されていなければ削除可能（null） | 正常系 |
| 3 | 回帰: count は deletedAt: null で絞り込む（削除済みプロジェクトの残骸を使用中と誤判定しない） | 回帰 |

## parseSiteMasterForm

対象: `lib/site-master-schema.ts` / テスト: `lib/site-master-schema.test.ts`
概要: 現場マスタ登録・編集フォームの現場名・主管部署（任意）・最寄駅（都道府県・路線名・駅名、任意）を検証する
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | 正常な現場名を受け付ける（主管部署未指定は null） | 正常系 |
| 2 | 前後の空白は trim される | 正常系 |
| 3 | 主管部署の id を数値で受け付ける（空文字は null） | 正常系 |
| 4 | 主管部署が数値でなければエラー | 異常系 |
| 5 | 空文字はエラー | 境界値 |
| 6 | 未入力（フィールド自体が無い）はエラー | 境界値 |
| 7 | 100文字ちょうどは許可 | 境界値 |
| 8 | 101文字はエラー | 境界値 |
| 9 | 最寄駅（路線名・駅名）が未入力でも成功する（それぞれ undefined） | 正常系 |
| 10 | 最寄駅（路線名・駅名）の前後の空白は trim される | 正常系 |
| 11 | 最寄駅（路線名・駅名）は100文字ちょうどまで許可 | 境界値 |
| 12 | 最寄駅（路線名・駅名）の101文字はエラー | 境界値 |
| 13 | 最寄駅（路線名・駅名）が空文字で送信された場合(未選択のselect)もundefinedとして扱う | 境界値 |
| 14 | 都道府県が未入力でも成功する(undefined) | 正常系 |
| 15 | 都道府県はPREFECTURES(47都道府県)に含まれる値のみ許可し、それ以外はエラー | 異常系 |
| 16 | 都道府県が空文字で送信された場合(未選択のselect)もundefinedとして扱う | 境界値 |

## getProjectRoleDeleteBlockReason

対象: `lib/project-role-master.ts` / テスト: `lib/project-role-master.test.ts`
概要: 現場ポジション（役割）がプロジェクト経歴から参照されている場合に削除ブロック理由を返す（未参照なら null）
前提: `vi.mock` で Prisma（projectRoleLink.count）をモック

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | プロジェクト経歴から参照されていれば削除不可 | 異常系 |
| 2 | 参照されていなければ削除可能（null） | 正常系 |
| 3 | 回帰: count は deletedAt: null で絞り込む（削除済みプロジェクトの残骸を使用中と誤判定しない） | 回帰 |

## parseProjectRoleMasterForm

対象: `lib/project-role-master-schema.ts` / テスト: `lib/project-role-master-schema.test.ts`
概要: 現場ポジションマスタ登録・編集フォームの役割名を検証する
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | 正常な役割名を受け付ける | 正常系 |
| 2 | 前後の空白は trim される | 正常系 |
| 3 | 空文字はエラー | 境界値 |
| 4 | 未入力（フィールド自体が無い）はエラー | 境界値 |
| 5 | 20文字ちょうどは許可 | 境界値 |
| 6 | 21文字はエラー | 境界値 |

## parseUnitNameForm

対象: `lib/organization-unit-schema.ts` / テスト: `lib/organization-unit-schema.test.ts`
概要: 組織単位（事業部・部署・Gr）登録・編集フォームの名称を検証する
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | 正常な名称を受け付ける | 正常系 |
| 2 | 前後の空白は trim される | 正常系 |
| 3 | 空文字はエラー | 境界値 |
| 4 | 未入力（フィールド自体が無い）はエラー | 境界値 |
| 5 | 100文字ちょうどは許可 | 境界値 |
| 6 | 101文字はエラー | 境界値 |

## buildOrganizationUnitTree

対象: `lib/organization-unit-tree.ts` / テスト: `lib/organization-unit-tree.test.ts`
概要: フラットな組織単位一覧を parentId でグルーピングし、事業部＞部署＞Gr のツリーに組み立てる（各階層 unitName 昇順）
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | parentId でグルーピングし、事業部＞部署＞Gr のツリーを組み立てる（各階層 unitName 昇順） | 正常系 |
| 2 | 空配列を渡すと空のツリーを返す | 境界値 |

## deriveChildLevel

対象: `lib/organization-unit-tree.ts` / テスト: `lib/organization-unit-tree.test.ts`
概要: 親の階層から、その配下に追加できる子の階層を導出する（Gr より下は存在しないため null）
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | null なら新規事業部として DIVISION を返す | 正常系 |
| 2 | DIVISION の配下は DEPARTMENT | 正常系 |
| 3 | DEPARTMENT の配下は GROUP | 正常系 |
| 4 | GROUP の配下は存在しないため null | 境界値 |

## collectDescendantIds

対象: `lib/organization-unit-tree.ts` / テスト: `lib/organization-unit-tree.test.ts`
概要: 選択された組織単位 id に、その配下すべて（子・孫…）の id を加えた Set を返す（階層フィルタ用）
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | 事業部を選ぶと配下の部署・Gr もすべて含まれる | 正常系 |
| 2 | 部署を選ぶとその配下の Gr のみ含まれる（兄弟部署は含まない） | 正常系 |
| 3 | Gr を選ぶとそれ自身のみ（配下が無いため） | 正常系 |
| 4 | 複数選択時はそれぞれの配下を合算する（重複除去） | 正常系 |
| 5 | 空配列を渡すと空集合を返す | 境界値 |

## resolveEffectiveOrgUnitIds

対象: `lib/organization-unit-tree.ts` / テスト: `lib/organization-unit-tree.test.ts`
概要: カスケード式組織フィルタの検索対象解決。親と子が両方選択されている場合は選択された最深ノードの配下のみを対象にする
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | 親のみ選択なら配下すべてを対象にする（collectDescendantIds 互換） | 正常系 |
| 2 | 親＋子が選択されたら最深の子の配下のみを対象にする | 正常系 |
| 3 | 親＋孫が選択されたら孫のみを対象にする | 正常系 |
| 4 | 兄弟が両方選択されたら双方の配下を合算する | 正常系 |
| 5 | 別ツリーの選択は互いに影響しない | 正常系 |
| 6 | 空配列を渡すと空集合を返す | 境界値 |
