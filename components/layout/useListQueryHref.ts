"use client";

import { useSyncExternalStore } from "react";

import { restoreListQuery } from "@/lib/list-query-memory";

const emptySubscribe = () => () => {};

// パンくず・戻るリンクのhrefに、一覧画面の記憶済みクエリを付与するためのフック。
// sessionStorageはサーバーレンダリング時に読めないため、hydration完了後にのみ
// 反映する(サーバー描画とhydration初回はクエリなしのパス。不一致を避ける)。
export function useListQueryHref(): (path: string) => string {
  const hydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  return (path: string) => (hydrated ? `${path}${restoreListQuery(path)}` : path);
}
