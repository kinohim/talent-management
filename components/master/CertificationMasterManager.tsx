"use client";

import { useActionState, useState } from "react";

import {
  createCertificationCategory,
  saveCertification,
} from "@/app/(authenticated)/master/certifications/actions";
import type { CategoryOption } from "@/components/master/CategorySelectField";
import {
  CertificationMasterRow,
  type CertificationMasterCertification,
} from "@/components/master/CertificationMasterRow";
import { InlineAddForm } from "@/components/master/InlineAddForm";
import { ClearableInput } from "@/components/ui/ClearableInput";
import type { CertificationMasterFormState } from "@/lib/certification-master-schema";

type CertificationMasterManagerProps = {
  categories: CategoryOption[];
  certifications: (CertificationMasterCertification & { categoryName: string })[];
};

const initialState: CertificationMasterFormState = { error: null };
const createCertificationAction = saveCertification.bind(null, null);

// カテゴリ確定済みの資格追加フォーム(カテゴリ見出しの[+ 追加]から展開)。
// categoryIdはhiddenで送るため、既存のsaveCertification(existingカテゴリ
// モード)をそのまま利用できる。
function CategoryCertificationAddForm({
  categoryId,
  onClose,
}: {
  categoryId: number;
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    createCertificationAction,
    initialState,
  );
  const [prevState, setPrevState] = useState(state);
  if (prevState !== state) {
    setPrevState(state);
    if (!state.error) onClose();
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-2 rounded-2xl border border-dashed border-surface-border p-3"
    >
      <input type="hidden" name="categoryId" value={categoryId} />
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          name="certificationName"
          placeholder="資格名"
          maxLength={100}
          autoFocus
          className="w-64 rounded-full border border-surface-border px-3 py-1 text-sm"
        />
        <input
          type="text"
          name="certificationOrganization"
          placeholder="認定団体"
          maxLength={100}
          className="w-48 rounded-full border border-surface-border px-3 py-1 text-sm"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full border border-primary px-3 py-1 text-xs text-brand hover:bg-primary/10"
        >
          {isPending ? "追加中..." : "追加"}
        </button>
        <button type="button" onClick={onClose} className="text-xs text-foreground/60">
          キャンセル
        </button>
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

function CertificationCategorySection({
  category,
  certifications,
  categories,
  forceExpanded = false,
}: {
  category: CategoryOption;
  certifications: (CertificationMasterCertification & { categoryName: string })[];
  categories: CategoryOption[];
  // 絞り込み中はヒットした資格を確認できるよう常に展開する
  forceExpanded?: boolean;
}) {
  const [manuallyExpanded, setManuallyExpanded] = useState(false);
  const expanded = forceExpanded || manuallyExpanded;
  const setExpanded = setManuallyExpanded;
  const [showAddForm, setShowAddForm] = useState(false);

  const sortedCertifications = certifications
    .slice()
    .sort((a, b) => a.certificationName.localeCompare(b.certificationName, "ja"));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-surface-border bg-background px-3 py-2">
        <div className="flex items-center gap-2">
          {sortedCertifications.length > 0 ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              aria-label={expanded ? "カテゴリを閉じる" : "カテゴリを開く"}
              className="w-5 text-center text-xs text-brand/70 hover:text-brand"
            >
              {expanded ? "▼" : "▶"}
            </button>
          ) : (
            <span aria-hidden="true" className="w-5" />
          )}
          <h3 className="text-sm font-semibold text-brand">
            {category.name}
            <span className="ml-2 text-xs font-normal text-foreground/50">
              {sortedCertifications.length}件
            </span>
          </h3>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowAddForm(true);
            setExpanded(true);
          }}
          className="rounded-full border border-primary px-3 py-1 text-xs text-brand hover:bg-primary/10"
        >
          + 追加
        </button>
      </div>

      {showAddForm ? (
        <div className="pl-7">
          <CategoryCertificationAddForm
            categoryId={category.id}
            onClose={() => setShowAddForm(false)}
          />
        </div>
      ) : null}

      {expanded && sortedCertifications.length > 0 ? (
        <div className="flex flex-col gap-2 pl-7">
          {sortedCertifications.map((certification) => (
            <CertificationMasterRow
              key={certification.id}
              certification={certification}
              categories={categories}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function CertificationMasterManager({
  categories,
  certifications,
}: CertificationMasterManagerProps) {
  // 資格名のあいまい絞り込み(クライアント側の部分一致・大文字小文字無視)。
  // 絞り込み中はヒットしないカテゴリを非表示にし、ヒットしたカテゴリは展開する
  const [filter, setFilter] = useState("");
  const normalizedFilter = filter.trim().toLowerCase();
  const filteredCertifications = normalizedFilter
    ? certifications.filter((certification) =>
        certification.certificationName.toLowerCase().includes(normalizedFilter),
      )
    : certifications;

  const sortedCategories = categories
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "ja"))
    .filter(
      (category) =>
        normalizedFilter === "" ||
        filteredCertifications.some(
          (certification) => certification.categoryId === category.id,
        ),
    );

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      {/* カテゴリの追加フィールドは最上部に常時表示。資格自体の追加は
          各カテゴリ見出しの[+ 追加]から行う */}
      <InlineAddForm
        action={createCertificationCategory}
        name="categoryName"
        placeholder="カテゴリ名"
        submitLabel="カテゴリを追加"
      />

      <div className="flex max-w-sm flex-col gap-1">
        <label className="text-sm font-medium">絞り込み</label>
        <ClearableInput
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="資格名で絞り込み"
          className="text-sm"
        />
      </div>

      <div className="flex flex-col gap-3">
        {sortedCategories.length === 0 ? (
          <p className="text-sm text-foreground/60">
            {normalizedFilter
              ? "絞り込みに一致する資格はありません。"
              : "登録済みのカテゴリはありません。"}
          </p>
        ) : (
          sortedCategories.map((category) => (
            <CertificationCategorySection
              key={category.id}
              category={category}
              certifications={filteredCertifications.filter(
                (certification) => certification.categoryId === category.id,
              )}
              categories={categories}
              forceExpanded={normalizedFilter !== ""}
            />
          ))
        )}
      </div>
    </div>
  );
}
