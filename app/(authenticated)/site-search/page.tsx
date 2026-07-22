import { redirect } from "next/navigation";

import { SiteNearbyMap } from "@/components/site-search/SiteNearbyMap";
import { SiteSelectField } from "@/components/site-search/SiteSelectField";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { UserRole } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { resolveDestination } from "@/lib/auth-routing";
import { isGoogleMapsEnabled } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { searchSiteNearbyEmployees } from "@/lib/site-nearby-search";

const RADIUS_OPTIONS = [3, 5, 10, 20] as const;
const DEFAULT_RADIUS: number = 5;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SiteSearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  // 未登録の管理職はbasic-info(初回登録)へ誘導する(全認証必須ページ共通のガード)
  const destination = await resolveDestination(session.user);
  if (destination !== "/") {
    redirect(destination);
  }
  if (session.user.role !== UserRole.MANAGER) {
    // 現場・社員双方の所在情報を扱うため管理職専用(docs/decisions.md参照)
    redirect("/");
  }

  const sp = await searchParams;

  const sites = await prisma.site.findMany({
    where: { deletedAt: null },
    orderBy: { siteName: "asc" },
    select: { id: true, siteName: true, nearestStationLine: true, nearestStationName: true },
  });

  const siteIdRaw = first(sp.siteId);
  const parsedSiteId = siteIdRaw ? Number(siteIdRaw) : NaN;
  const siteId = Number.isFinite(parsedSiteId) ? parsedSiteId : sites[0]?.id;

  const radiusRaw = Number(first(sp.radiusKm));
  const radiusKm: number = (RADIUS_OPTIONS as readonly number[]).includes(radiusRaw)
    ? radiusRaw
    : DEFAULT_RADIUS;

  const result = siteId
    ? await searchSiteNearbyEmployees(siteId, radiusKm)
    : { site: null, employees: [], currentParticipants: [], unresolvedStationCount: 0 };

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <SectionHeading as="h1" eyebrow="STATION MAP" title="現場/社員最寄駅マップ" />
      <p className="text-sm text-foreground/60">
        現場を選択すると、最寄駅の近隣に住む社員・同じ路線に住む社員を地図で確認できます。
      </p>

      {sites.length === 0 ? (
        <p className="rounded-2xl border border-surface-border bg-surface px-6 py-5 text-sm text-foreground/50">
          現場マスタが未登録です(現場マスタ管理から登録してください)。
        </p>
      ) : (
        <form
          method="get"
          action="/site-search"
          className="flex flex-wrap items-end gap-4 rounded-2xl border border-surface-border bg-surface px-6 py-5"
        >
          <SiteSelectField sites={sites} defaultSiteId={siteId} />
          <div className="flex flex-col gap-1">
            <label htmlFor="radiusKm" className="text-sm font-medium">
              近隣とみなす範囲
            </label>
            <select
              id="radiusKm"
              name="radiusKm"
              defaultValue={radiusKm}
              className="h-[42px] rounded border px-3 py-2"
            >
              {RADIUS_OPTIONS.map((km) => (
                <option key={km} value={km}>
                  {km}km以内
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="h-[42px] rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-dark"
          >
            検索
          </button>
        </form>
      )}

      {siteId && !result.site && (
        <p className="rounded-2xl border border-surface-border bg-surface px-6 py-5 text-sm text-red-600">
          現場の最寄駅情報が未設定か、駅の位置情報を取得できませんでした。現場マスタ管理で最寄駅を確認してください。
        </p>
      )}

      {result.site && !isGoogleMapsEnabled && (
        <p className="rounded-2xl border border-surface-border bg-surface px-6 py-5 text-sm text-red-600">
          Google Maps APIキー(NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)が設定されていないため、地図を表示できません。
        </p>
      )}

      {result.site && isGoogleMapsEnabled && (
        <>
          {result.unresolvedStationCount > 0 && (
            <p className="text-xs text-foreground/50">
              {result.unresolvedStationCount}
              名の最寄駅は位置情報を取得できなかったため地図・一覧から除外しています。
            </p>
          )}
          <SiteNearbyMap
            site={result.site}
            employees={result.employees}
            currentParticipants={result.currentParticipants}
            radiusKm={radiusKm}
          />
        </>
      )}
    </main>
  );
}
