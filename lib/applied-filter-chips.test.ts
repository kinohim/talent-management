import { describe, expect, it } from "vitest";

import {
  ACCOUNT_APPLIED_FILTER_CLEAR_KEYS,
  RESUME_APPLIED_FILTER_CLEAR_KEYS,
  buildAccountAppliedFilterChips,
  buildResumeAppliedFilterChips,
} from "@/lib/applied-filter-chips";
import type { AccountFilters } from "@/lib/account-list";
import type { ResumeSearchFilters } from "@/lib/resume-search";

const EMPTY_RESUME_FILTERS: ResumeSearchFilters = {
  name: "",
  organizationUnitIds: [],
  experienceMin: null,
  experienceMax: null,
  skillIds: [],
  skillMatchMode: "OR",
  certificationIds: [],
  certificationMatchMode: "OR",
  siteId: null,
  includeRetired: false,
  colName: "",
  colOrganizationUnitIds: [],
  colExperienceMin: null,
  colExperienceMax: null,
  colSkillIds: [],
  colSkillMatchMode: "OR",
  colCertificationIds: [],
  colCertificationMatchMode: "OR",
};

const RESUME_LOOKUPS = {
  orgUnitName: (id: number) => ({ 1: "SI事業部", 2: "金融サービス部" })[id],
  skillName: (id: number) => ({ 10: "Java", 11: "TypeScript" })[id],
  certificationName: (id: number) => ({ 20: "基本情報技術者" })[id],
  siteName: (id: number) => ({ 30: "A社案件" })[id],
};

describe("buildResumeAppliedFilterChips", () => {
  it("条件が何もなければ空配列を返す", () => {
    expect(buildResumeAppliedFilterChips(EMPTY_RESUME_FILTERS, RESUME_LOOKUPS)).toEqual([]);
  });

  it("氏名カナ条件からチップを作る(解除でnameキーを削除)", () => {
    const chips = buildResumeAppliedFilterChips(
      { ...EMPTY_RESUME_FILTERS, name: "タナカ" },
      RESUME_LOOKUPS,
    );
    expect(chips).toEqual([
      { id: "name", label: "氏名カナ: タナカ", remove: [{ key: "name" }] },
    ]);
  });

  it("経験年数が下限・上限とも指定なら範囲表示になる", () => {
    const chips = buildResumeAppliedFilterChips(
      { ...EMPTY_RESUME_FILTERS, experienceMin: 3, experienceMax: 8 },
      RESUME_LOOKUPS,
    );
    expect(chips).toEqual([
      {
        id: "experience",
        label: "経験年数 3〜8年",
        remove: [{ key: "experienceMin" }, { key: "experienceMax" }],
      },
    ]);
  });

  it("経験年数が下限のみなら「以上」表示になる", () => {
    const chips = buildResumeAppliedFilterChips(
      { ...EMPTY_RESUME_FILTERS, experienceMin: 5 },
      RESUME_LOOKUPS,
    );
    expect(chips[0].label).toBe("経験年数 5年以上");
  });

  it("経験年数が上限のみなら「以下」表示になる", () => {
    const chips = buildResumeAppliedFilterChips(
      { ...EMPTY_RESUME_FILTERS, experienceMax: 5 },
      RESUME_LOOKUPS,
    );
    expect(chips[0].label).toBe("経験年数 5年以下");
  });

  it("所属組織は選択件数分のチップになり、解除は該当idのみをorgUnitIdから外す", () => {
    const chips = buildResumeAppliedFilterChips(
      { ...EMPTY_RESUME_FILTERS, organizationUnitIds: [1, 2] },
      RESUME_LOOKUPS,
    );
    expect(chips).toEqual([
      {
        id: "org-1",
        label: "所属組織: SI事業部",
        remove: [{ key: "orgUnitId", value: "1" }],
      },
      {
        id: "org-2",
        label: "所属組織: 金融サービス部",
        remove: [{ key: "orgUnitId", value: "2" }],
      },
    ]);
  });

  it("マスタに存在しないidはid自体を表示にフォールバックする", () => {
    const chips = buildResumeAppliedFilterChips(
      { ...EMPTY_RESUME_FILTERS, organizationUnitIds: [999] },
      RESUME_LOOKUPS,
    );
    expect(chips[0].label).toBe("所属組織: 999");
  });

  it("スキル・資格はそれぞれ個別チップになる", () => {
    const chips = buildResumeAppliedFilterChips(
      {
        ...EMPTY_RESUME_FILTERS,
        skillIds: [10, 11],
        certificationIds: [20],
      },
      RESUME_LOOKUPS,
    );
    expect(chips).toEqual([
      { id: "skill-10", label: "スキル: Java", remove: [{ key: "skillId", value: "10" }] },
      {
        id: "skill-11",
        label: "スキル: TypeScript",
        remove: [{ key: "skillId", value: "11" }],
      },
      {
        id: "certification-20",
        label: "資格: 基本情報技術者",
        remove: [{ key: "certificationId", value: "20" }],
      },
    ]);
  });

  it("現場条件は単一チップになる", () => {
    const chips = buildResumeAppliedFilterChips(
      { ...EMPTY_RESUME_FILTERS, siteId: 30 },
      RESUME_LOOKUPS,
    );
    expect(chips).toEqual([
      { id: "site", label: "現場: A社案件", remove: [{ key: "siteId" }] },
    ]);
  });

  it("退職者を含めるはチップになり、解除でincludeRetiredを削除する", () => {
    const chips = buildResumeAppliedFilterChips(
      { ...EMPTY_RESUME_FILTERS, includeRetired: true },
      RESUME_LOOKUPS,
    );
    expect(chips).toEqual([
      { id: "includeRetired", label: "退職者を含める", remove: [{ key: "includeRetired" }] },
    ]);
  });

  it("列フィルタ(col*)はチップの対象にしない", () => {
    const chips = buildResumeAppliedFilterChips(
      { ...EMPTY_RESUME_FILTERS, colName: "タナカ", colSkillIds: [10] },
      RESUME_LOOKUPS,
    );
    expect(chips).toEqual([]);
  });

  it("すべてクリア対象キーは検索フォームの条件キー一式(列フィルタを含まない)", () => {
    expect(RESUME_APPLIED_FILTER_CLEAR_KEYS).toEqual([
      "name",
      "orgUnitId",
      "experienceMin",
      "experienceMax",
      "skillId",
      "skillMode",
      "certificationId",
      "certificationMode",
      "siteId",
      "includeRetired",
    ]);
  });
});

