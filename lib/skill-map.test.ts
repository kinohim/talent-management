import { describe, expect, it } from "vitest";

import type { OrganizationUnitOption } from "./organization-unit";
import {
  acquisitionsIn,
  aggregateTrend,
  assignBucketIds,
  buildDepartmentBuckets,
  buildHeatmapRows,
  collectComposition,
  collectFiscalYearAcquisitions,
  defaultHeatmapVisibleIds,
  deptLabelOf,
  fiscalYearOf,
  formatMonthDay,
  isNewAcquisition,
  recommendCertifications,
  totalCertificationCount,
  trendAxisMax,
  trendBucketKeys,
  type DashboardEmployee,
  type DashboardItem,
} from "./skill-map";

// 組織: SI事業部 > 金融部 > 証券Gr、SI事業部 > 流通部、クラウド事業部(直下所属あり)
const units: OrganizationUnitOption[] = [
  { id: 1, parentId: null, unitName: "SI事業部", unitLevel: "DIVISION" },
  { id: 2, parentId: 1, unitName: "金融部", unitLevel: "DEPARTMENT" },
  { id: 3, parentId: 2, unitName: "証券Gr", unitLevel: "GROUP" },
  { id: 4, parentId: 1, unitName: "流通部", unitLevel: "DEPARTMENT" },
  { id: 5, parentId: null, unitName: "クラウド事業部", unitLevel: "DIVISION" },
];

function employee(
  employeeId: string,
  name: string,
  organizationUnitId: number | null,
): DashboardEmployee {
  return {
    employeeId,
    name,
    deptLabel: deptLabelOf(units, organizationUnitId),
    bucketIds: assignBucketIds(units, organizationUnitId),
    canView: true,
  };
}

// e1: 証券Gr所属(金融部へロールアップ)、e2: 金融部直下、e3: 流通部、
// e4: クラウド事業部直下、e5: 未所属
const e1 = employee("000001", "佐藤 一", 3);
const e2 = employee("000002", "鈴木 二", 2);
const e3 = employee("000003", "高橋 三", 4);
const e4 = employee("000004", "田中 四", 5);
const e5 = employee("000005", "伊藤 五", null);
const employees = [e1, e2, e3, e4, e5];

const CAT_NATIONAL = 10;
const CAT_VENDOR = 11;

function cert(
  id: number,
  name: string,
  categoryId: number,
  holdings: [string, string][],
): DashboardItem {
  return {
    id,
    name,
    categoryId,
    holdings: holdings.map(([employeeId, acquiredDate]) => ({
      employeeId,
      acquiredDate,
    })),
  };
}

describe("fiscalYearOf", () => {
  it("年度は3月1日に始まり翌2月末に終わる", () => {
    expect(fiscalYearOf("2026-03-01")).toBe(2026);
    expect(fiscalYearOf("2026-02-28")).toBe(2025);
    expect(fiscalYearOf("2026-12-31")).toBe(2026);
    expect(fiscalYearOf("2027-01-15")).toBe(2026);
  });
});

describe("isNewAcquisition", () => {
  it("92日以内はNEW、93日前と未来日はNEWでない", () => {
    expect(isNewAcquisition("2026-07-15", "2026-07-15")).toBe(true);
    expect(isNewAcquisition("2026-04-14", "2026-07-15")).toBe(true); // 92日前
    expect(isNewAcquisition("2026-04-13", "2026-07-15")).toBe(false); // 93日前
    expect(isNewAcquisition("2026-07-16", "2026-07-15")).toBe(false);
  });
});

describe("formatMonthDay", () => {
  it("M/D形式(日は2桁)にする", () => {
    expect(formatMonthDay("2026-07-05")).toBe("7/05");
    expect(formatMonthDay("2026-11-28")).toBe("11/28");
  });
});

