# 移植指示書: 最寄り駅選択(HeartRails連携)+ 現場/参画者一覧(Googleマップ)

対象ブランチ: `main`(このドキュメント作成時点のHEAD)
移植元: `talent-app` リポジトリ `feature/kinoshita` ブランチ

## 0. 前提・全体像

この2機能は移植元(talent-app)では実装済みだが、`main` ブランチとは以下の点で構造・技術スタックが異なるため、**ファイルをそのままコピーするのではなく、`main` の実装規約に合わせて書き直す**必要がある。

| 項目 | 移植元(talent-app) | 移植先(このリポジトリ main) |
|---|---|---|
| ディレクトリ | `src/app`, `src/components`, `src/lib` | `app`, `components`, `lib`(`src/`なし。`@/*` は `./*` にマップ) |
| Next.js | 15 | 16.2.10 |
| Auth.js | next-auth v4(`getServerSession(authOptions)`) | next-auth v5 beta(`auth()`、`@/lib/auth`) |
| Prisma | 6.2.1、schema内に`datasource.url` | 7.8.0、`prisma.config.ts`分離、Client import元は `@/generated/prisma/client` |
| Tailwind | v3(config-based) | v4(CSS-first) |
| ロール | `ADMIN`/`MANAGER`/一般社員/人事営業 | `EMPLOYEE`/`HR_SALES`/`MANAGER`(`ADMIN`なし) |
| フォーム | 主に`useState`+`fetch`送信 | Server Actions + `useActionState` + ネイティブ`<form action={}>`(react-hook-form不使用) |
| 画面ID | `REF001`等の連番(`docs/screens.md`) | URLセグメント由来のkebab-case、連番なし |

このドキュメントは「何をどこに、どう書き直すか」を機能A→機能Bの順に説明する。実装順序は **機能A(駅選択)→機能B(現場近隣検索・地図)** を推奨する(機能Bは機能Aの`heartrails.ts`を再利用するため)。

各ステップ完了後は `npm run verify`(`prisma generate` → ESLint → `tsc --noEmit` → `vitest run`)を実行し、通過を確認してから次に進むこと。DBスキーマ変更は必ず `npx prisma migrate dev --name <name>` で行い、`db push` は使わない。

---

## 1. 機能A: 最寄り駅 都道府県→路線→駅 3段階プルダウン(HeartRails Express API)

### 1.1 新規ファイル: `lib/heartrails.ts`

HeartRails Express API(認証・登録不要の無料API)のクライアント。移植元のロジックはそのまま使えるが、既存の外部fetch呼び出しの前例が `lib/auth.ts` のGitHub OAuth連携(bare `fetch` + try/catch、SDK不使用)しかないため、そのスタイルに合わせて簡潔に保つ。

