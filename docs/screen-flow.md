# 画面遷移図

Mermaid記法。GitHub/VS Code/Claude Codeでそのまま図としてレンダリングされる。

<!--
この図の読み方・方針:
- 主要な業務遷移のみを描く。パンくずリストによる上位階層への移動
  （全画面共通、loginを除く）と「戻る」は矢印を省略している
- エッジのラベルはボタン・条件を表す。ロール制限があるものはラベルに記載
- confirm-dialog（削除確認モーダル）は画面遷移を伴わないため図に含めない
  （呼び出し元: project-form・account-edit・master-*。詳細はscreens.md参照）
- print-preview（印刷用プレビュー）への遷移は未実装（resume-detail/mypageに
  「準備中」表示のみ）。図には目指す仕様として記載している
- 本図はscreens.md・schema.mdの確定仕様と整合させている
-->

```mermaid
flowchart TD
    login[login ログイン]

    subgraph top["トップ"]
        home[home トップ]
    end

    subgraph my["私の経歴書（一般社員／管理職）"]
        mypage["mypage 私の経歴書（[表紙]/[実績]タブ）"]
        basicinfo[basic-info 基本情報登録（初回登録の単独画面）]
        projectform[project-form プロジェクト経歴登録・編集]
    end

    subgraph search["経歴書参照・分析"]
        resumelist[resume-list 経歴書一覧]
        resumedetail[resume-detail 経歴書詳細]
        skillmap[skill-map スキルマップ／組織ダッシュボード]
    end

    subgraph output["出力（未実装）"]
        printpreview[print-preview 印刷用プレビュー]
    end

    subgraph admin["管理（管理職のみ）"]
        accountlist[account-list アカウント一覧]
        accountnew[account-new 新規アカウント登録]
        accountedit[account-edit アカウント編集]
        masterhome[master-home マスタ管理トップ]
        masterskills[master-skills スキルマスタ]
        mastercertifications[master-certifications 資格マスタ]
        masterprojectroles[master-project-roles 現場ポジションマスタ]
        masterorgunits[master-org-units 部署マスタ]
        mastersites[master-sites 現場マスタ]
    end

    %% ---- 認証・初回ログイン（ロール別分岐） ----
    %% ログイン処理自体は常にトップ（/）へリダイレクトし、未登録の
    %% 一般社員／管理職は認証必須ページ共通のガードがbasic-infoへ誘導する
    %% （screens.md冒頭「認証・認可の共通仕様」参照）。図は結果としての導線を描く。
    login -->|"一般社員・管理職 かつ is_registered=false"| basicinfo
    login -->|"登録済み、または人事・営業（basic-infoを経ず直行）"| home

    %% ---- トップからの導線（タイルはロールで表示制御） ----
    home -->|"私の経歴書（一般社員／管理職）"| mypage
    home -->|"経歴書検索（全ロール。一般社員は閲覧範囲内のみ）"| resumelist
    home -->|"スキルマップ（全ロール共通）"| skillmap
    home -->|"アカウント管理（管理職）"| accountlist
    home -->|"マスタ管理（管理職）"| masterhome
    masterhome --> masterskills
    masterhome --> mastercertifications
    masterhome --> masterprojectroles
    masterhome --> masterorgunits
    masterhome --> mastersites

    %% ---- 私の経歴書 ----
    %% 基本情報／経歴概要・自己PR／スキル／資格の編集はmypage[表紙]タブ内の
    %% セクション編集のため画面遷移を伴わない。
    %% プロジェクト経歴一覧はmypage[実績]タブが担う。
    mypage -->|"新規追加・編集（[実績]タブ）"| projectform
    basicinfo -->|"保存（初回登録）"| mypage
    projectform -->|"保存・削除（[実績]タブへ）"| mypage

    %% ---- 経歴書参照 ----
    resumelist -->|詳細| resumedetail

    %% ---- 出力（2段階フロー: 出力ボタン→プレビュー→DL/印刷。未実装） ----
    resumedetail -->|"PDF出力（準備中）"| printpreview
    mypage -->|"PDF出力（準備中）"| printpreview
```

## 補足

- **アカウント管理**: account-listから「新規アカウント登録」でaccount-newへ、行の「編集」でaccount-editへ。保存後はどちらもaccount-listへ戻る
- **人事・営業の初回ログイン**: 経歴書を作成しないため、basic-info（初回登録）を経ずhomeへ直行する。ログイン成立時に`is_registered`を自動でTRUEに更新（login参照）
- **ログインのエラー分岐**（未登録／退職済み／プロバイダ不一致）は遷移を伴わない（loginに留まる）ため図から省略。文言はscreens.mdのlogin参照
- **account-editの退職処理・現職に戻す**は`employment_status`による排他表示。どちらもconfirm-dialogで確認後、account-editに留まる
- **PDF出力（print-preview）は未実装**。resume-detail/mypageには「準備中」タイルのみ配置している。Excel出力は提供しない
