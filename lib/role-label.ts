import { UserRole } from "@/generated/prisma/client";

const LABELS: Record<UserRole, string> = {
  [UserRole.EMPLOYEE]: "一般社員",
  [UserRole.HR_SALES]: "人事・営業",
  [UserRole.MANAGER]: "管理職",
};

export function roleLabel(role: UserRole): string {
  return LABELS[role];
}