```ts
// lib/heartrails.ts
const API_BASE = "https://express.heartrails.com/api/json";

export class HeartRailsApiError extends Error {}

type HeartRailsStation = { name: string; x?: string; y?: string; line?: string };
type HeartRailsResponse = {
  line?: string | string[];
  station?: HeartRailsStation[] | HeartRailsStation;
  error?: string;
};

async function callApi(params: Record<string, string>): Promise<HeartRailsResponse | null> {
  const url = `${API_BASE}?${new URLSearchParams(params).toString()}`;
  let res: Response;
  try {
    res = await fetch(url, { next: { revalidate: 3600 } });
  } catch (err) {
    throw new HeartRailsApiError(`HeartRails Expressへの接続に失敗しました: ${(err as Error).message}`);
  }
  if (!res.ok) {
    throw new HeartRailsApiError(`HeartRails Express APIがエラーを返しました: HTTP ${res.status}`);
  }
  const data = (await res.json()) as { response?: HeartRailsResponse };
  if (data?.response?.error) return null;
  return data.response ?? null;
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (Array.isArray(value)) return value;
  return value !== undefined ? [value] : [];
}

export async function fetchLines(prefecture: string): Promise<string[]> {
  const response = await callApi({ method: "getLines", prefecture });
  const lines = toArray(response?.line);
  return Array.from(new Set(lines)).sort((a, b) => a.localeCompare(b, "ja"));
}

export async function fetchStations(line: string): Promise<string[]> {
  const response = await callApi({ method: "getStations", line });
  const stations = toArray(response?.station).map((s) => s.name);
  return Array.from(new Set(stations)).sort((a, b) => a.localeCompare(b, "ja"));
}

export type StationGeo = { lat: number; lng: number; line: string };

// 駅名から緯度経度を取得する(機能B・現場/参画者一覧の地図ピン用)。
// 同名駅が複数路線に存在する場合、lineHintと一致する候補を優先する。
export async function fetchStationGeo(
  stationName: string,
  lineHint?: string,
): Promise<StationGeo | null> {
  const response = await callApi({ method: "getStations", name: stationName });
  const candidates = toArray(response?.station).filter((s) => s.x !== undefined && s.y !== undefined);
  if (candidates.length === 0) return null;

  const matched = lineHint ? candidates.find((s) => s.line === lineHint) : undefined;
  const chosen = matched ?? candidates[0];

  const lat = Number(chosen.y);
  const lng = Number(chosen.x);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

  return { lat, lng, line: chosen.line ?? lineHint ?? "" };
}
```

`fetchStationGeo` は機能Bでのみ使うが、同じHeartRailsクライアントに同居させる(移植元と同じ構成)。

テスト: `lib/heartrails.test.ts` を co-located で追加。このリポジトリの `lib/*.test.ts` はもっぱら `vi.mock("@/lib/prisma", ...)` でPrismaをモックする書き方が中心で、`fetch` をモックした前例はまだない。`vi.stubGlobal("fetch", vi.fn())` で代用し、`fetchLines`/`fetchStations`/`fetchStationGeo` それぞれの正常系・単一要素レスポンス(配列化)・エラー系をテストする。

### 1.2 新規ファイル: `lib/prefectures.ts`、`lib/railway-line-category.ts`

移植元の実装をそのまま移植してよい(純粋な定数・分類ロジックで、フレームワーク依存がないため)。

- `lib/prefectures.ts`: 47都道府県の固定配列 `PREFECTURES`(HeartRailsの`getPrefectures`は呼ばず、アプリ内定数として持つ)。
- `lib/railway-line-category.ts`: `categorizeLine`/`groupLinesByCategory`。路線名の文字列パターンでJR/地下鉄/私鉄・その他/モノレール・新交通/新幹線に分類する(プルダウンのアコーディオン表示用)。

テスト: `lib/railway-line-category.test.ts` も co-located でそのまま移植可能。

### 1.3 新規ファイル: `components/ui/NearestStationSelect.tsx`

basic-info(社員の最寄り駅)と master/sites(現場の最寄り駅、機能B)の両方から使う共有コンポーネントのため、機能ごとのディレクトリ(`components/basic-info/`等)ではなく、既存の共有UI置き場 `components/ui/`(`ClearableInput`/`PillSelect`等と同じ場所)に置く。

参考にするパターンは `components/basic-info/OrganizationUnitSelect.tsx`(`name`属性付き`<select>`+親変更で子をリセット、`useState`で選択値を保持)。相違点は、路線・駅の一覧が props で渡される静的リストではなく `/api/railways`・`/api/stations` への都度fetchになること。

