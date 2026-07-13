"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";

import {
  createOrganizationUnit,
  deleteOrganizationUnit,
  renameOrganizationUnit,
} from "@/app/(authenticated)/master/organization-units/actions";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { OrganizationUnitFormState } from "@/lib/organization-unit-schema";
import { deriveChildLevel, type OrganizationUnitNode } from "@/lib/organization-unit-tree";

const initialState: OrganizationUnitFormState = { error: null };
const DEPTH_PADDING = ["pl-0", "pl-6", "pl-12"];

type Mode = "view" | "rename" | "add-child";

export function OrganizationUnitNodeItem({
  node,
  depth,
}: {
  node: OrganizationUnitNode;
  depth: number;
}) {
  const [mode, setMode] = useState<Mode>("view");
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeletePending, startDeleteTransition] = useTransition();

  const renameAction = renameOrganizationUnit.bind(null, node.id);
  const [renameState, renameFormAction, isRenamePending] = useActionState(
    renameAction,
    initialState,
  );
  // action完了後にモードを戻す処理はレンダー中に前回値と比較して行う(useEffect
  // 内でのsetStateはカスケードレンダーを招くため避ける。React公式が推奨する
  // 「レンダー中に状態を調整する」パターン)。
  const [prevRenameState, setPrevRenameState] = useState(renameState);
  if (prevRenameState !== renameState) {
    setPrevRenameState(renameState);
    if (!renameState.error) setMode("view");
  }

  const addChildAction = createOrganizationUnit.bind(null, node.id);
  const [addChildState, addChildFormAction, isAddChildPending] = useActionState(
    addChildAction,
    initialState,
  );
  const [prevAddChildState, setPrevAddChildState] = useState(addChildState);
  if (prevAddChildState !== addChildState) {
    setPrevAddChildState(addChildState);
    if (!addChildState.error) setMode("view");
  }

  // フォームリセット(DOMの命令的操作)はレンダー中には行えないためuseEffectのまま
  // でよい(こちらはsetStateを呼ばない)。
  const addChildFormRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!addChildState.error) addChildFormRef.current?.reset();
  }, [addChildState]);

  const childLevel = deriveChildLevel(node.unitLevel);

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deleteOrganizationUnit(node.id);
      if (result.error) {
        setDeleteError(result.error);
        setShowConfirm(false);
      } else {
        setDeleteError(null);
      }
    });
  }

  return (
    <div className={`flex flex-col gap-1 py-1 ${DEPTH_PADDING[depth] ?? "pl-12"}`}>
      <div className="flex flex-wrap items-center gap-3">
        {mode === "rename" ? (
          <form action={renameFormAction} className="flex items-center gap-2">
            <input
              type="text"
              name="unitName"
              defaultValue={node.unitName}
              maxLength={100}
              autoFocus
              className="rounded border px-2 py-1 text-sm"
            />
            <button
              type="submit"
              disabled={isRenamePending}
              className="rounded border px-3 py-1 text-xs"
            >
              {isRenamePending ? "保存中..." : "保存"}
            </button>
            <button
              type="button"
              onClick={() => setMode("view")}
              className="text-xs text-zinc-500"
            >
              キャンセル
            </button>
            {renameState.error ? (
              <p role="alert" className="text-sm text-red-600">
                {renameState.error}
              </p>
            ) : null}
          </form>
        ) : (
          <span className="text-sm">{node.unitName}</span>
        )}

        {mode === "view" ? (
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              onClick={() => setMode("rename")}
              className="rounded border px-2 py-1"
            >
              編集
            </button>
            {childLevel ? (
              <button
                type="button"
                onClick={() => setMode("add-child")}
                className="rounded border px-2 py-1"
              >
                配下に追加
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              className="rounded border px-2 py-1 text-red-600"
            >
              削除
            </button>
          </div>
        ) : null}
      </div>

      {deleteError ? (
        <p role="alert" className="text-sm text-red-600">
          {deleteError}
        </p>
      ) : null}

      {mode === "add-child" ? (
        <form
          ref={addChildFormRef}
          action={addChildFormAction}
          className="flex flex-wrap items-center gap-2 pl-4"
        >
          <input
            type="text"
            name="unitName"
            placeholder="名称"
            maxLength={100}
            autoFocus
            className="rounded border px-2 py-1 text-sm"
          />
          <button
            type="submit"
            disabled={isAddChildPending}
            className="rounded border px-3 py-1 text-xs"
          >
            {isAddChildPending ? "追加中..." : "追加"}
          </button>
          <button
            type="button"
            onClick={() => setMode("view")}
            className="text-xs text-zinc-500"
          >
            キャンセル
          </button>
          {addChildState.error ? (
            <p role="alert" className="text-sm text-red-600">
              {addChildState.error}
            </p>
          ) : null}
        </form>
      ) : null}

      {node.children.map((child) => (
        <OrganizationUnitNodeItem key={child.id} node={child} depth={depth + 1} />
      ))}

      {showConfirm ? (
        <ConfirmDialog
          message={`「${node.unitName}」を削除してもよろしいですか？`}
          isPending={isDeletePending}
          onConfirm={handleDelete}
          onCancel={() => setShowConfirm(false)}
        />
      ) : null}
    </div>
  );
}
