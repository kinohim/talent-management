import { redirect } from "next/navigation";

import { UserRole } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";

// マスタ管理画面(MST系)共通のロールチェック。未ログインは/login、
// 管理職以外は/へ差し戻す(master-org-unitsの実装から共通化)。
export async function requireManager() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== UserRole.MANAGER) redirect("/");
  return session.user;
}
