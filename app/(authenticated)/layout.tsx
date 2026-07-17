import { Suspense } from "react";

import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { BackLink } from "@/components/layout/BackLink";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { ListQueryRecorder } from "@/components/layout/ListQueryRecorder";
import { auth } from "@/lib/auth";
import { displayNameForEmployee } from "@/lib/employee-name";
import { roleLabel } from "@/lib/role-label";

export default async function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // セッションのnameではなくemployee.nameを都度参照する(SSOログインでは
  // セッションにnameが入らず、basic-infoでの名前登録も即時反映したいため)
  const displayName = await displayNameForEmployee(session.user.employeeId);

  return (
    <div className="flex flex-1 flex-col">
      {/* 一覧画面の絞り込みクエリを記憶する(戻りリンクでの復元用)。
          useSearchParamsを使うためSuspenseで包む */}
      <Suspense fallback={null}>
        <ListQueryRecorder />
      </Suspense>
      {/* ヘッダとパンくずはスクロールしても画面上部に固定する(全画面共通)。
          sticky要素は背景が透けると下の内容が重なって見えるため背景色を明示する */}
      <div className="sticky top-0 z-40 bg-[var(--background)] print:hidden">
        <header className="flex items-center justify-between border-b px-6 py-4 text-sm">
          <span className="font-semibold">業務経歴書</span>
          <div className="flex items-center gap-3">
            <span>
              {displayName}（{session.user.employeeId} /{" "}
              {roleLabel(session.user.role)}）
            </span>
            <LogoutButton />
          </div>
        </header>
        {/* useSearchParamsを使うためSuspenseで包む(ListQueryRecorderと同様) */}
        <Suspense fallback={null}>
          <Breadcrumbs />
        </Suspense>
      </div>
      <div className="flex flex-1 flex-col">
        <div className="px-6 pt-4 print:hidden">
          <Suspense fallback={null}>
            <BackLink />
          </Suspense>
        </div>
        {children}
      </div>
    </div>
  );
}
