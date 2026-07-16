"use client";

// 検索実行中などの待ち時間に画面全体へ表示するローディングオーバーレイ
// (resume-list/account-list共通)。呼び出し側でuseTransitionのisPendingを渡す。
export function LoadingOverlay({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 dark:bg-black/60"
    >
      <span
        aria-hidden
        className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-600 dark:border-t-zinc-100"
      />
      <span className="sr-only">検索中...</span>
    </div>
  );
}
