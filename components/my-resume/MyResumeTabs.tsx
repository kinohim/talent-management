"use client";

import { useState, type ReactNode } from "react";

import type { MyResumeTab } from "@/lib/my-resume-tabs";

type MyResumeTabsProps = {
  initialTab: MyResumeTab;
  coverPanel: ReactNode;
  projectsPanel: ReactNode;
  // タブ行の右端に置く操作(PDF出力ボタン等)。Server Componentから
  // レンダリング済みのReactNodeをスロットで受け取る
  actions?: ReactNode;
};

const TABS: { key: MyResumeTab; label: string }[] = [
  { key: "cover", label: "表紙" },
  { key: "projects", label: "実績" },
];

// mypage「私の経歴書」のタブ切替。両パネルはServer Componentでレンダリング済みの
// ものをスロットで受け取り、切替はクライアント側の表示切替のみで行う(RSCの
// 再フェッチなしで即時)。URLの?tab=はreplaceStateで同期し、リロードや
// プロジェクト編集からの戻りで実績タブへ復帰できるようにする。
export function MyResumeTabs({
  initialTab,
  coverPanel,
  projectsPanel,
  actions,
}: MyResumeTabsProps) {
  const [tab, setTab] = useState<MyResumeTab>(initialTab);

  function switchTab(next: MyResumeTab) {
    setTab(next);
    const url = next === "cover" ? "/mypage" : `/mypage?tab=${next}`;
    window.history.replaceState(null, "", url);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-2 border-b border-surface-border">
        <div role="tablist" className="flex gap-1">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => switchTab(key)}
              className={
                tab === key
                  ? "-mb-px rounded-t-2xl border border-b-transparent border-surface-border px-6 py-2 text-sm font-semibold text-brand"
                  : "px-6 py-2 text-sm text-foreground/50 hover:text-brand"
              }
            >
              {label}
            </button>
          ))}
        </div>
        {/* タブと同じ行の右端(PDF出力ボタン等) */}
        {actions ? <div className="pb-1">{actions}</div> : null}
      </div>

      {/* 非表示側もアンマウントせずhiddenで保持する(編集途中の状態をタブ切替で
          失わないため) */}
      <div hidden={tab !== "cover"}>{coverPanel}</div>
      <div hidden={tab !== "projects"}>{projectsPanel}</div>
    </div>
  );
}
