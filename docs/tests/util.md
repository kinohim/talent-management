# 共通ユーティリティ テスト仕様

日付整形・パンくずリスト・一覧クエリ（ページング／ソート）・Prisma エラー判定・HeartRails Express API連携（最寄り駅の路線・駅・座標取得）・路線カテゴリ分類の共通ユーティリティを対象とする。

| テストファイル | 対象ソース | ケース数 |
|---|---|---|
| `lib/date-format.test.ts` | `lib/date-format.ts` | 18 |
| `lib/breadcrumbs.test.ts` | `lib/breadcrumbs.ts` | 12 |
| `lib/list-query.test.ts` | `lib/list-query.ts` | 12 |
| `lib/prisma-errors.test.ts` | `lib/prisma-errors.ts` | 4 |
| `lib/heartrails.test.ts` | `lib/heartrails.ts` | 15 |
| `lib/line-category.test.ts` | `lib/line-category.ts` | 10 |

## toDateInputValue / parseDateOnly

対象: `lib/date-format.ts` / テスト: `lib/date-format.test.ts`
概要: `<input type="date">` 用の YYYY-MM-DD 文字列と Date（UTC 深夜）を相互変換する
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | nullish 値は空文字を返す | 境界値 |
| 2 | UTC 基準で往復一致する | 正常系 |
| 3 | 年始・月末などの境界日でもズレない | 境界値 |

## toMonthInputValue / parseYearMonth

対象: `lib/date-format.ts` / テスト: `lib/date-format.test.ts`
概要: `<input type="month">` 用の YYYY-MM 文字列と Date（1日固定）を相互変換する
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | nullish 値は空文字を返す | 境界値 |
| 2 | YYYYMM01 形式（1日固定）で往復一致する | 正常系 |
| 3 | 年をまたぐ月でもズレない | 境界値 |

## toDisplayDate

対象: `lib/date-format.ts` / テスト: `lib/date-format.test.ts`
概要: Date を「YYYY年M月D日」の日本語表示文字列に変換する
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | nullish 値は空文字を返す | 境界値 |
| 2 | 日本語形式に変換する | 正常系 |
| 3 | 年始の境界日でもズレない | 境界値 |

## toDisplayYearMonth

対象: `lib/date-format.ts` / テスト: `lib/date-format.test.ts`
概要: Date を「YYYY年M月」の日本語表示文字列に変換する
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | nullish 値は空文字を返す | 境界値 |
| 2 | 日本語形式に変換する | 正常系 |
| 3 | 年をまたぐ月でもズレない | 境界値 |

## toDisplayDateTime

対象: `lib/date-format.ts` / テスト: `lib/date-format.test.ts`
概要: UTC の瞬間を JST の「YYYY年M月D日 HH:mm」表示に変換する
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | nullish 値は空文字を返す | 境界値 |
| 2 | UTC 瞬間を JST の日本語形式（時分まで）に変換する | 正常系 |
| 3 | JST で日付が繰り上がる UTC 瞬間でも正しく変換する | 境界値 |

## todayJstDateOnly

対象: `lib/date-format.ts` / テスト: `lib/date-format.test.ts`
概要: 現在時刻から JST 基準の「今日」を UTC 深夜の Date として返す
前提: モックなし（純粋関数。基準時刻は引数で注入）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | JST の今日を UTC 深夜の Date として返す（JST/UTC が別日の時刻） | 境界値 |
| 2 | JST と UTC が同日の時刻ではその日を返す | 正常系 |

## nowJstClock

対象: `lib/date-format.ts` / テスト: `lib/date-format.test.ts`
概要: 現在時刻を JST の壁時計として UTC getter で読める Date に変換する
前提: モックなし（純粋関数。基準時刻は引数で注入）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | JST の壁時計を UTC getter で読める Date を返す（月が繰り上がる時刻） | 境界値 |

## getBreadcrumbTrail

