import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    employeeSkill: { count: vi.fn() },
    projectSkill: { count: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";

import {
  getSkillDeleteBlockReason,
  isSkillVersionReferenced,
  planSkillVersionDiff,
} from "./skill-master";

const employeeSkillCountMock = vi.mocked(prisma.employeeSkill.count);
const projectSkillCountMock = vi.mocked(prisma.projectSkill.count);

describe("planSkillVersionDiff", () => {
  it("新規タグのみ渡すとすべてtoCreateになる", () => {
    const plan = planSkillVersionDiff([], ["8", "11"]);
    expect(plan).toEqual({ toCreate: ["8", "11"], toReactivateIds: [], toRemoveIds: [] });
  });

  it("既存activeなタグと完全一致すれば何もしない", () => {
    const existing = [{ id: 1, versionName: "8", isActive: true }];
    const plan = planSkillVersionDiff(existing, ["8"]);
    expect(plan).toEqual({ toCreate: [], toReactivateIds: [], toRemoveIds: [] });
  });

  it("既存inactiveなタグと同名を送信すると再表示化対象になる(新規作成しない)", () => {
    const existing = [{ id: 1, versionName: "8", isActive: false }];
    const plan = planSkillVersionDiff(existing, ["8"]);
    expect(plan).toEqual({ toCreate: [], toReactivateIds: [1], toRemoveIds: [] });
  });

  it("既存activeなタグが送信リストになければ削除候補になる", () => {
    const existing = [
      { id: 1, versionName: "8", isActive: true },
      { id: 2, versionName: "11", isActive: true },
    ];
    const plan = planSkillVersionDiff(existing, ["8"]);
    expect(plan).toEqual({ toCreate: [], toReactivateIds: [], toRemoveIds: [2] });
  });

  it("既存inactiveなタグが送信リストになくても削除候補にはならない(既に非表示のため)", () => {
    const existing = [{ id: 1, versionName: "8", isActive: false }];
    const plan = planSkillVersionDiff(existing, []);
    expect(plan).toEqual({ toCreate: [], toReactivateIds: [], toRemoveIds: [] });
  });
});

describe("getSkillDeleteBlockReason", () => {
  beforeEach(() => {
    employeeSkillCountMock.mockReset();
    projectSkillCountMock.mockReset();
  });

  it("社員のスキル登録から参照されていれば削除不可", async () => {
    employeeSkillCountMock.mockResolvedValue(1);
    projectSkillCountMock.mockResolvedValue(0);
    expect(await getSkillDeleteBlockReason(1)).toBe("使用中のため削除できません");
  });

  it("プロジェクト経歴から参照されていれば削除不可", async () => {
    employeeSkillCountMock.mockResolvedValue(0);
    projectSkillCountMock.mockResolvedValue(1);
    expect(await getSkillDeleteBlockReason(1)).toBe("使用中のため削除できません");
  });

  it("どちらからも参照されていなければ削除可能(null)", async () => {
    employeeSkillCountMock.mockResolvedValue(0);
    projectSkillCountMock.mockResolvedValue(0);
    expect(await getSkillDeleteBlockReason(1)).toBeNull();
  });

  it("回帰: projectSkillのcountはdeletedAt:nullで絞り込む(削除済みプロジェクトの残骸を使用中と誤判定しない)", async () => {
    employeeSkillCountMock.mockResolvedValue(0);
    projectSkillCountMock.mockResolvedValue(0);
    await getSkillDeleteBlockReason(1);
    expect(projectSkillCountMock).toHaveBeenCalledWith({
      where: { skillId: 1, deletedAt: null },
    });
  });
});

describe("isSkillVersionReferenced", () => {
  beforeEach(() => {
    employeeSkillCountMock.mockReset();
    projectSkillCountMock.mockReset();
  });

  it("いずれかから参照されていればtrue", async () => {
    employeeSkillCountMock.mockResolvedValue(1);
    projectSkillCountMock.mockResolvedValue(0);
    expect(await isSkillVersionReferenced(1)).toBe(true);
  });

  it("どちらからも参照されていなければfalse", async () => {
    employeeSkillCountMock.mockResolvedValue(0);
    projectSkillCountMock.mockResolvedValue(0);
    expect(await isSkillVersionReferenced(1)).toBe(false);
  });

  it("回帰: projectSkillのcountはdeletedAt:nullで絞り込む", async () => {
    employeeSkillCountMock.mockResolvedValue(0);
    projectSkillCountMock.mockResolvedValue(0);
    await isSkillVersionReferenced(1);
    expect(projectSkillCountMock).toHaveBeenCalledWith({
      where: { skillVersionId: 1, deletedAt: null },
    });
  });
});
