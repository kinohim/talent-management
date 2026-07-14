"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

// REF004「私の経歴書」のセクション単位編集で、保存成功をフォーム側から
// セクション側(編集モード解除)へ通知するためのContext。単独画面(/registerの
// 初回登録等)ではProviderが無いためnullになり、フォームは何もしない。
const SectionEditContext = createContext<{ onSaved: () => void } | null>(null);

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
export function EditableSection({ title, view, form }: EditableSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editSession, setEditSession] = useState(0);

  const contextValue = useMemo(
    () => ({ onSaved: () => setIsEditing(false) }),
    [],
  );

  return (
    <section className="relative flex flex-col gap-3 rounded border p-4">
      <div className="absolute right-4 top-4">
        {isEditing ? (
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="rounded border px-3 py-1 text-xs"
          >
            キャンセル
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setEditSession((session) => session + 1);
              setIsEditing(true);
            }}
            className="rounded border px-3 py-1 text-xs"
          >
            編集
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">{title}の編集</h2>
          <SectionEditContext.Provider value={contextValue}>
            <div key={editSession}>{form}</div>
          </SectionEditContext.Provider>
        </div>
      ) : (
        view
      )}
    </section>
  );
}
