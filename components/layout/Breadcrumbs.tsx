"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { useListQueryHref } from "@/components/layout/useListQueryHref";
import { getBreadcrumbTrail } from "@/lib/breadcrumbs";

export function Breadcrumbs() {
  const pathname = usePathname();
  // 遷移元クエリ(?from=list等)でパンくずの上位を出し分ける(lib/breadcrumbs)
  const from = useSearchParams().get("from");
  const withListQuery = useListQueryHref();
  const trail = getBreadcrumbTrail(pathname, { from });

  if (trail.length === 0) return null;

  return (
    <nav
      aria-label="breadcrumb"
      className="border-b border-surface-border bg-background px-6 py-2 text-sm text-brand/80"
    >
      <ol className="flex items-center gap-1.5">
        {trail.map((item, index) => (
          <li key={item.path} className="flex items-center gap-1.5">
            {index > 0 ? (
              <span aria-hidden="true" className="text-brand/50">
                ›
              </span>
            ) : null}
            {index === trail.length - 1 ? (
              <span aria-current="page" className="font-medium text-brand">
                {item.label}
              </span>
            ) : (
              <Link
                href={withListQuery(item.path)}
                className="rounded-full px-1.5 py-0.5 hover:bg-primary/10 hover:underline"
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
