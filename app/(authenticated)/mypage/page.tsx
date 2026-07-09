import { redirect } from "next/navigation";

import { MyPageTiles } from "@/components/mypage/MyPageTiles";
import { UserRole } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { resolveDestination } from "@/lib/auth-routing";
import { prisma } from "@/lib/prisma";

export default async function MyPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role === UserRole.HR_SALES) {
    // 人事・営業は経歴書を作成しないため対象外(REF001参照)
    redirect("/");
  }

  // 未登録の一般社員/管理職が直接/mypageを開いた場合もEDT001へ戻す恒常ガード
  // (REF001と同じ方針)。
  const destination = await resolveDestination(session.user);
  if (destination !== "/") {
    redirect(destination);
  }

  const skillCount = await prisma.employeeSkill.count({
    where: { employeeId: session.user.employeeId },
  });

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <h1 className="text-lg font-semibold">マイページ</h1>
      <MyPageTiles skillCount={skillCount} />
    </main>
  );
}
