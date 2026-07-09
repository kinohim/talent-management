import { UserRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function isEmployeeRegistered(employeeId: string): Promise<boolean> {
  const employee = await prisma.employee.findUnique({
    where: { employeeId },
    select: { isRegistered: true },
  });
  return employee?.isRegistered ?? false;
}

export type Destination = "/" | "/register";

// ログイン成功直後、およびREF001自体を開いたときの恒常ガードの両方から呼ばれる、
// 「今どこへ行くべきか」を1箇所に集約した関数。人事・営業(HR_SALES)は経歴書を
// 作成しないためEDT001を経ずREF001へ直行する(docs/screens.md AUTH001参照)。
export async function resolveDestination(user: {
  employeeId: string;
  role: UserRole;
}): Promise<Destination> {
  if (user.role === UserRole.HR_SALES) {
    return "/";
  }
  const registered = await isEmployeeRegistered(user.employeeId);
  return registered ? "/" : "/register";
}