describe("assignBucketIds / deptLabelOf", () => {
  it("Gr所属者は部と事業部の両バケットに帰属し、表示名は部になる", () => {
    expect([...e1.bucketIds].sort()).toEqual([1, 2]);
    expect(e1.deptLabel).toBe("金融部");
  });

  it("事業部直下所属者は事業部バケットのみに帰属する", () => {
    expect(e4.bucketIds).toEqual([5]);
    expect(e4.deptLabel).toBe("クラウド事業部");
  });

  it("未所属はどのバケットにも帰属しない", () => {
    expect(e5.bucketIds).toEqual([]);
    expect(e5.deptLabel).toBeNull();
  });
});

describe("buildDepartmentBuckets", () => {
  it("事業部・部をツリー順に列挙し、Grは行に出さず在籍人数をロールアップする", () => {
    const buckets = buildDepartmentBuckets(units, employees);
    expect(buckets.map((b) => b.name)).toEqual([
      "SI事業部",
      "金融部",
      "流通部",
      "クラウド事業部",
    ]);
    // SI事業部=配下すべて(e1,e2,e3)、金融部=e1(Grロールアップ)+e2
    expect(buckets.map((b) => b.headCount)).toEqual([3, 2, 1, 1]);
  });
});

describe("collectComposition", () => {
  const certs = [
    cert(1, "基本情報", CAT_NATIONAL, [
      ["000001", "2024-05-01"],
      ["000002", "2023-04-01"],
      ["000003", "2022-04-01"],
    ]),
    cert(2, "応用情報", CAT_NATIONAL, [["000001", "2025-06-01"]]),
    cert(3, "AWS SAA", CAT_VENDOR, [
      ["000004", "2025-01-10"],
      ["000005", "2024-08-10"],
    ]),
  ];

  it("選択カテゴリのみを保有者数降順に集計する", () => {
    const result = collectComposition(certs, employees, {
      bucketId: null,
      categoryIds: new Set([CAT_NATIONAL]),
    });
    expect(result.top.map((s) => [s.name, s.count])).toEqual([
      ["基本情報", 3],
      ["応用情報", 1],
    ]);
    expect(result.total).toBe(4);
    expect(result.rest).toEqual([]);
  });

  it("部署バケットで絞り込める(事業部は配下すべてを含む)", () => {
    const result = collectComposition(certs, employees, {
      bucketId: 1, // SI事業部
      categoryIds: new Set([CAT_NATIONAL, CAT_VENDOR]),
    });
    // AWS SAAの保有者(e4,e5)はSI事業部外のため項目ごと消える
    expect(result.top.map((s) => s.name)).toEqual(["基本情報", "応用情報"]);
  });

  it("同一人物の同一項目の重複保有(再取得)は1名に集約する", () => {
    const renewed = [
      cert(1, "基本情報", CAT_NATIONAL, [
        ["000001", "2020-05-01"],
        ["000001", "2024-05-01"],
      ]),
    ];
    const result = collectComposition(renewed, employees, {
      bucketId: null,
      categoryIds: new Set([CAT_NATIONAL]),
    });
    expect(result.top[0].count).toBe(1);
    expect(result.top[0].holders).toHaveLength(1);
  });

  it("6項目以上は上位5+その他に集約する", () => {
    // 資格1=7名、資格2=6名…資格7=1名と件数差をつける
    const many = Array.from({ length: 7 }, (_, i) =>
      cert(
        i + 1,
        `資格${i + 1}`,
        CAT_NATIONAL,
        Array.from({ length: 7 - i }, (_, j): [string, string] => [
          `9${i}000${j}`,
          "2024-04-01",
        ]),
      ),
    );
    const manyEmployees = many.flatMap((c) =>
      c.holdings.map((h) => employee(h.employeeId, `社員${h.employeeId}`, 2)),
    );
    const result = collectComposition(many, manyEmployees, {
      bucketId: null,
      categoryIds: new Set([CAT_NATIONAL]),
    });
    expect(result.top).toHaveLength(5);
    expect(result.rest.map((r) => r.name)).toEqual(["資格6", "資格7"]);
    expect(result.restTotal).toBe(2 + 1);
    expect(result.total).toBe(7 + 6 + 5 + 4 + 3 + 2 + 1);
  });

  it("該当0件なら空の結果を返す", () => {
    const result = collectComposition(certs, employees, {
      bucketId: 999,
      categoryIds: new Set([CAT_NATIONAL]),
    });
    expect(result.total).toBe(0);
    expect(result.top).toEqual([]);
  });
});

