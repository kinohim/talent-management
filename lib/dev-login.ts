import { prisma } from "@/lib/prisma";

export async function findDevLoginUser(employeeId: unknown) {
  if (typeof employeeId !== "string" || employeeId.length === 0) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { employeeId },
    include: { employee: true },
  });

  if (!user || user.employee.employmentStatus === "RETIRED") {
    return null;
  }

  return {
    id: user.id,
    employeeId: user.employeeId,
    role: user.role,
    name: user.employee.name ?? user.employeeId,
    email: user.email,
  };
}
