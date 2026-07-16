# 019 アカウント管理(account-list・account-new・account-edit)

## 目的

管理職がアカウントの一覧検索(account-list)・新規登録(account-new)・編集/退職処理(account-edit)を行えるようにする(docs/screens.md 該当節)。3画面は導線が密結合のため1planで実装する。

## 前提(依存するplan)

- 014 master-org-units 部署マスタ管理(所属の選択肢)

## 実装内容

- `app/(authenticated)/accounts/page.tsx`: account-list アカウント一覧(管理職のみ)
  - 開閉可能な検索条件カード(「▼ 検索条件」+「検索後に閉じる」トグル・開閉状態のタブ単位記憶・検索/クリアボタン)。項目順は氏名カナ→所属組織→権限→状態
  - 所属組織はカスケード階層選択(配下を含めて検索)、状態は初回未登録/在籍中/退職の複数選択
  - 一覧列: 氏名・メールアドレス・所属組織(最下層)・権限・状態・最終ログイン。状態判定は退職(`employment_status=retired`)最優先(`lib/account-list.ts`+単体テスト)
  - 全列ソート+列フィルタ(氏名・メールはテキスト部分一致、所属・権限・状態は選択式)。最終ログインはソートのみで、未ログインは昇順・降順とも常に末尾
  - ページング(10/30(既定)/50/100)と、account-new/account-editからの戻りで絞り込み・ソート・ページを復元(003の仕組み)
- `app/(authenticated)/accounts/new/page.tsx`: account-new 新規アカウント登録
  - 社員IDは「全行(論理削除済み含む)の最大値+1」を6桁ゼロ埋めで初期表示(変更可。0件時は000001)
  - メール(照合キー・ドメイン制限なし)・氏名(任意。仮登録表示ルール)・所属3階層・権限を登録。`employment_status`は自動で現職
- `app/(authenticated)/accounts/[employeeId]/page.tsx`+`components/accounts/EditAccountForm.tsx`: account-edit アカウント編集
  - 氏名は初回未登録のアカウントのみ編集可
  - 社員ID・メールアドレスを変更可能とし、注意書きを常時表示(社員IDは開発用ログインへの影響、メールはSSO照合キーである旨)。変更検知時のみconfirm-dialogで旧→新を確認。重複エラーはフォーム下部に表示
  - 退職処理/現職に戻すボタンは`employment_status`による排他表示。いずれもconfirm-dialogの専用文言で確認
- 保存後はいずれもaccount-listへ戻る(`lib/account-schema.ts`でバリデーション+単体テスト)

## 受け入れ基準

- 検索・列ソート/フィルタ・ページング・絞り込み復元が仕様どおり動く
- 社員ID自動採番・（仮登録）表示・状態判定の優先順位が仕様どおり動く
- 社員ID/メール変更の確認フロー・重複エラー・退職/現職復帰の排他表示が機能する

## 検証方法

1. `lib/account-list.test.ts`・`lib/account-schema.test.ts`等で状態判定・採番・バリデーションを網羅する
2. Playwrightで新規登録→一覧反映→編集(ID変更確認)→退職処理→現職に戻すの一連を確認する
3. `npm run verify`が通ることを確認する
