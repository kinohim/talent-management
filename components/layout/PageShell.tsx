"use client";

import { usePathname } from "next/navigation";

// 検索条件・テーブルを含みデータ量の多い画面は幅広(1600px)、それ以外の
// カード中心のシンプルな画面は1400pxにする。白背景カード自体の
// 幅をここで決め、コンテンツ側(各page.tsxのmain)は幅指定を持たない
// (カードの内側にそのまま収まる)。
const WIDE_PATH_PATTERNS: RegExp[] = [
  /^\/resumes\/?$/,
  /^\/accounts\/?$/,
  /^\/site-search(\/|$)/,
];

export function PageShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isWide = WIDE_PATH_PATTERNS.some((pattern) => pattern.test(pathname));

  return (
    <div
      className={`mx-auto flex w-full flex-1 flex-col rounded-2xl border border-surface-border bg-surface print:max-w-none ${
        isWide ? "max-w-[1600px]" : "max-w-[1400px]"
      }`}
    >
      {children}
    </div>
  );
}
