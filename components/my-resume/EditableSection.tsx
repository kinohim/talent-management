"use client";

import {
  createContext,
  useContext,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// REF004「私の経歴書」のセクション単位編集で、フォーム側とセクション側を
// つなぐContext。単独画面(/registerの初回登録等)ではProviderが無いため
// nullになり、フォームは自前の保存ボタンを表示して従来どおり動く。
// - onSaved: 保存成功をフォームから通知(編集モード解除)
// - formId: ヘッダの保存ボタン(form属性)と<form>を関連付けるid
// - setPending: フォームのisPendingをヘッダの保存ボタンへ反映
const SectionEditContext = createContext<{
  onSaved: () => void;
  formId: string;
  setPending: (pending: boolean) => void;
} | null>(null);

export function useSectionEdit() {
  return useContext(SectionEditContext);
}

type EditableSectionProps = {
  title: string;
  // 閲覧表示(REF003と同じResume*コンポーネント。見出しは各コンポーネント側が持つ)
  view: ReactNode;
  // 編集フォーム(既存のEDT001〜004のフォームコンポーネント)
  form: ReactNode;
};

// 閲覧表示と編集フォームを切り替えるセクション枠。view/formはServer Componentから
// レンダリング済みのReactNodeとして受け取る(スロット渡し)。編集モードに入る
// たびにformをkeyで再マウントし、キャンセル時の入力値を確実に破棄する。
// 見出しは編集/非編集を問わず本コンポーネントが同じ位置に表示する。
// 編集中はヘッダに[保存][キャンセル]を横並びで表示し、保存はform属性経由で
// フォームをsubmitする(フォーム内には保存ボタンを置かない)。
export function EditableSection({ title, view, form }: EditableSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editSession, setEditSession] = useState(0);
  const [isPending, setIsPending] = useState(false);
  const formId = useId();

  const contextValue = useMemo(
    () => ({
      onSaved: () => setIsEditing(false),
      formId,
      setPending: setIsPending,
    }),
    [formId],
  );

  return (
    <section className="flex flex-col gap-3 rounded border p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{title}</h2>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <button
              type="submit"
              form={formId}
              disabled={isPending}
              className="rounded bg-zinc-900 px-4 py-1 text-xs text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {isPending ? "保存中..." : "保存"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setIsPending(false);
              }}
              className="rounded border px-3 py-1 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              キャンセル
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setEditSession((session) => session + 1);
              setIsPending(false);
              setIsEditing(true);
            }}
            className="rounded border px-3 py-1 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            編集
          </button>
        )}
      </div>

      {isEditing ? (
        <SectionEditContext.Provider value={contextValue}>
          <div key={editSession}>{form}</div>
        </SectionEditContext.Provider>
      ) : (
        view
      )}
    </section>
  );
}
