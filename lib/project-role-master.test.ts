import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    projectRoleLink: { count: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";

import { getProjectRoleDeleteBlockReason } from "./project-role-master";

const countMock = vi.mocked(prisma.projectRoleLink.count);

describe("getProjectRoleDeleteBlockReason", () => {
  beforeEach(() => {
    countMock.mockReset();
  });

  it("プロジェクト経歴から参照されていれば削除不可", async () => {
    countMock.mockResolvedValue(1);
    expect(await getProjectRoleDeleteBlockReason(1)).toBe("使用中のため削除できません");
  });

  it("参照されていなければ削除可能(null)", async () => {
    countMock.mockResolvedValue(0);
    expect(await getProjectRoleDeleteBlockReason(1)).toBeNull();
  });

  it("回帰: countはdeletedAt:nullで絞り込む(削除済みプロジェクトの残骸を使用中と誤判定しない)", async () => {
    countMock.mockResolvedValue(0);
    await getProjectRoleDeleteBlockReason(1);
    expect(countMock).toHaveBeenCalledWith({
      where: { projectRoleId: 1, deletedAt: null },
    });
  });
});
