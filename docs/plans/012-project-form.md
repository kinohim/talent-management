# 012 project-form プロジェクト経歴登録・mypage[実績]タブ

## 目的

プロジェクト経歴の一覧(mypage[実績]タブ。旧: プロジェクト経歴一覧)と登録・編集・削除の単独画面(project-form)を提供し、保存・削除時に経験月数を自動再計算する(docs/screens.md project-form・mypage[実績]タブ)。

## 前提(依存するplan)

- 008 mypage 私の経歴書(タブ骨格)
- 010 スキル登録(使用スキルのタグ型UIを流用)
- 004 シードデータ(現場マスタ・現場ポジションマスタ)

## 実装内容

- mypage[実績]タブ: プロジェクト経歴一覧(期間・現場名・役割)。「新規追加」で`/projects/new`、行クリックで`/projects/[id]`(編集)へ
- `app/(authenticated)/projects/new/page.tsx`・`[id]/page.tsx`+`actions.ts`: project-form単独画面
  - 入力項目・バリデーションは docs/screens.md project-form の表のとおり(現場はマスタからサジェスト選択、タイトル必須100文字、期間は開始必須+「現在」チェックで終了入力不可、概要・業務詳細300文字、役割1つ以上、規模20文字、担当工程7項目)
  - 使用スキル: mypageのスキルセクションと同じタグ型UI(習熟度なし。タグ押下でバージョンのみ変更可)
  - 削除ボタンは誤操作防止のため左端に配置し、confirm-dialogで確認
  - 保存・削除後は`/mypage?tab=projects`へ戻る
- 削除は論理削除とし、`project_detail`・`project_skill`・`project_role_link`も**同一トランザクションで論理削除**する(docs/schema.md 一般ルール)
- `lib/project-schema.ts`: バリデーション+単体テスト
- `lib/experience-years.ts`: 経験月数計算(`calculateExperienceMonths`=期間和集合の月数、進行中はJSTの今月まで)、表示整形(`formatExperienceMonths`=「◯年◯か月」、端数側省略)、保存・削除トランザクション内での再計算(`recalculateExperienceMonths`)+単体テスト

## 受け入れ基準

- 登録・編集・削除と[実績]タブへの戻り遷移が仕様どおり動く
- 期間重複のあるプロジェクトを登録しても`experience_months`が和集合(重複1回)で計算される
- 削除時に子テーブル3つが同時に論理削除され、`experience_months`が再計算される

## 検証方法

1. `lib/experience-years.test.ts`で和集合計算(重複・連続・進行中・空)を網羅する
2. Playwrightで新規登録→編集→削除の一連と、[表紙]タブの経験年数表示の変化を確認する
3. `npm run verify`が通ることを確認する
