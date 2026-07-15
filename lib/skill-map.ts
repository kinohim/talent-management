import type { OrganizationUnitOption } from "@/lib/organization-unit";
import {
  buildOrganizationUnitTree,
  type OrganizationUnitNode,
} from "@/lib/organization-unit-tree";

// REF008(スキルマップ/組織ダッシュボード)の集計ロジック。
// クライアントコンポーネントから直接importされるため、このファイルは
// prismaランタイムを巻き込まない純関数のみで構成する
// (lib/organization-unit-tree.tsと同じ方針。importは型のみ)。
// 各関数はdocs/dashboard_mockup.htmlのJS実装と同一のロジック
// (fy/isNew/recommendMap/acquisitionsIn/gross/TREND_AXIS_MAX)を移植したもの。

// ---------------------------------------------------------------------------
// DTO型(サーバーで整形しClient Componentへ渡す。日付はタイムゾーンの
// 混入を避けるため"YYYY-MM-DD"文字列で持つ)
// ---------------------------------------------------------------------------

export type DashboardCategory = {
  id: number;
  name: string;
};

// 保有1件(資格は取得1件ごと=延べ、スキルは社員×スキルで1件)
export type DashboardHolding = {
  employeeId: string;
  // 資格の取得年月日(acquired_dateはNOT NULLのため資格では必ず入る)。
  // スキルには取得日の概念がないため持たない。
  acquiredDate?: string;
};

export type DashboardItem = {
  id: number;
  name: string;
  categoryId: number;
  holdings: DashboardHolding[];
};

export type DashboardEmployee = {
  employeeId: string;
  name: string;
  // 全社表示時に氏名へ併記する所属(事業部・部単位の表示名)。未所属はnull
  deptLabel: string | null;
  // 所属する部署バケット(事業部・部)のorganization_unit id。
  // 部署以下所属なら[事業部id, 部id]、事業部直下なら[事業部id]、未所属は[]
  bucketIds: number[];
  // 経歴書詳細(REF003)へのリンク可否(閲覧範囲判定。サーバーで解決済み)
  canView: boolean;
};

// 部署タブ・ヒートマップ行の単位(「全社」を除く事業部・部)
export type DepartmentBucket = {
  id: number;
  name: string;
  level: "DIVISION" | "DEPARTMENT";
  // 部の親事業部のid(事業部はnull)。ヒートマップの初期表示行の判定に使う
  parentId: number | null;
  headCount: number;
};

// ---------------------------------------------------------------------------
// 年度・日付(年度=3月1日〜翌2月末)
// ---------------------------------------------------------------------------

