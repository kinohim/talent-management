# 経歴書の作成・編集 テスト仕様

経歴書の作成・編集(基本情報・経歴要約・プロジェクト実績・スキル・資格)に関わるフォームバリデーション、マスタ整合チェック、AI文章生成プロンプト組み立て、経験年数・卒業年月の計算ロジック、およびPDF出力(pdf-preview)の氏名表記・出力設定ロジックをテストする。

| テストファイル | 対象ソース | ケース数 |
|---|---|---|
| `lib/basic-info-schema.test.ts` | `lib/basic-info-schema.ts` | 9 |
| `lib/career-summary-schema.test.ts` | `lib/career-summary-schema.ts` | 4 |
| `lib/career-text-prompt.test.ts` | `lib/career-text-prompt.ts` | 11 |
| `lib/project-schema.test.ts` | `lib/project-schema.ts` | 13 |
| `lib/project-options.test.ts` | `lib/project-options.ts` | 9 |
| `lib/skill-schema.test.ts` | `lib/skill-schema.ts` | 7 |
| `lib/skill-options.test.ts` | `lib/skill-options.ts` | 7 |
| `lib/certification-schema.test.ts` | `lib/certification-schema.ts` | 10 |
| `lib/certification-options.test.ts` | `lib/certification-options.ts` | 4 |
| `lib/my-resume-tabs.test.ts` | `lib/my-resume-tabs.ts` | 3 |
| `lib/graduation.test.ts` | `lib/graduation.ts` | 3 |
| `lib/experience-years.test.ts` | `lib/experience-years.ts` | 14 |
| `lib/print-name.test.ts` | `lib/print-name.ts` | 8 |
| `lib/pdf-preview-settings.test.ts` | `lib/pdf-preview-settings.ts` | 5 |

## parseBasicInfoForm

対象: `lib/basic-info-schema.ts` / テスト: `lib/basic-info-schema.test.ts`
概要: 基本情報フォームの FormData を zod スキーマで検証・パースする
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | 必須項目(氏名・カナ・生年月日)が揃っていれば成功する | 正常系 |
| 2 | 氏名が未入力なら失敗する | 異常系 |
| 3 | 氏名が51文字(上限50超過)なら失敗し、文字数エラーを返す | 境界値 |
| 4 | カナに非カタカナが混入していれば失敗し、カタカナ指定エラーを返す | 異常系 |
| 5 | 生年月日の形式が不正(スラッシュ区切り)なら失敗する | 異常系 |
| 6 | 任意項目の空文字は undefined として扱われ成功する | 境界値 |
| 7 | 任意項目(性別・最寄駅・最終学歴・卒業年月等)を正しく入力すると値が反映される | 正常系 |
| 8 | カナにスペースがない(1語)なら失敗し、姓名区切りエラーを返す | 異常系 |
| 9 | カナが3語以上なら失敗し、姓名区切りエラーを返す | 異常系 |

## parseCareerSummaryForm

対象: `lib/career-summary-schema.ts` / テスト: `lib/career-summary-schema.test.ts`
概要: 経歴概要・自己PRフォームの FormData を検証・パースする(いずれも任意項目)
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | 経歴概要・自己PRの両方が未入力でも成功する(任意項目) | 境界値 |
| 2 | 両項目とも1000文字ちょうど(上限内)なら成功する | 境界値 |
| 3 | 経歴概要が1001文字なら失敗し、文字数エラーを返す | 境界値 |
| 4 | 自己PRが1001文字なら失敗し、文字数エラーを返す | 境界値 |

## buildCareerTextPrompt

対象: `lib/career-text-prompt.ts` / テスト: `lib/career-text-prompt.test.ts`
概要: AI文章生成(経歴概要・自己PR)用のシステム・ユーザープロンプトを登録データから組み立てる
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | 経歴・スキル・資格・経験年数がユーザープロンプトに反映される | 正常系 |
| 2 | 終了日が未設定のプロジェクトは「現在」と表示される | 境界値 |
| 3 | target(経歴概要/自己PR)ごとにシステムプロンプトの指示が変わる | 正常系 |
| 4 | 共通の文体・分量ルール(です・ます調、300〜500字、1000文字以内)が含まれる | 正常系 |
| 5 | 登録済みの文章があれば改善指示、なければ新規作成指示になる | 正常系 |
| 6 | 未登録の項目(経歴・スキル・資格)は「(未登録)」と表示される | 境界値 |

