"use client";

import {
  createContext,
  useContext,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// mypage「私の経歴書」のセクション単位編集で、フォーム側とセクション側を
// つなぐContext。単独画面(/basic-infoの初回登録等)ではProviderが無いため
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
  // 閲覧表示(resume-detailと同じResume*コンポーネント。見出しは各コンポーネント側が持つ)
  view: ReactNode;
  // 編集フォーム(基本情報〜資格の各セクションで使う既存フォームコンポーネント)
  form: ReactNode;
  // 入力率バナーの「未入力項目を入力する」リンク先(スクロール先)のDOM id
  id?: string;
};

// 閲覧表示と編集フォームを切り替えるセクション枠。view/formはServer Componentから
// レンダリング済みのReactNodeとして受け取る(スロット渡し)。編集モードに入る
// たびにformをkeyで再マウントし、キャンセル時の入力値を確実に破棄する。
// 見出しは編集/非編集を問わず本コンポーネントが同じ位置に表示する。
// 編集中はヘッダに[保存][キャンセル]を横並びで表示し、保存はform属性経由で
// フォームをsubmitする(フォーム内には保存ボタンを置かない)。
export function EditableSection({ title, view, form, id }: EditableSectionProps) {
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
    <section
      id={id}
      className="flex scroll-mt-32 flex-col gap-3 rounded-2xl border border-surface-border p-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-brand">{title}</h2>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <button
              type="submit"
              form={formId}
              disabled={isPending}
              className="rounded-full bg-primary px-4 py-1 text-xs text-primary-foreground hover:bg-primary-dark disabled:opacity-50"
            >
              {isPending ? "保存中..." : "保存"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setIsPending(false);
              }}
              className="rounded-full border border-surface-border px-3 py-1 text-xs hover:bg-primary/10"
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
            className="rounded-full border border-primary px-3 py-1 text-xs text-brand hover:bg-primary/10"
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
