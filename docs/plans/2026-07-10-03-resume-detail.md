# 実行計画: REF003(経歴書詳細)

## Context

EDT001〜EDT005・REF006の実装完了によりマイページ配下の「編集」フローは一通り揃ったが、「閲覧」フローの入口(REF004マイページの「プレビュー」タイル)はまだリンクが張られていない状態(`href`未設定で「準備中」表示)だった。

次に実装する画面としてREF003(経歴書詳細)を選定した。マイページ(REF004)のプレビューボタン・経歴書一覧(REF002、未実装)双方の遷移先ハブであり、表示専用で既存のPrismaモデルを集約表示するだけのため既存パターンの再利用度が高いこと、また「一般社員が閲覧範囲内(同一部署/同一事業部)の社員の経歴書を閲覧できる」という設計判断(`docs/decisions.md`)を実現する閲覧範囲判定ロジックがまだ存在しなかったため、これを新規実装してREF002でも再利用できる形にする狙いがあった。

ユーザーとの事前合意:
1. REF003を実装する。閲覧範囲判定ロジックは`lib/organization-unit.ts`に新規実装し、将来のREF002でも再利用する
2. PDF出力(REF005へ遷移)・Excel出力(直接ダウンロード)ボタンは、両機能とも未実装のため既存`Tile`コンポーネントと同じ「準備中」非活性表示にする

## 閲覧権限ルール(docs/screens.md REF002より、REF003もこれに従う)

- 本人は常に自分の経歴書を閲覧可
- 人事・営業(`HR_SALES`)・管理職(`MANAGER`)は常に他社員の経歴書を閲覧可
- 一般社員(`EMPLOYEE`)が他社員を見る場合:
  - (a) 双方が部署以下(部署/Gr)に所属 → 遡って到達する部署(`unitLevel=DEPARTMENT`)の一致で判定
  - (b) どちらかが事業部直下所属 → 遡って到達する事業部(`unitLevel=DIVISION`)の一致で判定
  - (c) 未所属(NULL)は見る側・見られる側のどちらにもならない
- 権限なしは`redirect("/")`(既存コードが一貫して`redirect()`方式で、`notFound()`/`app/not-found.tsx`の使用例がリポジトリに存在しないため合わせた)
- 退職者は閲覧をブロックしない(REF002の「一覧のデフォルト除外」とは別軸。REF003に禁止の記述はない)

## 実装ファイル

### 新規
- `lib/employee-labels.ts` + テスト: `genderLabel`/`finalSchoolTypeLabel`/`graduationStatusLabel`/`skillLevelLabel`。既存`lib/role-label.ts`と同じ`Record<Enum, string>`パターンで、既存UI(`BasicInfoForm.tsx`・`SkillRow.tsx`)のラベル表記と完全一致させた
- `lib/resume-view.ts` + テスト: `groupSkillsByCategory`(カテゴリ別グルーピング)・`buildProcessFlagLabels`(担当工程のラベル配列化)・`formatSkillWithVersion`(スキル名+バージョン連結)
- `app/(authenticated)/resumes/[employeeId]/page.tsx`: 本人・他社員どちらも同一URLでカバーする閲覧専用ページ。認可フローは下記「設計判断」参照
- `components/resumes/ResumeBasicInfoSection.tsx` / `ResumeEducationSection.tsx` / `ResumeTextSection.tsx` / `ResumeSkillList.tsx` / `ResumeCertificationList.tsx` / `ResumeProjectList.tsx` / `ResumeProjectCard.tsx` / `ResumeExportButtons.tsx`: すべてServer Component。ロジックを持たず、page.tsxが整形したpropsをそのまま表示する

### 変更
- `lib/organization-unit.ts` + テスト: `isWithinResumeViewScope`(閲覧範囲判定の中核。既存の`resolveSelectionFromLeaf`で祖先を解決し、部署/事業部の一致を見る純粋関数)・`canViewEmployeeResume`(本人/HR_SALES/MANAGERの特例を合成)・`formatOrganizationUnitPath`(所属組織の表示用パス整形)を追加
- `lib/date-format.ts` + テスト: `toDisplayDate`(日精度)・`toDisplayYearMonth`(年月精度)の表示用フォーマッタを追加
- `lib/project-schema.ts`: 既存`PROCESS_FLAG_KEYS`に対応する`PROCESS_FLAG_LABELS`(担当工程の日本語ラベル)を追加。`ProjectForm.tsx`内の非公開ラベル定義とは別に、表示専用画面向けに公開exportした
- `lib/breadcrumbs.ts` + テスト: `/resumes/[id]`エントリを追加。既存の動的セグメント正規化と`BackLink`共通コンポーネントがそのまま機能するため、新規のバック導線コードは不要だった
- `components/mypage/MyPageTiles.tsx` / `app/(authenticated)/mypage/page.tsx`: 「プレビュー」タイルの`href`を`/resumes/${employeeId}`に接続

## 設計判断

