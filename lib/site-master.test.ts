import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: { count: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";

import { getSiteDeleteBlockReason } from "./site-master";

const countMock = vi.mocked(prisma.project.count);

describe("getSiteDeleteBlockReason", () => {
  beforeEach(() => {
    countMock.mockReset();
  });

  it("プロジェクト経歴から参照されていれば削除不可", async () => {
    countMock.mockResolvedValue(1);
    expect(await getSiteDeleteBlockReason(1)).toBe("使用中のため削除できません");
  });

  it("参照されていなければ削除可能(null)", async () => {
    countMock.mockResolvedValue(0);
    expect(await getSiteDeleteBlockReason(1)).toBeNull();
  });

  it("回帰: countはdeletedAt:nullで絞り込む(削除済みプロジェクトの残骸を使用中と誤判定しない)", async () => {
    countMock.mockResolvedValue(0);
    await getSiteDeleteBlockReason(1);
    expect(countMock).toHaveBeenCalledWith({
      where: { siteId: 1, deletedAt: null },
    });
  });
});
