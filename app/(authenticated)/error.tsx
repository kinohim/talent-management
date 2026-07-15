"use client";

import { useEffect } from "react";

export default function AuthenticatedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
      <p className="text-sm text-red-600">
        エラーが発生しました。時間をおいて再度お試しください。
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded border px-4 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
      >
        再試行
      </button>
    </main>
  );
}
