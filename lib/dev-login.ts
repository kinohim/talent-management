import { prisma } from "@/lib/prisma";

export async function findDevLoginUser(employeeId: unknown) {
  if (typeof employeeId !== "string" || employeeId.length === 0) {
    return null;
  }

  const userAccount = await prisma.userAccount.findUnique({
    where: { employeeId },
    include: { employee: true },
  });

  if (!userAccount || userAccount.employee.employmentStatus === "RETIRED") {
    return null;
  }

  return {
    id: userAccount.employeeId,
    employeeId: userAccount.employeeId,
    role: userAccount.role,
    name: userAccount.employee.name ?? userAccount.employeeId,
    email: userAccount.email,
  };
}
