# 007 basic-info 基本情報登録(初回登録)

## 目的

初回ログイン直後の社員が基本情報(氏名・カナ・生年月日・所属・最寄駅・最終学歴等)を登録する単独画面`/basic-info`を提供し、`is_registered`を完了させる(docs/screens.md basic-info)。

## 前提(依存するplan)

- 003 共通レイアウト・UI部品(`DateField`等の入力部品)
- 004 シードデータ(組織単位の選択肢)

## 実装内容

- `app/(authenticated)/basic-info/page.tsx`: 初回登録の単独画面。社員ID・メールアドレスを編集不可で表示し、保存時に`employee.is_registered`をTRUEに更新して`/mypage`(mypage)へ遷移する
- 保存Server Action `saveBasicInfo`は`app/(authenticated)/mypage/actions.ts`に置く(mypageのセクション編集(008)と同一アクションを共用するため。本planの時点でファイルを作成し、008以降のセクション保存アクションを同居させていく)
- `components/basic-info/`: 入力フォーム(mypageのセクション編集と共用できる構成にする)
  - 入力項目・バリデーションは docs/screens.md basic-info の表のとおり(氏名/カナ必須50文字、カナは全角カタカナ(長音符許容)で「姓 名」の2語(スペース区切り)必須+注記表示(PDF出力のイニシャル生成の前提。022参照)、最寄駅・学歴100文字、性別・卒業状況はピル)
  - 所属は事業部→部署→Grの3段カスケード(下位は「なし」選択可)
  - 卒業年月: 空の状態でカレンダーボタンを押したときのみ、生年月日から大学卒業相当の予想値(早生まれは生年+22年3月、4〜12月生まれは生年+23年3月)を差し込む。×でクリアでき、空のまま保存可能
- `lib/basic-info-schema.ts`: zodバリデーションスキーマ+単体テスト
- `lib/graduation.ts`: 卒業年月予想の純粋関数+単体テスト
- `lib/organization-unit.ts`: 3段選択→最下層id解決(`resolveOrganizationUnitId`。送信されたidの実在・未削除をサーバー側で検証)と、保存済み最下層idから3段の初期選択を逆算する`resolveSelectionFromLeaf`+単体テスト
- 経験年数は入力項目にせず、自動計算である旨の注意書きを表示する

## 受け入れ基準

- 必須・文字数・カナのバリデーションが docs/screens.md basic-info のとおり機能する
- 所属の保存が「選択された最下層の組織単位のid」になる
- 卒業年月の予想値差し込みがカレンダーボタン押下時のみ発生し、クリア・空保存ができる
- 保存で`is_registered=true`となり`/mypage`へ遷移する

## 検証方法

1. `lib/basic-info-schema.test.ts`・`lib/graduation.test.ts`・`lib/organization-unit.test.ts`を実行する
2. Playwrightで初回登録フロー(ログイン→/basic-info→保存→/mypage)を通しで確認する
3. `npm run verify`が通ることを確認する
