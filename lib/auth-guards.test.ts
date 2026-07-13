import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { UserRole } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";

import { requireManager } from "./auth-guards";

// authはNextAuthのオーバーロード型(middleware用途含む)を持つため、
// vi.mocked()だと戻り値の型推論を誤る。テスト用にMockへ直接キャストする。
const authMock = auth as unknown as Mock;

describe("requireManager", () => {
  beforeEach(() => {
    authMock.mockReset();
    redirectMock.mockClear();
  });

  it("未ログインなら/loginへredirectする", async () => {
    authMock.mockResolvedValue(null);
    await expect(requireManager()).rejects.toThrow("REDIRECT:/login");
  });

  it("MANAGER以外なら/へredirectする", async () => {
    authMock.mockResolvedValue({
      user: { role: UserRole.EMPLOYEE, employeeId: "000002" },
    } as never);
    await expect(requireManager()).rejects.toThrow("REDIRECT:/");
  });

  it("MANAGERならsession.userを返す", async () => {
    const user = { role: UserRole.MANAGER, employeeId: "000001" };
    authMock.mockResolvedValue({ user } as never);
    expect(await requireManager()).toEqual(user);
  });
});