const EMPTY_ACCOUNT_FILTERS: AccountFilters = {
  name: "",
  organizationUnitIds: [],
  roles: [],
  statuses: [],
  colName: "",
  colEmail: "",
  colOrganizationUnitIds: [],
  colRoles: [],
  colStatuses: [],
};

const ACCOUNT_LOOKUPS = {
  orgUnitName: (id: number) => ({ 1: "SI事業部" })[id],
  roleLabel: (role: AccountFilters["roles"][number]) =>
    ({ EMPLOYEE: "一般社員", HR_SALES: "人事・営業", MANAGER: "管理職" })[role],
  statusLabel: (status: AccountFilters["statuses"][number]) =>
    ({ UNREGISTERED: "初回未登録", ACTIVE: "在籍中", RETIRED: "退職" })[status],
};

describe("buildAccountAppliedFilterChips", () => {
  it("条件が何もなければ空配列を返す", () => {
    expect(buildAccountAppliedFilterChips(EMPTY_ACCOUNT_FILTERS, ACCOUNT_LOOKUPS)).toEqual([]);
  });

  it("権限・状態は選択値ごとに個別チップになる", () => {
    const chips = buildAccountAppliedFilterChips(
      {
        ...EMPTY_ACCOUNT_FILTERS,
        roles: ["MANAGER"],
        statuses: ["ACTIVE", "RETIRED"],
      },
      ACCOUNT_LOOKUPS,
    );
    expect(chips).toEqual([
      { id: "role-MANAGER", label: "権限: 管理職", remove: [{ key: "role", value: "MANAGER" }] },
      {
        id: "status-ACTIVE",
        label: "状態: 在籍中",
        remove: [{ key: "status", value: "ACTIVE" }],
      },
      {
        id: "status-RETIRED",
        label: "状態: 退職",
        remove: [{ key: "status", value: "RETIRED" }],
      },
    ]);
  });

  it("列フィルタ(col*)はチップの対象にしない", () => {
    const chips = buildAccountAppliedFilterChips(
      { ...EMPTY_ACCOUNT_FILTERS, colName: "タナカ", colRoles: ["MANAGER"] },
      ACCOUNT_LOOKUPS,
    );
    expect(chips).toEqual([]);
  });

  it("すべてクリア対象キーは検索フォームの条件キー一式(列フィルタを含まない)", () => {
    expect(ACCOUNT_APPLIED_FILTER_CLEAR_KEYS).toEqual([
      "name",
      "orgUnitId",
      "role",
      "status",
    ]);
  });
});
