import type { UserRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type DevLoginUser = {
  id: string;
  employeeId: string;
  role: UserRole;
  name: string;
  email: string;
};

export type DevLoginResult =
  | { ok: true; user: DevLoginUser }
  | { ok: false; reason: "EMPTY_EMPLOYEE_ID" | "NOT_REGISTERED" | "RETIRED" };

export async function findDevLoginUser(employeeId: unknown): Promise<DevLoginResult> {
  if (typeof employeeId !== "string" || employeeId.length === 0) {
    return { ok: false, reason: "EMPTY_EMPLOYEE_ID" };
  }

  const user = await prisma.user.findUnique({
    where: { employeeId },
    include: { employee: true },
  });

  if (!user) {
    return { ok: false, reason: "NOT_REGISTERED" };
  }

  if (user.employee.employmentStatus === "RETIRED") {
    return { ok: false, reason: "RETIRED" };
  }

  return {
    ok: true,
    user: {
      id: user.id,
      employeeId: user.employeeId,
      role: user.role,
      name: user.employee.name ?? user.employeeId,
      email: user.email,
    },
  };
}
