"use client";

import { useEffect } from "react";

import { usePathname, useSearchParams } from "next/navigation";

import { saveListQuery } from "@/lib/list-query-memory";

// 一覧画面の最新クエリ(検索条件・ソート・ページ)をsessionStorageへ記憶する。
// 対象パス以外では何もしない。(authenticated)レイアウトに常駐させる。
export function ListQueryRecorder() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    saveListQuery(pathname, searchParams.toString());
  }, [pathname, searchParams]);

  return null;
}