describe("recommendCertifications", () => {
  const certs = [
    cert(1, "基本情報", CAT_NATIONAL, [
      ["000001", "2024-05-01"],
      ["000002", "2023-04-01"],
      ["000003", "2022-04-01"],
    ]),
    cert(2, "応用情報", CAT_NATIONAL, [
      ["000002", "2025-06-01"],
      ["000003", "2025-07-01"],
    ]),
    cert(3, "AWS SAA", CAT_VENDOR, [
      ["000002", "2025-01-10"],
      ["000003", "2024-08-10"],
      ["000004", "2024-09-10"],
    ]),
    cert(4, "NW", CAT_NATIONAL, [["000002", "2025-02-01"]]), // 1名のみ→対象外
  ];

  it("自分が保有していない×2名以上×上位3件に文言を付与する", () => {
    const map = recommendCertifications(certs, employees, {
      bucketId: null,
      scopeName: "全社",
      myCertificationIds: new Set([1]), // 基本情報は保有済み→除外
    });
    expect(map.has(1)).toBe(false);
    expect(map.get(3)).toBe("全社で3名が保有している人気の資格です");
    expect(map.get(2)).toBe("全社で2名が保有している人気の資格です");
    expect(map.has(4)).toBe(false);
  });

  it("スコープ(部署)で保有者数を数え直し、スコープ名を文言に使う", () => {
    const map = recommendCertifications(certs, employees, {
      bucketId: 2, // 金融部(e1,e2)
      scopeName: "金融部",
      myCertificationIds: new Set(),
    });
    // 金融部内: 基本情報=e1,e2の2名、応用情報=e2の1名、AWS SAA=e2の1名
    expect(map.get(1)).toBe("金融部で2名が保有している人気の資格です");
    expect(map.has(2)).toBe(false);
    expect(map.has(3)).toBe(false);
  });
});

describe("年度推移", () => {
  const currentFy = 2026;
  const certs = [
    cert(1, "基本情報", CAT_NATIONAL, [
      ["000001", "2020-05-01"], // 〜2021に集約
      ["000002", "2021-08-01"], // 〜2021に集約
      ["000003", "2024-04-01"],
    ]),
    cert(3, "AWS SAA", CAT_VENDOR, [
      ["000004", "2024-08-10"],
      ["000001", "2026-03-05"], // 今年度(2026年度)
      ["000002", "2027-01-10"], // 翌1月も今年度
    ]),
  ];

  it("trendBucketKeysは「〜N」+直近5年度(今年度含む)の6バケット", () => {
    expect(trendBucketKeys(2026)).toEqual([
      "〜2021",
      "2022",
      "2023",
      "2024",
      "2025",
      "2026",
    ]);
  });

  it("trendAxisMaxは全カテゴリの年度別最大件数を5の倍数へ切り上げる(最小5)", () => {
    expect(trendAxisMax(certs, currentFy)).toBe(5);
    const many = [
      cert(
        9,
        "多数",
        CAT_NATIONAL,
        Array.from({ length: 7 }, (_, i): [string, string] => [
          `00000${i}`,
          "2024-06-01",
        ]),
      ),
    ];
    expect(trendAxisMax(many, currentFy)).toBe(10);
  });

  it("aggregateTrendは年度別件数とカテゴリ内訳を返し、フィルタを反映する", () => {
    const columns = aggregateTrend(
      certs,
      employees,
      { bucketId: null, categoryIds: new Set([CAT_NATIONAL, CAT_VENDOR]) },
      currentFy,
    );
    const byKey = new Map(columns.map((c) => [c.key, c]));
    expect(byKey.get("〜2021")?.total).toBe(2);
    expect(byKey.get("2024")?.total).toBe(2);
    expect(byKey.get("2024")?.byCategory.get(CAT_NATIONAL)).toBe(1);
    expect(byKey.get("2024")?.byCategory.get(CAT_VENDOR)).toBe(1);
    expect(byKey.get("2026")?.total).toBe(2);
    expect(byKey.get("2026")?.isCurrent).toBe(true);
  });

  it("acquisitionsInは指定年度の取得を新しい順に返す", () => {
    const list = acquisitionsIn(
      certs,
      employees,
      { bucketId: null, categoryIds: new Set([CAT_NATIONAL, CAT_VENDOR]) },
      "2026",
      currentFy,
    );
    expect(list.map((a) => a.date)).toEqual(["2027-01-10", "2026-03-05"]);
    expect(list[0].certificationName).toBe("AWS SAA");
  });
});

