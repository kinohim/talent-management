import { describe, expect, it } from "vitest";

import { Prisma } from "@/generated/prisma/client";

import { isUniqueConstraintViolation } from "./prisma-errors";

function knownRequestError(code: string) {
  return new Prisma.PrismaClientKnownRequestError("test error", {
    code,
    clientVersion: "test",
  });
}

describe("isUniqueConstraintViolation", () => {
  it("P2002ならtrue", () => {
    expect(isUniqueConstraintViolation(knownRequestError("P2002"))).toBe(true);
  });

  it("P2002以外のPrismaエラーコードならfalse", () => {
    expect(isUniqueConstraintViolation(knownRequestError("P2025"))).toBe(false);
  });

  it("Prismaのエラーでなければfalse", () => {
    expect(isUniqueConstraintViolation(new Error("plain error"))).toBe(false);
  });

  it("エラーでない値ならfalse", () => {
    expect(isUniqueConstraintViolation(null)).toBe(false);
    expect(isUniqueConstraintViolation(undefined)).toBe(false);
    expect(isUniqueConstraintViolation("string")).toBe(false);
  });
});
