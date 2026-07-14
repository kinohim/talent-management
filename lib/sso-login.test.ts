import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

import { pickVerifiedPrimaryEmail, resolveSsoLogin } from "./sso-login";

const findUniqueMock = vi.mocked(prisma.user.findUnique);

describe("pickVerifiedPrimaryEmail", () => {
  it("verifiedかつprimaryのメールを返す", () => {
    expect(
      pickVerifiedPrimaryEmail([
        { email: "sub@example.com", primary: false, verified: true },
        { email: "taro@example.com", primary: true, verified: true },
      ]),
    ).toBe("taro@example.com");
  });

  it("primaryだが未検証(verified=false)しかなければnullを返す", () => {
    expect(
      pickVerifiedPrimaryEmail([
        { email: "taro@example.com", primary: true, verified: false },
        { email: "sub@example.com", primary: false, verified: true },
      ]),
    ).toBeNull();
  });

  it("配列でない・空配列ならnullを返す", () => {
    expect(pickVerifiedPrimaryEmail(null)).toBeNull();
    expect(pickVerifiedPrimaryEmail({ message: "Bad credentials" })).toBeNull();
    expect(pickVerifiedPrimaryEmail([])).toBeNull();
  });
});

describe("resolveSsoLogin", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
  });

  const activeUser = (accounts: { provider: string }[]) =>
    ({
      id: "cuid_000001",
      employeeId: "000001",
      email: "taro@example.com",
      employee: { employmentStatus: "ACTIVE" },
      accounts,
    }) as never;

  it("emailが取得できなければ not-registered を返す(DB照合しない)", async () => {
    expect(await resolveSsoLogin({ email: null, provider: "github" })).toEqual({
      ok: false,
      errorCode: "not-registered",
    });
    expect(await resolveSsoLogin({ email: undefined, provider: "github" })).toEqual({
      ok: false,
      errorCode: "not-registered",
    });
    expect(await resolveSsoLogin({ email: "", provider: "github" })).toEqual({
      ok: false,
      errorCode: "not-registered",
    });
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("該当するUserがなければ not-registered を返す", async () => {
    findUniqueMock.mockResolvedValue(null);

    expect(
      await resolveSsoLogin({ email: "taro@example.com", provider: "github" }),
    ).toEqual({ ok: false, errorCode: "not-registered" });
  });

  it("退職済みの社員なら retired を返す", async () => {
    findUniqueMock.mockResolvedValue({
      id: "cuid_000001",
      employeeId: "000001",
      email: "taro@example.com",
      employee: { employmentStatus: "RETIRED" },
      accounts: [],
    } as never);

    expect(
      await resolveSsoLogin({ email: "taro@example.com", provider: "github" }),
    ).toEqual({ ok: false, errorCode: "retired" });
  });

  it("別プロバイダで紐付き済みなら provider-mismatch を返す", async () => {
    findUniqueMock.mockResolvedValue(activeUser([{ provider: "google" }]));

    expect(
      await resolveSsoLogin({ email: "taro@example.com", provider: "github" }),
    ).toEqual({ ok: false, errorCode: "provider-mismatch" });
  });

  it("紐付きがなければ初回ログインとして ok を返す", async () => {
    findUniqueMock.mockResolvedValue(activeUser([]));

    expect(
      await resolveSsoLogin({ email: "taro@example.com", provider: "github" }),
    ).toEqual({ ok: true });
  });

  it("同一プロバイダで紐付き済み(2回目以降)なら ok を返す", async () => {
    findUniqueMock.mockResolvedValue(activeUser([{ provider: "github" }]));

    expect(
      await resolveSsoLogin({ email: "taro@example.com", provider: "github" }),
    ).toEqual({ ok: true });
  });

  it("メールは小文字化して照合する", async () => {
    findUniqueMock.mockResolvedValue(activeUser([]));

    await resolveSsoLogin({ email: "Taro@Example.COM", provider: "github" });

    expect(findUniqueMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "taro@example.com" } }),
    );
  });
});
