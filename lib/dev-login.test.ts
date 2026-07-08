import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userAccount: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

import { findDevLoginUser } from "./dev-login";

const findUniqueMock = vi.mocked(prisma.userAccount.findUnique);

describe("findDevLoginUser", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
  });

  it("employeeIdが未入力ならnullを返す", async () => {
    expect(await findDevLoginUser(undefined)).toBeNull();
    expect(await findDevLoginUser("")).toBeNull();
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("該当するuser_accountがなければnullを返す", async () => {
    findUniqueMock.mockResolvedValue(null);

    expect(await findDevLoginUser("000001")).toBeNull();
  });

  it("退職済みの社員ならnullを返す", async () => {
    findUniqueMock.mockResolvedValue({
      employeeId: "000001",
      role: "EMPLOYEE",
      email: "taro@example.com",
      employee: { name: "山田太郎", employmentStatus: "RETIRED" },
    } as never);

    expect(await findDevLoginUser("000001")).toBeNull();
  });

  it("現職の社員ならユーザー情報を返す", async () => {
    findUniqueMock.mockResolvedValue({
      employeeId: "000001",
      role: "EMPLOYEE",
      email: "taro@example.com",
      employee: { name: "山田太郎", employmentStatus: "ACTIVE" },
    } as never);

    expect(await findDevLoginUser("000001")).toEqual({
      id: "000001",
      employeeId: "000001",
      role: "EMPLOYEE",
      name: "山田太郎",
      email: "taro@example.com",
    });
  });

  it("employee.nameが未設定ならemployeeIdをnameとして返す", async () => {
    findUniqueMock.mockResolvedValue({
      employeeId: "000002",
      role: "EMPLOYEE",
      email: "hanako@example.com",
      employee: { name: null, employmentStatus: "ACTIVE" },
    } as never);

    const result = await findDevLoginUser("000002");
    expect(result?.name).toBe("000002");
  });
});