## listMissingData

対象: `lib/career-text-prompt.ts` / テスト: `lib/career-text-prompt.test.ts`
概要: 経歴・スキル・資格のうち未登録のデータ種別を列挙する
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | すべて未登録なら3項目(projects・skills・certifications)を返す | 正常系 |
| 2 | 登録済みの項目は含まれない | 正常系 |
| 3 | すべて登録済みなら空配列を返す | 境界値 |

## buildMissingDataMessage

対象: `lib/career-text-prompt.ts` / テスト: `lib/career-text-prompt.test.ts`
概要: 未登録データ種別の一覧から利用者向けの案内メッセージを生成する
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | 未登録項目のみを「・」区切りで列挙したメッセージを返す | 正常系 |
| 2 | 空配列なら null を返す | 境界値 |

## parseProjectForm

対象: `lib/project-schema.ts` / テスト: `lib/project-schema.test.ts`
概要: プロジェクト経歴フォーム(役割複数選択・担当工程・スキル行を含む)の FormData を検証・パースする
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | 必須項目が揃っていれば成功する(役割1つ・スキル0件) | 正常系 |
| 2 | 役割が0件ならエラーになる | 異常系 |
| 3 | 役割は複数選択できる | 正常系 |
| 4 | 「現在」チェック時は終了年月のバリデーションを行わない | 正常系 |
| 5 | 終了年月が開始年月より前ならエラーになる | 異常系 |
| 6 | 終了年月が開始年月以降なら成功する | 境界値 |
| 7 | 担当工程のチェックボックスが正しく反映される | 正常系 |
| 8 | スキル行(バージョンなし)を1件パースできる | 正常系 |
| 9 | スキル行のカテゴリ未選択は rowErrors を返す | 異常系 |
| 10 | 同一スキル+同一バージョンの重複行は formError を返す | 異常系 |
| 11 | プロジェクトタイトル未入力はエラーになる | 異常系 |

## findDuplicateProjectSkillRowKey

対象: `lib/project-schema.ts` / テスト: `lib/project-schema.test.ts`
概要: プロジェクトのスキル行一覧から重複行(同一スキル+同一バージョン)のキーを検出する
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | 重複がなければ null を返す | 正常系 |
| 2 | 同一スキルでもバージョンが異なれば重複扱いしない | 正常系 |

## validateProjectFormAgainstMaster

対象: `lib/project-options.ts` / テスト: `lib/project-options.test.ts`
概要: プロジェクトフォームの現場ID・役割IDがマスタに存在するか検証する
前提: モックなし（純粋関数。マスタはテスト内で構築した選択肢オブジェクトを使用）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | マスタに整合する値は null を返す | 正常系 |
| 2 | 存在しない現場IDは弾く | 異常系 |
| 3 | 存在しない役割IDは弾く | 異常系 |

## validateProjectSkillsAgainstMaster

対象: `lib/project-options.ts` / テスト: `lib/project-options.test.ts`
概要: プロジェクトのスキル行がスキルマスタ(カテゴリ・スキル・バージョン)に整合するか検証する
前提: モックなし（純粋関数。マスタはテスト内で構築した選択肢オブジェクトを使用）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | マスタに整合する行は null を返す | 正常系 |
| 2 | 存在しないカテゴリIDは弾く | 異常系 |
| 3 | 存在しないスキルIDは弾く | 異常系 |
| 4 | カテゴリとスキルの親子関係が一致しなければ弾く | 異常系 |
| 5 | hasVersion=true のスキルでバージョン未選択は弾く | 異常系 |
| 6 | hasVersion=false のスキルでバージョンを選択していれば弾く | 異常系 |

## parseSkillRowsForm