対象: `lib/breadcrumbs.ts` / テスト: `lib/breadcrumbs.test.ts`
概要: パス名からパンくずリスト（トップからの階層配列）を解決する。動的セグメントはマップ照合時のみ `[id]` に正規化し、返す `path` は入力パスの実セグメントに復元する（動的ルートが親になってもリンクが壊れない）
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | トップは単独のパンくずを返す | 正常系 |
| 2 | 私の経歴書はトップ→私の経歴書の2件を返す | 正常系 |
| 3 | 基本情報登録はトップ→私の経歴書→基本情報登録の3件を返す | 正常系 |
| 4 | プロジェクト経歴登録の親は私の経歴書（実績タブの合成キー） | 正常系 |
| 5 | プロジェクト経歴編集（動的 ID）は `[id]` 正規化で解決し、自身の path は実パスで返す | 正常系 |
| 6 | 経歴書詳細（動的 ID）の親は経歴書一覧（戻り導線の一本化） | 正常系 |
| 7 | 廃止した単独編集画面のパスは未登録として空配列を返す | 異常系 |
| 8 | 未登録パスは空配列を返す | 異常系 |
| 9 | PDF出力プレビュー（/resumes/000001/pdf-preview）の親は経歴書詳細で、親の path も実パス（/resumes/000001）で返す | 正常系 |
| 10 | /mypage/pdf-preview の親は私の経歴書 | 正常系 |
| 11 | from=list のとき PDF出力プレビューの親は経歴書一覧（一覧の「PDF」発の合成キー） | 正常系 |
| 12 | 合成キーがない画面では from=list を無視して従来どおり解決する | 境界値 |

## parsePagination

対象: `lib/list-query.ts` / テスト: `lib/list-query.test.ts`
概要: クエリパラメータからページ番号・ページサイズを安全にパースする
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | 未指定は page=1・pageSize=30 | 境界値 |
| 2 | 正常値をパースする | 正常系 |
| 3 | 不正な page は1にフォールバックする | 異常系 |
| 4 | 許可リスト外の pageSize は30にフォールバックする | 異常系 |
| 5 | 配列値は先頭を使う | 正常系 |

## parseSort

対象: `lib/list-query.ts` / テスト: `lib/list-query.test.ts`
概要: クエリパラメータからソートキー・並び順を許可リストに基づいてパースする
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | 許可リスト内のキーと order をパースする | 正常系 |
| 2 | 許可リスト外・未指定は sortKey=null | 異常系 |
| 3 | order は desc 以外すべて asc | 異常系 |

## clampPage

対象: `lib/list-query.ts` / テスト: `lib/list-query.test.ts`
概要: 総件数に対してページ番号を丸め、skip とページ総数を算出する
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | 範囲内のページはそのまま | 正常系 |
| 2 | 最終ページ超過は最終ページへ丸める | 境界値 |
| 3 | 0件でも pageCount は1（page=1, skip=0） | 境界値 |
| 4 | 件数がページサイズちょうどのとき pageCount は1 | 境界値 |

## isUniqueConstraintViolation

対象: `lib/prisma-errors.ts` / テスト: `lib/prisma-errors.test.ts`
概要: unknown なエラーが Prisma の一意制約違反（P2002）かを判定する
前提: モックなし（実際の `Prisma.PrismaClientKnownRequestError` インスタンスを生成して判定）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | P2002 なら true | 正常系 |
| 2 | P2002 以外の Prisma エラーコードなら false | 正常系 |
| 3 | Prisma のエラーでなければ false | 異常系 |
| 4 | エラーでない値（null/undefined/文字列）なら false | 境界値 |

## fetchLines / fetchStations