describe("ヒートマップ", () => {
  const certs = [
    // e1が同一カテゴリ内で2件保有→延べ2件でカウント
    cert(1, "基本情報", CAT_NATIONAL, [
      ["000001", "2024-05-01"],
      ["000002", "2023-04-01"],
    ]),
    cert(2, "応用情報", CAT_NATIONAL, [["000001", "2025-06-01"]]),
    cert(3, "AWS SAA", CAT_VENDOR, [["000004", "2025-01-10"]]),
  ];

  it("人数モードは延べ件数(1人の複数保有を重複カウント)", () => {
    const buckets = buildDepartmentBuckets(units, employees);
    const rows = buildHeatmapRows(
      certs,
      employees,
      buckets,
      [CAT_NATIONAL, CAT_VENDOR],
      "count",
    );
    const financial = rows[buckets.findIndex((b) => b.name === "金融部")];
    expect(financial.cells[0].value).toBe(3); // e1×2+e2×1
    expect(financial.cells[0].level).toBe(1);
    expect(financial.cells[1].value).toBe(0);
    expect(financial.cells[1].level).toBe(0);
  });

  it("保有率モードは延べ÷在籍人数で100%超を許容する", () => {
    const buckets = buildDepartmentBuckets(units, employees);
    const rows = buildHeatmapRows(certs, employees, buckets, [CAT_NATIONAL], "rate");
    const financial = rows[buckets.findIndex((b) => b.name === "金融部")];
    expect(financial.cells[0].value).toBe(150); // 延べ3件÷在籍2名
    expect(financial.cells[0].level).toBe(4);
  });
});

describe("KPI・ティッカー", () => {
  const currentFy = 2026;
  const today = "2026-07-15";
  const certs = [
    cert(1, "基本情報", CAT_NATIONAL, [
      ["000001", "2024-05-01"],
      ["000002", "2026-07-10"], // 今年度・NEW
      ["000003", "2026-03-20"], // 今年度・3か月超
    ]),
  ];

  it("今年度の取得を新しい順に返しNEW判定を付ける", () => {
    const items = collectFiscalYearAcquisitions(certs, employees, currentFy, today);
    expect(items.map((a) => a.date)).toEqual(["2026-07-10", "2026-03-20"]);
    expect(items[0].isNew).toBe(true);
    expect(items[1].isNew).toBe(false);
  });

  it("totalCertificationCountは延べ件数を返す", () => {
    expect(totalCertificationCount(certs)).toBe(3);
  });
});

describe("defaultHeatmapVisibleIds", () => {
  const buckets = buildDepartmentBuckets(units, employees);

  it("ログインユーザーの所属事業部とその配下の部を初期表示にする", () => {
    const visible = defaultHeatmapVisibleIds(buckets, 1); // SI事業部
    expect([...visible].sort()).toEqual([1, 2, 4]); // SI事業部+金融部+流通部
  });

  it("未所属(null)なら全行を表示する", () => {
    const visible = defaultHeatmapVisibleIds(buckets, null);
    expect(visible.size).toBe(buckets.length);
  });

  it("バケットに存在しない事業部idなら全行を表示する", () => {
    const visible = defaultHeatmapVisibleIds(buckets, 999);
    expect(visible.size).toBe(buckets.length);
  });
});
