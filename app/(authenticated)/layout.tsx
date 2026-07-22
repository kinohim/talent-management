import { Suspense } from "react";

import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { BackLink } from "@/components/layout/BackLink";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { HeaderNav } from "@/components/layout/HeaderNav";
import { ListQueryRecorder } from "@/components/layout/ListQueryRecorder";
import { PageShell } from "@/components/layout/PageShell";
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
        <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-surface-border bg-surface px-6 py-4 text-sm">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/" className="font-semibold text-brand">
              経歴書
            </Link>
            <HeaderNav role={session.user.role} />
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-background px-3.5 py-1.5 text-foreground/80">
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
      {/* 淡緑はキャンバス(ヘッダー・パンくず・この余白部分)にとどめ、本文が乗る
          コンテンツ領域は白(surface)にして読みやすさを確保する */}
      <div className="flex flex-1 flex-col px-4 pb-4 sm:px-6 sm:pb-6">
        <PageShell>
          <div className="px-6 pt-4 print:hidden">
            <Suspense fallback={null}>
              <BackLink />
            </Suspense>
          </div>
          {children}
        </PageShell>
      </div>
    </div>
  );
}
