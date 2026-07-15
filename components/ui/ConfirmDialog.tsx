"use client";

type ConfirmDialogProps = {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

// CMN001(削除確認モーダル)。表示するかどうかは呼び出し元がstateで管理し、
// 表示する時だけこのコンポーネントをレンダーする。
export function ConfirmDialog({
  message,
  confirmLabel = "削除する",
  cancelLabel = "キャンセル",
  isPending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-sm rounded bg-white p-6 shadow-lg dark:bg-zinc-900">
        <p className="text-sm">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border px-4 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="rounded bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {isPending ? "処理中..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
