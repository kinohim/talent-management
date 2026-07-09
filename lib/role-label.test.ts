import { describe, expect, it } from "vitest";

import { UserRole } from "@/generated/prisma/client";

import { roleLabel } from "./role-label";

describe("roleLabel", () => {
  it("EMPLOYEEは一般社員", () => {
    expect(roleLabel(UserRole.EMPLOYEE)).toBe("一般社員");
  });

  it("HR_SALESは人事・営業", () => {
    expect(roleLabel(UserRole.HR_SALES)).toBe("人事・営業");
  });

  it("MANAGERは管理職", () => {
    expect(roleLabel(UserRole.MANAGER)).toBe("管理職");
  });
});