対象: `lib/skill-schema.ts` / テスト: `lib/skill-schema.test.ts`
概要: スキル一括編集フォームの行データ(items.N.* 形式)を検証・パースする
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | 行が0件でも成功する(全スキル削除を許容) | 境界値 |
| 2 | バージョンなしの1行が成功する | 正常系 |
| 3 | index が欠番(0と2)でも両方の行を復元する | 正常系 |
| 4 | 必須項目が欠けている行は rowErrors を返す | 異常系 |
| 5 | 同一スキル+同一バージョン(なし)の重複行は formError を返す | 異常系 |
| 6 | 同一スキルでもバージョンが異なれば重複扱いしない | 正常系 |

## findDuplicateRowKey

対象: `lib/skill-schema.ts` / テスト: `lib/skill-schema.test.ts`
概要: スキル行一覧から重複行(同一スキル+同一バージョン)のキーを検出する
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | 重複がなければ null を返す | 正常系 |

## validateSkillRowsAgainstMaster

対象: `lib/skill-options.ts` / テスト: `lib/skill-options.test.ts`
概要: スキル行がスキルマスタ(カテゴリ・スキル・バージョン)に整合するか検証する
前提: モックなし（純粋関数。マスタはテスト内で構築した選択肢オブジェクトを使用）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | マスタに整合する行は null を返す | 正常系 |
| 2 | hasVersion のスキルにバージョンを選択していれば成功する | 正常系 |
| 3 | 存在しないカテゴリIDは弾く | 異常系 |
| 4 | カテゴリとスキルの親子関係が一致しなければ弾く | 異常系 |
| 5 | hasVersion=true のスキルでバージョン未選択は弾く | 異常系 |
| 6 | hasVersion=false のスキルでバージョンを選択していれば弾く | 異常系 |
| 7 | バージョンが別スキルのものなら弾く | 異常系 |

## parseCertificationRowsForm

対象: `lib/certification-schema.ts` / テスト: `lib/certification-schema.test.ts`
概要: 資格一括編集フォームの行データ(items.N.* 形式)を検証・パースする(取得年月日・有効期限の日付整合を含む)
前提: モックなし（純粋関数）。JST 基準の日付判定ケースのみ `vi.useFakeTimers` でシステム時刻を固定

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | 行が0件でも成功する(全資格削除を許容) | 境界値 |
| 2 | 有効期限なしの1行が成功する | 正常系 |
| 3 | 有効期限が取得年月日より後なら成功する | 正常系 |
| 4 | index が欠番(0と2)でも両方の行を復元する | 正常系 |
| 5 | 必須項目が欠けている行は rowErrors を返す | 異常系 |
| 6 | 取得年月日が未来日なら rowErrors を返す | 異常系 |
| 7 | 有効期限が取得年月日以前(同日)なら rowErrors を返す | 境界値 |
| 8 | 本日以前の判定はJST基準: UTC ではまだ前日でも、JST の今日の日付を許容する | 境界値 |
| 9 | 本日以前の判定はJST基準: JST の明日の日付はエラーになる | 境界値 |
| 10 | 同一資格を複数行(再取得)登録しても成功する | 正常系 |

## validateCertificationRowsAgainstMaster

対象: `lib/certification-options.ts` / テスト: `lib/certification-options.test.ts`
概要: 資格行が資格マスタ(カテゴリ・資格)に整合するか検証する
前提: モックなし（純粋関数。マスタはテスト内で構築した選択肢オブジェクトを使用）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | マスタに整合する行は null を返す | 正常系 |
| 2 | 存在しないカテゴリIDは弾く | 異常系 |
| 3 | 存在しない資格IDは弾く | 異常系 |
| 4 | カテゴリと資格の親子関係が一致しなければ弾く | 異常系 |

## parseMyResumeTab

対象: `lib/my-resume-tabs.ts` / テスト: `lib/my-resume-tabs.test.ts`
概要: クエリパラメータの値から「私の経歴書」の表示タブ(表紙/実績)を決定する
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | "projects" は実績タブになる | 正常系 |
| 2 | 未指定・不正値は表紙タブにフォールバックする | 異常系 |
| 3 | 配列で渡された場合は先頭の値を使う | 正常系 |

## predictGraduationYearMonth

