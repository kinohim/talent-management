import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    employee: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

import { displayNameForEmployee } from "./employee-name";

const findUniqueMock = vi.mocked(prisma.employee.findUnique);

describe("displayNameForEmployee", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
  });

  it("employee.nameが登録済みなら名前を返す", async () => {
    findUniqueMock.mockResolvedValue({ name: "山田太郎" } as never);

    expect(await displayNameForEmployee("000001")).toBe("山田太郎");
  });

  it("employee.nameが未登録(null)なら社員IDを返す", async () => {
    findUniqueMock.mockResolvedValue({ name: null } as never);

    expect(await displayNameForEmployee("000001")).toBe("000001");
  });

  it("employeeが見つからなければ社員IDを返す", async () => {
    findUniqueMock.mockResolvedValue(null);

    expect(await displayNameForEmployee("000001")).toBe("000001");
  });
});
