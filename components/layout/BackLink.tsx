"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { useListQueryHref } from "@/components/layout/useListQueryHref";
import { getBreadcrumbTrail } from "@/lib/breadcrumbs";

export function BackLink() {
  const pathname = usePathname();
  // 遷移元クエリ(?from=list等)でパンくずの上位を出し分ける(lib/breadcrumbs)
  const from = useSearchParams().get("from");
  const withListQuery = useListQueryHref();
  const trail = getBreadcrumbTrail(pathname, { from });

  // 親を持たない画面(トップ)、または未登録パスでは非表示
  if (trail.length < 2) return null;

  const parent = trail[trail.length - 2];

  return (
    <Link
      href={withListQuery(parent.path)}
      className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm text-brand/80 hover:bg-primary/10 hover:text-brand hover:underline"
    >
      <span aria-hidden="true">←</span>
      {parent.label}に戻る
    </Link>
  );
}