1. **ルート設計**: `/resumes/{employeeId}`の単一URLで「本人がマイページから見る」「人事・営業/管理職が他社員を見る」の両ケースをカバーする(`employeeId`はVARCHAR(6)の数字ゼロ埋め文字列)。マイページの「プレビュー」タイルは自分の`employeeId`を渡すだけ。
2. **閲覧範囲判定ロジックの配置**: DBを呼ばない純粋関数として実装し、`getOrganizationUnitOptions()`の呼び出しは呼び出し元(page.tsx)が1回だけ行う設計にした。page.tsx側でも本人/HR_SALES/MANAGERのケースではこの追加クエリ自体を発行しない(一般社員が他社員を見る場合のみ発行)。
3. **認可フロー**: `auth()`→`resolveDestination`で未登録者を`/register`へ(HR_SALESも閲覧するページのため、他ページにある`if (role === HR_SALES) redirect("/")`ガードは入れない)→対象`Employee`が存在しない/未登録なら`redirect("/")`→本人/HR_SALES/MANAGERなら許可、それ以外は`canViewEmployeeResume`で判定→不許可なら`redirect("/")`。「見つからない」と「権限なし」を同じ`redirect("/")`に統一したのは、既存コードが一貫して`redirect()`方式(`notFound()`未使用)であること、`"/"`が全ロールに共通してアクセス可能な唯一のフォールバックであるため。
4. **退職者は閲覧をブロックしない**: REF002の「一覧のデフォルト除外」は一覧表示の話であり、REF003(詳細)にはそのような記述がないため区別した。
5. **表示ラベルは既存UIの表記と完全一致させる**: `lib/employee-labels.ts`の性別・学校種別・卒業状況・習熟度(◎○△)のラベル文字列は、`BasicInfoForm.tsx`・`SkillRow.tsx`内にハードコードされている既存の文言を1文字も変えずに再現した(登録画面と詳細画面で表記が食い違うのを防ぐため)。
6. **パンくず/戻る導線は既存の汎用実装を再利用**: `components/layout/BackLink.tsx`(`lib/breadcrumbs.ts`の`BREADCRUMB_MAP`から親を引いて「〇〇に戻る」を自動表示する既存の共通コンポーネント)がそのまま機能するため、REF003専用の戻る導線コードは書かず、マップにエントリを1行追加するだけで済ませた。人事・営業/管理職が将来のREF002から遷移した場合の「一覧に戻る」表示は今回のスコープ外(REF002実装時に対応)。

## 検証方法

- `npm run verify`(lint・tsc・vitest 149件)
- Playwright(開発用ログイン)で以下を確認:
  1. 本人(`000002`)がマイページ→プレビュー→`/resumes/000002`で自分の全項目(基本情報・最終学歴・経歴概要・自己PR・カテゴリ別スキル一覧・資格一覧・プロジェクト経歴・出力ボタン「準備中」)が表示され、編集ボタンがないこと
  2. 同一Gr内の他社員(`000002`→`000001`)は閲覧範囲内としてアクセスできる。データが空の項目は「未登録」「登録されている〇〇はありません。」と表示される
  3. 別事業部に一時的に作成した検証用社員(`999001`)へ`000002`(一般社員)としてアクセスすると閲覧範囲外のため`/`にリダイレクトされる。検証後は一時データを削除した
  4. HR_SALES(`000003`)は閲覧範囲外の社員(`999001`)にも直接アクセスできる
  5. パンくず(トップ›マイページ›経歴書詳細)・「マイページに戻る」導線が機能する
  6. コンソールエラー・警告なし

## Critical Files

- `lib/organization-unit.ts`(閲覧範囲判定ロジックの中核)
- `app/(authenticated)/resumes/[employeeId]/page.tsx`
- `lib/resume-view.ts`, `lib/employee-labels.ts`
- `components/resumes/*`
- `components/mypage/MyPageTiles.tsx`, `app/(authenticated)/mypage/page.tsx`
- `lib/breadcrumbs.ts`

---

## 実装結果(実施済み)

上記プラン通りに実装した。仕様(docs/screens.md)との差異はなし。

### 検証結果

`npm run verify`(lint・tsc・vitest 149件)が通過。Playwrightで以下をすべて確認した。

1. 本人(`000002`)のプレビューで基本情報・最終学歴・経歴概要・自己PR・スキル一覧(カテゴリ別、バージョン表示、習熟度ラベル)・資格一覧・プロジェクト経歴(担当工程・使用スキル含む)・出力ボタン(準備中)がすべて正しく表示された
2. 同一Gr内の他社員(`000001`)への閲覧が許可され、未入力項目は「未登録」表示になった
3. 別事業部の検証用社員を一時作成し、一般社員(`000002`)からの直接URLアクセスが`/`へリダイレクトされることを確認(閲覧範囲外の拒否)。検証後、作成した一時データ(社員・組織単位2件)は削除した
4. HR_SALES(`000003`)は閲覧範囲外の社員にも直接アクセスできることを確認
5. パンくず・「マイページに戻る」導線が正しく機能した
6. コンソールエラー・警告なし
