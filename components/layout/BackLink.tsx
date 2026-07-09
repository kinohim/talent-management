"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { getBreadcrumbTrail } from "@/lib/breadcrumbs";

export function BackLink() {
  const pathname = usePathname();
  const trail = getBreadcrumbTrail(pathname);

  // 親を持たない画面(トップ)、または未登録パスでは非表示
  if (trail.length < 2) return null;

  const parent = trail[trail.length - 2];

  return (
    <Link
      href={parent.path}
      className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 hover:underline dark:hover:text-zinc-300"
    >
      <span aria-hidden="true">←</span>
      {parent.label}に戻る
    </Link>
  );
}
