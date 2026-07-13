import { Prisma } from "@/generated/prisma/client";

// P2002はunique制約違反(スキル名/資格名/現場ポジション名/現場名等、システム
// 全体でユニークなカラムの重複作成・更新時に発生する)。
export function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}
