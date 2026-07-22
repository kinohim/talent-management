# 現場/社員最寄駅マップ（近隣検索） テスト仕様

現場/社員最寄駅マップ（site-search）画面を支える近隣検索ロジック（`lib/site-nearby-search.ts`）を対象としたユニットテスト。HeartRails Express APIによる駅座標の取得は`lib/heartrails.ts`側でテスト済みのため、本ファイルでは`vi.mock`で差し替える。

| テストファイル | 対象ソース | ケース数 |
|---|---|---|
| `lib/site-nearby-search.test.ts` | `lib/site-nearby-search.ts` | 20 |

## searchSiteNearbyEmployees

対象: `lib/site-nearby-search.ts` / テスト: `lib/site-nearby-search.test.ts`
概要: 現場の最寄駅を基準に、半径内（近隣）または同一路線に住む在職中の社員を距離順に返す。現在その現場に参画中（`project.endDate=null`かつ`project.siteId`が一致）の社員は、近隣・同一路線の一致条件とは独立に別枠（`currentParticipants`）で返す（`employee.projects`のselectに含まれるため追加のクエリは発行しない）
前提: `vi.mock("@/lib/prisma")` で `prisma.site.findUnique`/`prisma.employee.findMany` をモック、`vi.mock("@/lib/heartrails")` で `fetchStationGeo` をモック（`HeartRailsApiError`は実体をそのまま使う）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | 半径内（近隣）の社員を距離とともに返す | 正常系 |
| 2 | 半径外でも現場と同一路線の社員は候補に含める | 正常系 |
| 3 | 半径内であれば現場と路線が異なる社員も候補に含める（半径判定は路線に依存しない） | 正常系 |
| 4 | 現在参画中（`project.endDate=null`）の現場名を候補社員の情報に含める | 正常系 |
| 5 | 保有スキルは重複を除去して返す | 正常系 |
| 6 | 候補社員は現場からの距離が近い順にソートされる | 正常系 |
| 7 | 半径内にも同一路線にも該当しない社員は候補から除外する | 正常系 |
| 8 | 退職済み（`EmploymentStatus.RETIRED`）の社員は候補から除外する | 異常系 |
| 9 | 対象の現場が存在しない場合は`site: null`・空配列を返す | 異常系 |
| 10 | 現場に最寄駅が未設定の場合は`site: null`・空配列を返す | 異常系 |
| 11 | 現場の最寄駅の座標が解決できない場合は`site: null`・空配列を返す | 異常系 |
| 12 | 距離ちょうど半径（境界値）の社員は近隣に含める | 境界値 |
| 13 | 社員の最寄駅の座標が解決できない場合、`unresolvedStationCount`に計上し候補から除外する | 境界値 |
| 14 | 同じ未解決駅に複数人住んでいる場合、`unresolvedStationCount`は駅数ではなく人数分カウントする | 境界値 |
| 15 | 現在参画中（このsiteId・`project.endDate=null`）だが近隣にも同一路線にも一致しない社員を、候補社員一覧とは別に`currentParticipants`として返す | 正常系 |
| 16 | 近隣または同一路線に一致し、かつ現在参画中の社員は、候補社員一覧(`employees`)と`currentParticipants`の両方に重ねて含める(重複除外しない) | 正常系 |
| 17 | 現在参画中でない社員は`currentParticipants`に含めない | 正常系 |
| 18 | 現場の最寄駅の座標取得でHeartRails Express APIがエラー（`HeartRailsApiError`）を返した場合、座標未解決と同様に`site: null`を返す（例外を再送出しない） | 異常系 |
| 19 | 社員の最寄駅の座標取得でHeartRails Express APIがエラーを返した場合、その社員は座標未解決として扱い候補から除外する（処理全体は中断しない） | 異常系 |
| 20 | `HeartRailsApiError`以外の例外が発生した場合は握りつぶさずそのまま再送出する | 異常系 |