// "YYYY-MM-DD"をUTC深夜のDateにする(DATE型と同じ扱い)
function parseDateString(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

// 日付が属する年度(モックのfy()と同一)
export function fiscalYearOf(date: string): number {
  const [y, m] = date.split("-").map(Number);
  return m >= 3 ? y : y - 1;
}

// 直近3か月(92日)以内の取得か(モックのisNew()と同一)。todayはJST基準の
// 「今日」を"YYYY-MM-DD"で渡す(サーバーでtodayJstDateOnlyから確定する)
export function isNewAcquisition(date: string, today: string): boolean {
  const diff = parseDateString(today).getTime() - parseDateString(date).getTime();
  return diff >= 0 && diff <= 92 * 24 * 60 * 60 * 1000;
}

// 表示用の"M/D"
export function formatMonthDay(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  return `${m}/${String(d).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// 部署バケット(事業部・部の単位。Grは親の部にロールアップ)
// ---------------------------------------------------------------------------

// 社員の所属(最下層id)から帰属バケットidの一覧を求める。
// 事業部バケットは配下すべてを含むため、部所属者は[事業部, 部]の両方に属する
export function assignBucketIds(
  units: OrganizationUnitOption[],
  organizationUnitId: number | null,
): number[] {
  if (organizationUnitId == null) return [];
  const byId = new Map(units.map((u) => [u.id, u]));
  const result: number[] = [];
  let current = byId.get(organizationUnitId) ?? null;
  while (current) {
    if (current.unitLevel === "DIVISION" || current.unitLevel === "DEPARTMENT") {
      result.push(current.id);
    }
    current = current.parentId != null ? (byId.get(current.parentId) ?? null) : null;
  }
  return result;
}

// 全社表示時に氏名へ併記する所属名(最も近い事業部・部の名称)
export function deptLabelOf(
  units: OrganizationUnitOption[],
  organizationUnitId: number | null,
): string | null {
  if (organizationUnitId == null) return null;
  const byId = new Map(units.map((u) => [u.id, u]));
  let current = byId.get(organizationUnitId) ?? null;
  while (current) {
    if (current.unitLevel === "DIVISION" || current.unitLevel === "DEPARTMENT") {
      return current.unitName;
    }
    current = current.parentId != null ? (byId.get(current.parentId) ?? null) : null;
  }
  return null;
}

// 部署タブ・ヒートマップ行の並び(ツリー順: 事業部→その配下の部)。
// headCountは呼び出し側が社員のbucketIdsを集計して埋める
export function buildDepartmentBuckets(
  units: OrganizationUnitOption[],
  employees: Pick<DashboardEmployee, "bucketIds">[],
): DepartmentBucket[] {
  const headCounts = new Map<number, number>();
  for (const employee of employees) {
    for (const bucketId of employee.bucketIds) {
      headCounts.set(bucketId, (headCounts.get(bucketId) ?? 0) + 1);
    }
  }

  const buckets: DepartmentBucket[] = [];
  function visit(nodes: OrganizationUnitNode[]) {
    for (const node of nodes) {
      if (node.unitLevel === "DIVISION" || node.unitLevel === "DEPARTMENT") {
        buckets.push({
          id: node.id,
          name: node.unitName,
          level: node.unitLevel,
          parentId: node.unitLevel === "DIVISION" ? null : node.parentId,
          headCount: headCounts.get(node.id) ?? 0,
        });
        visit(node.children);
      }
    }
  }
  visit(buildOrganizationUnitTree(units));
  return buckets;
}

// ヒートマップの初期表示行: ログインユーザーの所属事業部とその配下の部。
// 未所属・事業部が特定できない場合は全行を表示する
export function defaultHeatmapVisibleIds(
  buckets: DepartmentBucket[],
  viewerDivisionId: number | null,
): Set<number> {
  if (
    viewerDivisionId == null ||
    !buckets.some((b) => b.id === viewerDivisionId)
  ) {
    return new Set(buckets.map((b) => b.id));
  }
  return new Set(
    buckets
      .filter((b) => b.id === viewerDivisionId || b.parentId === viewerDivisionId)
      .map((b) => b.id),
  );
}

// ---------------------------------------------------------------------------
// フィルタ(部署バケット×カテゴリ)
// ---------------------------------------------------------------------------

export type DashboardFilter = {
  // nullは「全社」
  bucketId: number | null;
  categoryIds: ReadonlySet<number>;
};

function buildEmployeeMap(
  employees: DashboardEmployee[],
): Map<string, DashboardEmployee> {
  return new Map(employees.map((e) => [e.employeeId, e]));
}

function inBucket(
  employee: DashboardEmployee | undefined,
  bucketId: number | null,
): boolean {
  if (!employee) return false;
  if (bucketId == null) return true;
  return employee.bucketIds.includes(bucketId);
}

// ---------------------------------------------------------------------------
// 構成比(ドーナツ+凡例。上位5+その他)
// ---------------------------------------------------------------------------

export type CompositionHolder = {
  employeeId: string;
  name: string;
  deptLabel: string | null;
  canView: boolean;
};

export type CompositionSlice = {
  id: number;
  name: string;
  count: number;
  holders: CompositionHolder[];
};

export type CompositionResult = {
  total: number;
  top: CompositionSlice[];
  rest: { id: number; name: string; count: number }[];
  restTotal: number;
};

// 選択カテゴリ・部署で絞った項目別の保有者数(人数。同一人物の重複保有は
// 1名に集約)を保有者数降順に集計し、上位5+その他へ集約する
export function collectComposition(
  items: DashboardItem[],
  employees: DashboardEmployee[],
  filter: DashboardFilter,
): CompositionResult {
  const employeeMap = buildEmployeeMap(employees);

  const rows = items
    .filter((item) => filter.categoryIds.has(item.categoryId))
    .map((item) => {
      const holders: CompositionHolder[] = [];
      const seen = new Set<string>();
      for (const holding of item.holdings) {
        if (seen.has(holding.employeeId)) continue;
        const employee = employeeMap.get(holding.employeeId);
        if (!inBucket(employee, filter.bucketId)) continue;
        seen.add(holding.employeeId);
        holders.push({
          employeeId: employee!.employeeId,
          name: employee!.name,
          deptLabel: employee!.deptLabel,
          canView: employee!.canView,
        });
      }
      return { id: item.id, name: item.name, count: holders.length, holders };
    })
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count);

  const top = rows.slice(0, 5);
  const rest = rows
    .slice(5)
    .map((row) => ({ id: row.id, name: row.name, count: row.count }));
  const restTotal = rest.reduce((sum, row) => sum + row.count, 0);
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  return { total, top, rest, restTotal };
}

// ---------------------------------------------------------------------------
// 💡おすすめ(資格タブ・構成比ビューのみ)
// ---------------------------------------------------------------------------

// ログインユーザーが保有していない資格のうち、選択中スコープで保有者数が
// 多いもの(2名以上・上位3件)に付けるツールチップ文言のMap(モックの
// recommendMap()と同一)。UI文言に「未取得」等のネガティブ表現は使わない
export function recommendCertifications(
  certifications: DashboardItem[],
  employees: DashboardEmployee[],
  params: {
    bucketId: number | null;
    scopeName: string; // 「全社」または部署名
    myCertificationIds: ReadonlySet<number>;
  },
): Map<number, string> {
  const employeeMap = buildEmployeeMap(employees);
  const map = new Map<number, string>();
  certifications
    .filter((cert) => !params.myCertificationIds.has(cert.id))
    .map((cert) => {
      const holderIds = new Set(
        cert.holdings
          .filter((h) => inBucket(employeeMap.get(h.employeeId), params.bucketId))
          .map((h) => h.employeeId),
      );
      return { id: cert.id, count: holderIds.size };
    })
    .filter((cert) => cert.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .forEach((cert) => {
      map.set(
        cert.id,
        `${params.scopeName}で${cert.count}名が保有している人気の資格です`,
      );
    });
  return map;
}

// ---------------------------------------------------------------------------
// 年度推移(資格のみ。直近5年度+今年度、古い分は「〜N」に集約)
// ---------------------------------------------------------------------------

export function trendBucketKeys(currentFiscalYear: number): string[] {
  const oldest = currentFiscalYear - 5;
  const keys = [`〜${oldest}`];
  for (let fy = oldest + 1; fy <= currentFiscalYear; fy++) {
    keys.push(String(fy));
  }
  return keys;
}

function trendBucketKeyOf(date: string, currentFiscalYear: number): string {
  const fy = fiscalYearOf(date);
  return fy <= currentFiscalYear - 5 ? `〜${currentFiscalYear - 5}` : String(fy);
}

// 縦軸の上限=全社・全カテゴリでの年度別最大件数を5の倍数に切り上げた値。
// 部署・カテゴリの絞り込みでは変えない(モックのTREND_AXIS_MAXと同一)
export function trendAxisMax(
  certifications: DashboardItem[],
  currentFiscalYear: number,
): number {
  const totals = new Map<string, number>();
  for (const cert of certifications) {
    for (const holding of cert.holdings) {
      if (!holding.acquiredDate) continue;
      const key = trendBucketKeyOf(holding.acquiredDate, currentFiscalYear);
      totals.set(key, (totals.get(key) ?? 0) + 1);
    }
  }
  const max = Math.max(0, ...totals.values());
  return Math.max(5, Math.ceil(max / 5) * 5);
}

export type TrendColumn = {
  key: string;
  total: number;
  byCategory: Map<number, number>;
  isCurrent: boolean;
};

// 年度別の新規取得件数(延べ)。カテゴリ内訳つき(積み上げ棒用)
export function aggregateTrend(
  certifications: DashboardItem[],
  employees: DashboardEmployee[],
  filter: DashboardFilter,
  currentFiscalYear: number,
): TrendColumn[] {
  const employeeMap = buildEmployeeMap(employees);
  const columns = new Map<string, TrendColumn>(
    trendBucketKeys(currentFiscalYear).map((key) => [
      key,
      {
        key,
        total: 0,
        byCategory: new Map<number, number>(),
        isCurrent: key === String(currentFiscalYear),
      },
    ]),
  );

  for (const cert of certifications) {
    if (!filter.categoryIds.has(cert.categoryId)) continue;
    for (const holding of cert.holdings) {
      if (!holding.acquiredDate) continue;
      if (!inBucket(employeeMap.get(holding.employeeId), filter.bucketId)) continue;
      const column = columns.get(
        trendBucketKeyOf(holding.acquiredDate, currentFiscalYear),
      );
      if (!column) continue;
      column.total++;
      column.byCategory.set(
        cert.categoryId,
        (column.byCategory.get(cert.categoryId) ?? 0) + 1,
      );
    }
  }
  return [...columns.values()];
}

export type Acquisition = {
  employeeId: string;
  name: string;
  deptLabel: string | null;
  canView: boolean;
  certificationName: string;
  date: string;
};

// 指定年度バケツの取得一覧(部署・カテゴリ絞込を反映、取得日の新しい順。
// モックのacquisitionsIn()と同一)
export function acquisitionsIn(
  certifications: DashboardItem[],
  employees: DashboardEmployee[],
  filter: DashboardFilter,
  bucketKey: string,
  currentFiscalYear: number,
): Acquisition[] {
  const employeeMap = buildEmployeeMap(employees);
  const result: Acquisition[] = [];
  for (const cert of certifications) {
    if (!filter.categoryIds.has(cert.categoryId)) continue;
    for (const holding of cert.holdings) {
      if (!holding.acquiredDate) continue;
      if (trendBucketKeyOf(holding.acquiredDate, currentFiscalYear) !== bucketKey) {
        continue;
      }
      const employee = employeeMap.get(holding.employeeId);
      if (!inBucket(employee, filter.bucketId)) continue;
      result.push({
        employeeId: employee!.employeeId,
        name: employee!.name,
        deptLabel: employee!.deptLabel,
        canView: employee!.canView,
        certificationName: cert.name,
        date: holding.acquiredDate,
      });
    }
  }
  // "YYYY-MM-DD"は辞書順=日付順
  return result.sort((a, b) => b.date.localeCompare(a.date));
}

// ---------------------------------------------------------------------------
// ヒートマップ(延べ人数。1人の複数保有を重複カウント)
// ---------------------------------------------------------------------------

export type HeatmapMode = "count" | "rate";

export type HeatmapCell = {
  value: number; // countは件数、rateは%(四捨五入)
  level: 0 | 1 | 2 | 3 | 4;
};

export type HeatmapRow = {
  bucketId: number;
  cells: HeatmapCell[];
};

// カテゴリ内の保有登録件数の合計(モックのgross()と同一の延べカウント)
export function heatmapGross(
  items: DashboardItem[],
  employees: DashboardEmployee[],
  bucketId: number,
  categoryId: number,
): number {
  const employeeMap = buildEmployeeMap(employees);
  let total = 0;
  for (const item of items) {
    if (item.categoryId !== categoryId) continue;
    for (const holding of item.holdings) {
      if (inBucket(employeeMap.get(holding.employeeId), bucketId)) total++;
    }
  }
  return total;
}

function countLevel(n: number): HeatmapCell["level"] {
  if (n === 0) return 0;
  if (n <= 3) return 1;
  if (n <= 7) return 2;
  if (n <= 12) return 3;
  return 4;
}

// 保有率=延べ人数÷在籍人数のため100%超を許容する(閾値も100%超を想定)
function rateLevel(rate: number): HeatmapCell["level"] {
  if (rate === 0) return 0;
  if (rate < 30) return 1;
  if (rate < 60) return 2;
  if (rate < 100) return 3;
  return 4;
}

export function buildHeatmapRows(
  items: DashboardItem[],
  employees: DashboardEmployee[],
  buckets: DepartmentBucket[],
  categoryIds: number[],
  mode: HeatmapMode,
): HeatmapRow[] {
  return buckets.map((bucket) => ({
    bucketId: bucket.id,
    cells: categoryIds.map((categoryId) => {
      const gross = heatmapGross(items, employees, bucket.id, categoryId);
      if (mode === "count") {
        return { value: gross, level: countLevel(gross) };
      }
      const rate =
        bucket.headCount === 0 ? 0 : Math.round((gross / bucket.headCount) * 100);
      return { value: rate, level: rateLevel(rate) };
    }),
  }));
}

// ---------------------------------------------------------------------------
// ヘッダーKPI・🎉ティッカー
// ---------------------------------------------------------------------------

export type FiscalYearAcquisition = Acquisition & { isNew: boolean };

// 今年度に取得された資格の一覧(取得日の新しい順・全社・NEW判定つき)。
// KPIの前年度末比(=今年度の新規取得件数)はこの件数を使う
export function collectFiscalYearAcquisitions(
  certifications: DashboardItem[],
  employees: DashboardEmployee[],
  currentFiscalYear: number,
  today: string,
): FiscalYearAcquisition[] {
  const all = acquisitionsIn(
    certifications,
    employees,
    { bucketId: null, categoryIds: new Set(certifications.map((c) => c.categoryId)) },
    String(currentFiscalYear),
    currentFiscalYear,
  );
  return all.map((a) => ({ ...a, isNew: isNewAcquisition(a.date, today) }));
}

// KPI「資格保有 ◯件」(全社の保有登録の延べ件数)
export function totalCertificationCount(certifications: DashboardItem[]): number {
  return certifications.reduce((sum, cert) => sum + cert.holdings.length, 0);
}

// ---------------------------------------------------------------------------
// サーバー(page.tsx)からClient Componentへ渡すDTO
// ---------------------------------------------------------------------------

export type SkillMapDashboardData = {
  today: string;
  currentFiscalYear: number;
  buckets: DepartmentBucket[];
  certCategories: DashboardCategory[];
  skillCategories: DashboardCategory[];
  certifications: DashboardItem[];
  skills: DashboardItem[];
  employees: DashboardEmployee[];
  myCertificationIds: number[];
  // ログインユーザーの所属事業部(ヒートマップ初期表示行の判定用。未所属はnull)
  viewerDivisionId: number | null;
  kpiTotal: number;
  tickerItems: FiscalYearAcquisition[];
  trendAxisMax: number;
};
