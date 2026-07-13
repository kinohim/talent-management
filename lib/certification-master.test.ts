import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    employeeCertification: { count: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";

import { getCertificationDeleteBlockReason } from "./certification-master";

const countMock = vi.mocked(prisma.employeeCertification.count);

describe("getCertificationDeleteBlockReason", () => {
  beforeEach(() => {
    countMock.mockReset();
  });

  it("社員の資格登録から参照されていれば削除不可", async () => {
    countMock.mockResolvedValue(1);
    expect(await getCertificationDeleteBlockReason(1)).toBe("使用中のため削除できません");
  });

  it("参照されていなければ削除可能(null)", async () => {
    countMock.mockResolvedValue(0);
    expect(await getCertificationDeleteBlockReason(1)).toBeNull();
  });
});
