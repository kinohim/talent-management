import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

import { findDevLoginUser } from "./dev-login";

const findUniqueMock = vi.mocked(prisma.user.findUnique);

describe("findDevLoginUser", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
  });

  it("employeeIdが未入力なら EMPTY_EMPLOYEE_ID を返す", async () => {
    expect(await findDevLoginUser(undefined)).toEqual({
      ok: false,
      reason: "EMPTY_EMPLOYEE_ID",
    });
    expect(await findDevLoginUser("")).toEqual({
      ok: false,
      reason: "EMPTY_EMPLOYEE_ID",
    });
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("該当するUserがなければ NOT_REGISTERED を返す", async () => {
    findUniqueMock.mockResolvedValue(null);

    expect(await findDevLoginUser("000001")).toEqual({
      ok: false,
      reason: "NOT_REGISTERED",
    });
  });

  it("退職済みの社員なら RETIRED を返す", async () => {
    findUniqueMock.mockResolvedValue({
      id: "cuid_000001",
      employeeId: "000001",
      role: "EMPLOYEE",
      email: "taro@example.com",
      employee: { name: "山田太郎", employmentStatus: "RETIRED" },
    } as never);

    expect(await findDevLoginUser("000001")).toEqual({
      ok: false,
      reason: "RETIRED",
    });
  });

  it("現職の社員ならユーザー情報を返す", async () => {
    findUniqueMock.mockResolvedValue({
      id: "cuid_000001",
      employeeId: "000001",
      role: "EMPLOYEE",
      email: "taro@example.com",
      employee: { name: "山田太郎", employmentStatus: "ACTIVE" },
    } as never);

    expect(await findDevLoginUser("000001")).toEqual({
      ok: true,
      user: {
        id: "cuid_000001",
        employeeId: "000001",
        role: "EMPLOYEE",
        name: "山田太郎",
        email: "taro@example.com",
      },
    });
  });

  it("employee.nameが未設定ならemployeeIdをnameとして返す", async () => {
    findUniqueMock.mockResolvedValue({
      id: "cuid_000002",
      employeeId: "000002",
      role: "EMPLOYEE",
      email: "hanako@example.com",
      employee: { name: null, employmentStatus: "ACTIVE" },
    } as never);

    const result = await findDevLoginUser("000002");
    expect(result.ok).toBe(true);
    expect(result.ok && result.user.name).toBe("000002");
  });
});
