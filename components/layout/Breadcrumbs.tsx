"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useListQueryHref } from "@/components/layout/useListQueryHref";
import { getBreadcrumbTrail } from "@/lib/breadcrumbs";

export function Breadcrumbs() {
  const pathname = usePathname();
  const withListQuery = useListQueryHref();
  const trail = getBreadcrumbTrail(pathname);

  if (trail.length === 0) return null;

  return (
    <nav aria-label="breadcrumb" className="border-b px-6 py-2 text-sm text-zinc-500">
      <ol className="flex items-center gap-1">
        {trail.map((item, index) => (
          <li key={item.path} className="flex items-center gap-1">
            {index > 0 ? <span aria-hidden="true">›</span> : null}
            {index === trail.length - 1 ? (
              <span aria-current="page" className="text-zinc-700 dark:text-zinc-300">
                {item.label}
              </span>
            ) : (
              <Link href={withListQuery(item.path)} className="hover:underline">
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