対象: `lib/graduation.ts` / テスト: `lib/graduation.test.ts`
概要: 生年月日から大学卒業想定の卒業年月(YYYY-MM)を予測する
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | 4〜12月生まれは生年+23年の3月を返す | 境界値 |
| 2 | 1〜3月生まれ(早生まれ)は生年+22年の3月を返す | 境界値 |
| 3 | 生年月日が不完全・不正(空文字・年のみ・13月・0月等)なら null を返す | 異常系 |

## sumUnionMonths

対象: `lib/experience-years.ts` / テスト: `lib/experience-years.test.ts`
概要: 月インデックス区間の集合から、重複を除いた和集合の合計月数を求める
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | 区間が0件なら0を返す | 境界値 |
| 2 | 重複しない区間は単純に合算する | 正常系 |
| 3 | 重複する区間は重複月を1回だけ数える | 正常系 |
| 4 | 完全に内包される区間は外側の区間の月数のみ数える | 正常系 |
| 5 | 入力順序に依存せず同じ結果になる | 正常系 |

## calculateExperienceMonths

対象: `lib/experience-years.ts` / テスト: `lib/experience-years.test.ts`
概要: プロジェクトの開始日・終了日一覧から実務経験月数(重複期間は和集合)を計算する
前提: モックなし（純粋関数。基準日 today は引数で固定）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | プロジェクトが0件なら0か月 | 境界値 |
| 2 | 12か月ちょうどなら12を返す(年への切り捨てはしない) | 境界値 |
| 3 | 端数月も月数として保持する | 正常系 |
| 4 | 進行中(endDate=null)のプロジェクトは today の年月まで含める | 境界値 |
| 5 | 重複期間の複数プロジェクトを和集合で正しく計算する | 正常系 |

## formatExperienceMonths

対象: `lib/experience-years.ts` / テスト: `lib/experience-years.test.ts`
概要: 経験月数を「◯年◯か月」形式の表示文字列に整形する
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | 年と月を「◯年◯か月」で表示する | 正常系 |
| 2 | 1年未満は「◯か月」のみ | 正常系 |
| 3 | 端数0か月は「◯年」のみ | 境界値 |
| 4 | 0か月は「0か月」 | 境界値 |

## initialsFromKana

対象: `lib/print-name.ts` / テスト: `lib/print-name.test.ts`
概要: カナ（姓 名）から「Y.T」（姓.名）形式のイニシャルを生成する（頭文字のヘボン式ローマ字化）。生成できない場合は null を返し、pdf-preview はイニシャル選択肢を非活性にする
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | 「ヤマダ タロウ」（半角スペース）を「Y.T」に変換する | 正常系 |
| 2 | 全角スペース区切り・前後空白付きでも変換する | 正常系 |
| 3 | 濁音・半濁音（ガ→G、ザ→Z、ダ→D、バ→B、パ→P）を変換する | 正常系 |
| 4 | ヘボン式特殊音（シ→S、チ→C、ツ→T、フ→F、ジ→J、ヂ→J、ヅ→Z、ヲ→O、ヴ→V）を変換する | 正常系 |
| 5 | null・空文字・空白のみは null を返す | 境界値 |
| 6 | スペースなし（1トークン）は null を返す | 境界値 |
| 7 | 3トークン以上は null を返す | 境界値 |
| 8 | 先頭が変換不可文字（ー・ッ・ン・小書き）のトークンは null を返す | 異常系 |

## defaultPdfPreviewSettings

対象: `lib/pdf-preview-settings.ts` / テスト: `lib/pdf-preview-settings.test.ts`
概要: pdf-preview のマスク・氏名表記のロール別初期値を返す（一般社員=実名・マスクなし、人事・営業／管理職の他人=イニシャル＋経験年数以外の全項目マスクON、管理職の自身分は一般社員と同じ）
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | EMPLOYEE は実名・全項目マスクなし | 正常系 |
| 2 | HR_SALES はイニシャル・経験年数以外の全項目マスクON | 正常系 |
| 3 | MANAGER で他人の経歴書はイニシャル・経験年数以外の全項目マスクON | 正常系 |
| 4 | MANAGER で自身の経歴書は実名・全項目マスクなし | 正常系 |
| 5 | イニシャル初期値でも hasInitials=false なら実名にフォールバックする | 異常系 |