対象: `lib/heartrails.ts` / テスト: `lib/heartrails.test.ts`
概要: HeartRails Express API（`getLines`/`getStations`）から都道府県の路線一覧・路線の駅一覧を取得する。basic-info（社員の最寄り駅）・master-sites（現場の最寄り駅）の両方が利用する共通クライアント
前提: `vi.stubGlobal("fetch", vi.fn())` でグローバル `fetch` をモック

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | fetchLines: 複数路線を重複除去・五十音順で返す | 正常系 |
| 2 | fetchLines: レスポンスが単一要素（配列でない）でも配列として扱う | 境界値 |
| 3 | fetchLines: HeartRailsが`error`を返した場合は空配列 | 異常系 |
| 4 | fetchLines: fetch自体が失敗（ネットワークエラー）した場合は`HeartRailsApiError`をthrowする | 異常系 |
| 5 | fetchLines: HTTPエラーステータスの場合は`HeartRailsApiError`をthrowする | 異常系 |
| 6 | fetchLines: レスポンスのJSON解析に失敗した場合は`HeartRailsApiError`をthrowする | 異常系 |
| 7 | fetchStations: 複数駅を重複除去・五十音順で返す | 正常系 |
| 8 | fetchStations: レスポンスが単一要素でも配列として扱う | 境界値 |
| 9 | fetchStations: HeartRailsが`error`を返した場合は空配列 | 異常系 |
| 10 | fetchStations: fetch自体が失敗した場合は`HeartRailsApiError`をthrowする | 異常系 |

## fetchStationGeo

対象: `lib/heartrails.ts` / テスト: `lib/heartrails.test.ts`
概要: 駅名から緯度経度を取得する（site-search・現場/社員最寄駅マップの地図ピン用）。同名駅が複数路線に存在する場合、`lineHint`と一致する候補を優先する
前提: `vi.stubGlobal("fetch", vi.fn())` でグローバル `fetch` をモック

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | 候補が1件のとき、その緯度経度を返す | 正常系 |
| 2 | 複数候補がある場合、`lineHint`と一致する候補を優先する | 正常系 |
| 3 | `lineHint`未指定・不一致の場合は先頭候補を使う | 境界値 |
| 4 | 該当駅が0件の場合はnullを返す | 異常系 |
| 5 | 緯度経度が数値に変換できない場合はnullを返す | 境界値 |

## categorizeLine / groupLinesByCategory

対象: `lib/line-category.ts` / テスト: `lib/line-category.test.ts`
概要: HeartRails Express APIが返す路線名の文字列（運営会社種別・カテゴリの情報を持たない）から、「JR」「地下鉄」「私鉄・その他」「モノレール・新交通」「新幹線」のいずれかを判定するキーワードベースの分類（`NearestStationSelect`の路線選択アコーディオン用）。分類は完全な正解を保証するものではなく、未知の私鉄・第三セクター路線は「私鉄・その他」に入る前提のヒューリスティックである
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | 「JR」を含む路線名はJRに分類する（例: JR山手線） | 正常系 |
| 2 | 「新幹線」を含む路線名は新幹線に分類する（例: 東海道新幹線） | 正常系 |
| 3 | 「地下鉄」または「メトロ」を含む路線名は地下鉄に分類する（例: 東京メトロ丸ノ内線・福岡市地下鉄空港線） | 正常系 |
| 4 | 都営4路線（浅草線・三田線・新宿線・大江戸線）は地下鉄に分類する（路線名に「地下鉄」「メトロ」を含まないため個別判定） | 境界値 |
| 5 | 「モノレール」「新交通」「新都市交通」「ライナー」を含む路線名はモノレール・新交通に分類する（例: 東京モノレール羽田空港線・埼玉新都市交通伊奈線・日暮里・舎人ライナー） | 正常系 |
| 6 | モノレール・新交通の個別リストに一致する路線名はモノレール・新交通に分類する（例: ゆりかもめ） | 境界値 |
| 7 | いずれにも該当しない路線名は私鉄・その他に分類する（例: 京王線） | 正常系 |
| 8 | 「新幹線」と「JR」の両方を含む路線名は新幹線を優先する | 境界値 |
| 9 | groupLinesByCategory: 路線名の配列をカテゴリごとにグループ化し、各カテゴリ内は入力順を保つ | 正常系 |
| 10 | groupLinesByCategory: 該当路線がないカテゴリも空配列としてキーを持つ | 境界値 |
