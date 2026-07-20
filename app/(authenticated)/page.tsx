import { redirect } from "next/navigation";

import { HomeTiles } from "@/components/home/HomeTiles";
import { auth } from "@/lib/auth";
import { resolveDestination } from "@/lib/auth-routing";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // 未登録の一般社員/管理職が直接/を開いた場合もbasic-infoへ戻す恒常ガード
  // (docs/screens.md loginの遷移ルールをここでも保証する)。
  const destination = await resolveDestination(session.user);
  if (destination !== "/") {
    redirect(destination);
  }

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <h1 className="text-lg font-semibold">トップ</h1>
      <HomeTiles role={session.user.role} />
    </main>
  );
}