```tsx
// components/ui/NearestStationSelect.tsx
"use client";

import { useState } from "react";
import { PREFECTURES } from "@/lib/prefectures";

export function NearestStationSelect({
  nameLine,
  nameName,
  defaultLine,
  defaultName,
}: {
  nameLine: string; // 路線名inputのname属性(例: "nearestStationLine")
  nameName: string; // 駅名inputのname属性(例: "nearestStationName")
  defaultLine: string | null;
  defaultName: string | null;
}) {
  const [prefecture, setPrefecture] = useState("");
  const [line, setLine] = useState(defaultLine ?? "");
  const [station, setStation] = useState(defaultName ?? "");
  const [lines, setLines] = useState<string[]>(defaultLine ? [defaultLine] : []);
  const [stations, setStations] = useState<string[]>(defaultName ? [defaultName] : []);
  const [error, setError] = useState<string | null>(null);

  async function handlePrefectureChange(value: string) {
    setPrefecture(value);
    setLine("");
    setStation("");
    setLines([]);
    setStations([]);
    setError(null);
    if (!value) return;
    try {
      const res = await fetch(`/api/railways?prefecture=${encodeURIComponent(value)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLines(data.items ?? []);
    } catch {
      setError("路線一覧の取得に失敗しました");
    }
  }

  async function handleLineChange(value: string) {
    setLine(value);
    setStation("");
    setStations([]);
    setError(null);
    if (!value) return;
    try {
      const res = await fetch(`/api/stations?line=${encodeURIComponent(value)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setStations(data.items ?? []);
    } catch {
      setError("駅一覧の取得に失敗しました");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <select
          value={prefecture}
          onChange={(e) => handlePrefectureChange(e.target.value)}
          className="h-[42px] rounded border px-3 py-2"
        >
          <option value="">都道府県を選択</option>
          {PREFECTURES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select
          value={line}
          onChange={(e) => handleLineChange(e.target.value)}
          disabled={lines.length === 0}
          className="h-[42px] rounded border px-3 py-2 disabled:opacity-50"
        >
          <option value="">路線を選択</option>
          {lines.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        <select
          name={nameName}
          value={station}
          onChange={(e) => setStation(e.target.value)}
          disabled={stations.length === 0}
          className="h-[42px] rounded border px-3 py-2 disabled:opacity-50"
        >
          <option value="">駅を選択</option>
          {stations.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      {/* 路線名は3つ目のselectのvalueと同期させ、実際に送信するのはこのhidden inputにする */}
      <input type="hidden" name={nameLine} value={line} readOnly />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
```

> 補足: 移植元の `PulldownSelect`(検索欄付き・アコーディオン式ポップアップの自作コンポーネント)は流用せず、既存の `OrganizationUnitSelect.tsx` と同じネイティブ`<select>`に簡略化することを推奨する。理由: (1) このリポジトリのフォームは一貫してネイティブ`<select>`/`<input>`に`name`属性を持たせてFormDataで送信する設計であり、移植元のような独自ポップアップUIの前例がない、(2) 路線名・駅名ともに数十〜百件程度で、ネイティブselectでも実用上問題ない。UXの検索性を重視するなら`components/ui/PillSelect.tsx`のパターン(ラジオボタン+ラベル)も検討できるが、駅名は選択肢数が多く不向きなため非推奨。

テスト: このコンポーネント自体のテストは移植元にも無いため、新規作成は必須ではない。

### 1.4 新規ファイル: `app/api/railways/route.ts`、`app/api/stations/route.ts`

このリポジトリの `app/api/` は現状 `app/api/career-summary/generate/route.ts` が唯一の非authルート例。そのパターン(`auth()`チェック→401、zodバリデーション、ローカルの`errorResponse`ヘルパー、`NextResponse.json`)を踏襲する。認証のみでロール制限は不要(社員が自分の最寄り駅を選ぶ用途のため)。

```ts
// app/api/railways/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { HeartRailsApiError, fetchLines } from "@/lib/heartrails";
import { PREFECTURES } from "@/lib/prefectures";

function errorResponse(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

const querySchema = z.object({ prefecture: z.string().min(1) });

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return errorResponse(401, "ログインしてください。");

  const parsed = querySchema.safeParse({
    prefecture: req.nextUrl.searchParams.get("prefecture") ?? "",
  });
  if (!parsed.success || !PREFECTURES.includes(parsed.data.prefecture)) {
    return NextResponse.json({ items: [] });
  }

  try {
    const items = await fetchLines(parsed.data.prefecture);
    return NextResponse.json({ items });
  } catch (err) {
    if (err instanceof HeartRailsApiError) return errorResponse(502, err.message);
    throw err;
  }
}
```

```ts
// app/api/stations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { HeartRailsApiError, fetchStations } from "@/lib/heartrails";

function errorResponse(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

const querySchema = z.object({ line: z.string().min(1) });

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return errorResponse(401, "ログインしてください。");

  const parsed = querySchema.safeParse({ line: req.nextUrl.searchParams.get("line") ?? "" });
  if (!parsed.success) return NextResponse.json({ items: [] });

  try {
    const items = await fetchStations(parsed.data.line);
    return NextResponse.json({ items });
  } catch (err) {
    if (err instanceof HeartRailsApiError) return errorResponse(502, err.message);
    throw err;
  }
}
```

### 1.5 既存ファイルの改修: `components/basic-info/BasicInfoForm.tsx`

現状(170〜194行目付近)、`nearestStationLine`/`nearestStationName` はそれぞれ独立した `ClearableInput`(フリーテキスト)になっている。これを `NearestStationSelect` に置き換える。

```tsx
// 変更前(170〜194行目付近)
<div className="grid grid-cols-2 gap-2">
  <div className="flex flex-col gap-1">
    <label htmlFor="nearestStationLine" className="text-sm font-medium">路線名</label>
    <ClearableInput id="nearestStationLine" name="nearestStationLine" placeholder="例: JR山手線" defaultValue={defaultValues.nearestStationLine} />
  </div>
  <div className="flex flex-col gap-1">
    <label htmlFor="nearestStationName" className="text-sm font-medium">駅名</label>
    <ClearableInput id="nearestStationName" name="nearestStationName" placeholder="例: 渋谷駅" defaultValue={defaultValues.nearestStationName} />
  </div>
</div>

// 変更後
<div>
  <label className="text-sm font-medium">最寄駅</label>
  <NearestStationSelect
    nameLine="nearestStationLine"
    nameName="nearestStationName"
    defaultLine={defaultValues.nearestStationLine || null}
    defaultName={defaultValues.nearestStationName || null}
  />
</div>
```

`import { NearestStationSelect } from "@/components/ui/NearestStationSelect";` を追加。`name`属性で送信される値は変わらない(`nearestStationLine`/`nearestStationName`)ため、`saveBasicInfo`(`app/(authenticated)/mypage/actions.ts`)・`lib/basic-info-schema.ts` は**変更不要**。`useSectionEdit()`(mypage埋め込み時)・`variant: "register"`(単独`/basic-info`画面)の両方でこのフォームは共通利用されるため、置き換え後に両方の画面で動作確認すること。

**Prismaスキーマ・マイグレーションは不要**: `Employee` モデルには既に `nearestStationLine`/`nearestStationName`(`VarChar(100)`、null許容)が存在する(`prisma/schema.prisma` 111〜112行目)。

---

## 2. 機能B: 現場/参画者一覧(現場近隣の社員をGoogleマップに表示)

移植元の画面名は「REF009」だが、このリポジトリに番号体系はない。新規ページのURLを `/site-search` とするなら、画面IDは `site-search` になる(1.5節末尾および3節を参照)。

### 2.1 マイグレーション: `Site` モデルに最寄り駅カラムを追加

`Site` モデル(`prisma/schema.prisma` 415〜435行目)には現状 `siteName`/`organizationUnitId` しかなく、最寄り駅カラムがない。`Employee` と同じ形で追加する。緯度経度カラムは追加しない(移植元もHeartRailsから都度解決するだけで永続化していない設計を踏襲する。理由は`docs/decisions.md`に「経路計算はしない/Googleは地図描画のみに使う」として転記する、2.6節参照)。

```prisma
model Site {
  id       Int    @id @default(autoincrement())
  siteName String @unique @map("site_name") @db.VarChar(100)
  organizationUnitId Int? @map("organization_unit_id")
  nearestStationLine String? @map("nearest_station_line") @db.VarChar(100)
  nearestStationName String? @map("nearest_station_name") @db.VarChar(100)

  organizationUnit OrganizationUnit? @relation(fields: [organizationUnitId], references: [id])
  projects         Project[]
  ...
}
```

```
npx prisma migrate dev --name add_site_nearest_station
```

### 2.2 新規ファイル: `lib/site-nearby-search.ts`

移植元の `searchSiteNearbyEmployees(siteId, radiusKm)` をこのリポジトリのモデル名・リレーション名に合わせて書き直す(ロジック自体は変えない: ハバーサイン距離 + 同一路線マッチング)。

主な名前の違い:
- 移植元 `e.department?.departmentName` → このリポジトリは `e.organizationUnit?.unitName`
- 移植元 `e.projects[0]?.site.siteName`(現在参画中の現場)→ 同じ構造(`Project.endDate: null` が「現在参画中」)がこのリポジトリにも存在するのでそのまま使える
- 移植元 `e.skillLinks` → このリポジトリは `e.employeeSkills`(`employeeSkills[].skill.skillName`)
- 移植元 `user: { is: { isActive: true } }` で在職判定 → このリポジトリは `Employee.employmentStatus`(`EmploymentStatus.ACTIVE`)で判定する(`prisma/schema.prisma`の`EmploymentStatus` enum、`ACTIVE`/`RETIRED`)

```ts
// lib/site-nearby-search.ts
import { EmploymentStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { fetchStationGeo, type StationGeo } from "@/lib/heartrails";

export type SiteNearbyEmployee = {
  employeeId: string;
  name: string | null;
  organizationUnitName: string | null;
  currentSiteName: string | null;
  nearestStationLine: string;
  nearestStationName: string;
  skills: string[];
  lat: number;
  lng: number;
  distanceKm: number;
  matchedNearby: boolean;
  matchedSameLine: boolean;
};

export type SiteNearbyResult = {
  site: { id: number; name: string; stationLabel: string; lat: number; lng: number } | null;
  employees: SiteNearbyEmployee[];
  unresolvedStationCount: number;
};

const EARTH_RADIUS_KM = 6371;

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(Math.min(1, h)));
}

function stationKey(line: string | null, name: string): string {
  return `${line ?? ""}|${name}`;
}

export async function searchSiteNearbyEmployees(
  siteId: number,
  radiusKm: number,
): Promise<SiteNearbyResult> {
  const site = await prisma.site.findUnique({
    where: { id: siteId, deletedAt: null },
    select: { id: true, siteName: true, nearestStationLine: true, nearestStationName: true },
  });
  if (!site || !site.nearestStationName) {
    return { site: null, employees: [], unresolvedStationCount: 0 };
  }

  const siteGeo = await fetchStationGeo(site.nearestStationName, site.nearestStationLine ?? undefined);
  if (!siteGeo) {
    return { site: null, employees: [], unresolvedStationCount: 0 };
  }

  const employees = await prisma.employee.findMany({
    where: {
      deletedAt: null,
      employmentStatus: EmploymentStatus.ACTIVE,
      nearestStationName: { not: null },
    },
    select: {
      employeeId: true,
      name: true,
      nearestStationLine: true,
      nearestStationName: true,
      organizationUnit: { select: { unitName: true } },
      projects: {
        where: { deletedAt: null, endDate: null },
        orderBy: { startDate: "desc" },
        take: 1,
        select: { site: { select: { siteName: true } } },
      },
      employeeSkills: {
        where: { deletedAt: null },
        select: { skill: { select: { skillName: true } } },
      },
    },
  });

  // 最寄駅文字列ごとに1回だけ座標解決する(同じ駅に住む社員が多いため呼び出し回数を削減)
  const distinctStations = new Map<string, { line: string | null; name: string }>();
  for (const e of employees) {
    if (!e.nearestStationName) continue;
    const key = stationKey(e.nearestStationLine, e.nearestStationName);
    if (!distinctStations.has(key)) {
      distinctStations.set(key, { line: e.nearestStationLine, name: e.nearestStationName });
    }
  }

  const geoByKey = new Map<string, StationGeo | null>();
  await Promise.all(
    Array.from(distinctStations.entries()).map(async ([key, station]) => {
      geoByKey.set(key, await fetchStationGeo(station.name, station.line ?? undefined));
    }),
  );

  let unresolvedStationCount = 0;
  for (const geo of geoByKey.values()) if (!geo) unresolvedStationCount++;

  const results: SiteNearbyEmployee[] = [];
  for (const e of employees) {
    if (!e.nearestStationName) continue;
    const geo = geoByKey.get(stationKey(e.nearestStationLine, e.nearestStationName));
    if (!geo) continue;

    const distanceKm = haversineKm(siteGeo, geo);
    const matchedNearby = distanceKm <= radiusKm;
    const matchedSameLine = !!e.nearestStationLine && e.nearestStationLine === site.nearestStationLine;
    if (!matchedNearby && !matchedSameLine) continue;

    results.push({
      employeeId: e.employeeId,
      name: e.name,
      organizationUnitName: e.organizationUnit?.unitName ?? null,
      currentSiteName: e.projects[0]?.site.siteName ?? null,
      nearestStationLine: e.nearestStationLine ?? "",
      nearestStationName: e.nearestStationName,
      skills: [...new Set(e.employeeSkills.map((l) => l.skill.skillName))],
      lat: geo.lat,
      lng: geo.lng,
      distanceKm: Math.round(distanceKm * 10) / 10,
      matchedNearby,
      matchedSameLine,
    });
  }

  results.sort((a, b) => a.distanceKm - b.distanceKm);

  return {
    site: {
      id: site.id,
      name: site.siteName,
      stationLabel: `${site.nearestStationLine ?? ""} ${site.nearestStationName}`.trim(),
      lat: siteGeo.lat,
      lng: siteGeo.lng,
    },
    employees: results,
    unresolvedStationCount,
  };
}
```

テスト: `lib/site-nearby-search.test.ts` を co-located で追加。`vi.mock("@/lib/prisma", ...)` で `prisma.site.findUnique`/`prisma.employee.findMany` をモックし、`vi.mock("@/lib/heartrails", ...)` で `fetchStationGeo` をモックする(実在の駅名を使ったテストケースは移植元 `tests/lib/site-nearby-search.test.ts` を参考にしてよい)。

### 2.3 新規ファイル: `components/site-search/SiteNearbyMap.tsx`、`components/site-search/SiteSelectField.tsx`

Googleマップ読み込み(scriptタグ動的挿入)・赤(現場)/青(近隣)/緑(同一路線)ピン・凡例ブロック・「地図で見る」ボタンのロジックは移植元のまま流用できる。変更が必要なのは以下のみ:
- `import`パスを `@/lib/...`・`@/components/...` エイリアスに合わせる(このリポジトリは `@/*` → リポジトリルート)。
- `SiteNearbyEmployeeView` 型の `department` フィールドを `organizationUnitName` にリネーム(2.2節の型に合わせる)。

`@types/google.maps` が未導入のため、`package.json` の `devDependencies` に追加すること:
```
npm install -D @types/google.maps
```

`SiteNearbyMap.tsx`・`SiteSelectField.tsx` の中身は移植元 `talent-app/src/components/site-search/SiteNearbyMap.tsx`・`SiteSelectField.tsx`(凡例・現場最寄駅表示を含む最終版)をベースに、上記の型リネームのみ行って移植する。

### 2.4 新規ファイル: `app/(authenticated)/site-search/page.tsx`

このリポジトリの `master/sites/page.tsx` と同じ3段チェック(`auth()`→未ログインは`/login`→`resolveDestination`で未登録者を`/`以外へ誘導→ロールが`MANAGER`以外なら`/`)をインラインで実装する(このリポジトリには`requireManagerOrAdmin`のような汎用ガード関数がなく、Server Componentページは各pageごとにインラインチェックする慣習)。

```tsx
// app/(authenticated)/site-search/page.tsx
import { redirect } from "next/navigation";

import { SiteSelectField } from "@/components/site-search/SiteSelectField";
import { SiteNearbyMap } from "@/components/site-search/SiteNearbyMap";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { UserRole } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { resolveDestination } from "@/lib/auth-routing";
import { prisma } from "@/lib/prisma";
import { searchSiteNearbyEmployees } from "@/lib/site-nearby-search";

const RADIUS_OPTIONS = [3, 5, 10, 20] as const;
const DEFAULT_RADIUS: number = 5;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SiteSearchPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const destination = await resolveDestination(session.user);
  if (destination !== "/") redirect(destination);
  if (session.user.role !== UserRole.MANAGER) redirect("/");

  const sp = await searchParams;

  const sites = await prisma.site.findMany({
    where: { deletedAt: null },
    orderBy: { siteName: "asc" },
    select: { id: true, siteName: true, nearestStationLine: true, nearestStationName: true },
  });

  const siteIdRaw = first(sp.siteId);
  const siteId = siteIdRaw ? Number(siteIdRaw) : sites[0]?.id;

  const radiusRaw = Number(first(sp.radiusKm));
  const radiusKm: number = (RADIUS_OPTIONS as readonly number[]).includes(radiusRaw)
    ? radiusRaw
    : DEFAULT_RADIUS;

  const result = siteId
    ? await searchSiteNearbyEmployees(siteId, radiusKm)
    : { site: null, employees: [], unresolvedStationCount: 0 };

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <SectionHeading as="h1" eyebrow="SITE SEARCH" title="現場/参画者一覧" />
      {/* 以下、フォーム・地図・結果一覧は移植元 app/site-search/page.tsx を踏襲 */}
    </main>
  );
}
```

### 2.5 既存ファイルの改修: 現場マスタ(`master/sites`)に最寄り駅を追加

現場自体にも最寄り駅を設定できるようにする(機能Bの検索対象として現場の駅が必要)。

- `lib/site-master-schema.ts` の `parseSiteMasterForm` に `nearestStationLine`/`nearestStationName` の任意文字列バリデーションを追加(`lib/basic-info-schema.ts` と同じ、trim + max(100)、必須ではない)。戻り値の型 `SiteMasterFormParseResult` にも2フィールド追加。
- `app/(authenticated)/master/sites/actions.ts` の `saveSite` 内、`prisma.site.create`/`update`/再活性化の3箇所全てに `nearestStationLine`/`nearestStationName` を追加する(現状 `siteName`/`organizationUnitId` のみ)。
- `app/(authenticated)/master/sites/page.tsx` の `prisma.site.findMany({ select: {...} })` に2フィールド追加。
- `components/master/SiteMasterRow.tsx` の `SiteMasterSite` 型に2フィールド追加。view/editモード両方に `NearestStationSelect`(1.3節のコンポーネント)を追加。
- `components/master/SiteMasterManager.tsx` の `SiteAddForm` にも同様に追加。

### 2.6 ナビゲーション・パンくず・ドキュメントの追加

- `components/layout/HeaderNav.tsx` の `NAV_LINK_DEFS` に以下を追加:
  ```ts
  {
    key: "site-search",
    label: "現場/参画者一覧",
    href: "/site-search",
    roles: [UserRole.MANAGER],
  },
  ```
  (`HeaderNav.test.ts` にも `getHeaderNavLinks` のMANAGERロールで`site-search`が含まれることを確認するケースを追加)
- `lib/breadcrumbs.ts` の `BREADCRUMB_MAP` に追加(**必須**。未登録だとパンくずが空表示になる):
  ```ts
  "/site-search": { label: "現場/参画者一覧", parentPath: "/" },
  ```
- `docs/schema.md`: `site`テーブルの説明に `nearest_station_line`/`nearest_station_name`(自由記述、`employee`テーブルと同じ形)を追記。
- `docs/screens.md`: 冒頭の画面一覧テーブルに `site-search` 行(URL `/site-search`、名前「現場/参画者一覧」)を追加し、新しい `##` セクションで仕様を記載: 現場選択→近隣/同一路線の社員をGoogleマップにピン表示、近隣とみなす範囲は3/5/10/20km(デフォルト5km、同一路線マッチには適用されない)、経路・所要時間の計算は行わない、MANAGERのみ閲覧可。既存の `basic-info` セクションの最寄駅欄の説明も「自由入力」から「都道府県→路線→駅の3段階プルダウン」に更新する。
- `docs/decisions.md`: 以下の設計判断を移植元から転記する。
  - 経路・所要時間(乗換回数等)の計算は行わない(HeartRails Express無料枠にその機能がなく、Google Directions/Routes APIも有料のため採用しない)
  - Googleは地図描画専用に使い、位置情報の取得は既存のHeartRails Express APIを再利用する(新規の外部サービス登録を避けるため)
  - 本画面はMANAGER専用(現場・社員の所在情報を扱うため)

### 2.7 環境変数

- `.env.example` に `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=` を追加。
- 任意だが規約統一のため、`lib/env.ts` に既存の `isGitHubSsoEnabled` と同じスタイルで1行追加してもよい:
  ```ts
  export const isGoogleMapsEnabled = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
  ```
  (zodベースの検証は導入しない。このリポジトリの`lib/env.ts`は単純なexport constのみで統一されている)

---

## 3. 実装順序の推奨

1. 機能A(`lib/heartrails.ts`・`lib/prefectures.ts`・`lib/railway-line-category.ts`・`components/ui/NearestStationSelect.tsx`・`/api/railways`・`/api/stations`)を実装し、`BasicInfoForm.tsx`に組み込んで `/basic-info` で動作確認(Employeeへのマイグレーション不要)
2. `npm run verify` を通す
3. `Site`モデルへのマイグレーション(2.1節)
4. 現場マスタ(`master/sites`)への最寄り駅フォーム追加(2.5節)、`/master/sites` で動作確認
5. `lib/site-nearby-search.ts`・地図コンポーネント・`/site-search`ページ実装(2.2〜2.4節)
6. ナビゲーション・パンくず・ドキュメント更新(2.6節)、`@types/google.maps`導入・環境変数追加(2.3, 2.7節)
7. `npm run verify` を通す

## 4. 検証手順

- 各段階で `npm run verify`(`prisma generate` → ESLint → `tsc --noEmit` → `vitest run`)を実行する。
- 手動確認:
  - `/basic-info` で都道府県→路線→駅の3段階選択が動作し、保存後も選択値が復元されるか
  - `/master/sites` で現場の追加・編集フォームから最寄り駅を設定できるか
  - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` を設定した状態で `/site-search` を開き、地図・凡例(赤=現場、青=近隣、緑=同一路線)・候補社員リストが表示されるか、「地図で見る」ボタンでピンにパン/ズームするか
  - `MANAGER`以外のロールで `/site-search` にアクセスすると `/` にリダイレクトされるか
  - ヘッダーナビ・パンくずに `現場/参画者一覧` が正しく表示されるか(MANAGERロールのみ)