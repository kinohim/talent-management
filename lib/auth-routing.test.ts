import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    employee: {
      findUnique: vi.fn(),
    },
  },
}));

import { UserRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import { isEmployeeRegistered, resolveDestination } from "./auth-routing";

const findUniqueMock = vi.mocked(prisma.employee.findUnique);

describe("isEmployeeRegistered", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
  });

  it("isRegistered=trueならtrueを返す", async () => {
    findUniqueMock.mockResolvedValue({ isRegistered: true } as never);
    expect(await isEmployeeRegistered("000001")).toBe(true);
  });

  it("isRegistered=falseならfalseを返す", async () => {
    findUniqueMock.mockResolvedValue({ isRegistered: false } as never);
    expect(await isEmployeeRegistered("000001")).toBe(false);
  });

  it("該当employeeがなければfalseを返す", async () => {
    findUniqueMock.mockResolvedValue(null);
    expect(await isEmployeeRegistered("999999")).toBe(false);
  });
});

describe("resolveDestination", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
  });

  it("HR_SALESはisRegisteredを問わず常に/を返す", async () => {
    expect(
      await resolveDestination({ employeeId: "000003", role: UserRole.HR_SALES }),
    ).toBe("/");
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("EMPLOYEEでisRegistered=falseなら/registerを返す", async () => {
    findUniqueMock.mockResolvedValue({ isRegistered: false } as never);
    expect(
      await resolveDestination({ employeeId: "000005", role: UserRole.EMPLOYEE }),
    ).toBe("/register");
  });

  it("MANAGERでisRegistered=trueなら/を返す", async () => {
    findUniqueMock.mockResolvedValue({ isRegistered: true } as never);
    expect(
      await resolveDestination({ employeeId: "000001", role: UserRole.MANAGER }),
    ).toBe("/");
  });
});
