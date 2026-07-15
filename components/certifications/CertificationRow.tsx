"use client";

import { ClearableInput } from "@/components/ui/ClearableInput";
import { DateField } from "@/components/ui/DateField";
import type { CertificationOptions } from "@/lib/certification-options";
import type { CertificationRowFieldErrors } from "@/lib/certification-schema";

export type CertificationRowValue = {
  certificationCategoryId: string;
  certificationId: string;
  certificationNameInput: string;
  acquiredDate: string;
  expirationDate: string;
};

type CertificationRowProps = {
  index: number;
  row: CertificationRowValue;
  options: CertificationOptions;
  fieldErrors?: CertificationRowFieldErrors;
  onChange: (patch: Partial<CertificationRowValue>) => void;
  onRemove: () => void;
};

// 新規追加用の1行コンパクトフォーム(EDT004)。カテゴリ/資格名/取得年月日/
// 有効期限/削除を1行に収める(登録済み分はCertificationRowsFormがタグ表示する)。
// 認定団体は資格名を選ぶと下に小さく表示する。
export function CertificationRow({
  index,
  row,
  options,
  fieldErrors,
  onChange,
  onRemove,
}: CertificationRowProps) {
  const categoryCertifications = options.certifications.filter(
    (c) => String(c.certificationCategoryId) === row.certificationCategoryId,
  );
  const selectedCertification = options.certifications.find(
    (c) => String(c.id) === row.certificationId,
  );
  const datalistId = `certification-name-options-${index}`;
  const namePrefix = `items.${index}`;

  function handleCertificationNameInput(text: string) {
    const matched = categoryCertifications.find(
      (c) => c.certificationName === text,
    );
    onChange({
      certificationNameInput: text,
      certificationId: matched ? String(matched.id) : "",
    });
  }

  const errors = [
    fieldErrors?.certificationCategoryId,
    fieldErrors?.certificationId,
    fieldErrors?.acquiredDate,
    fieldErrors?.expirationDate,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-1 rounded border p-2">
      <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_1.3fr_1fr_1fr_auto]">
        <select
          aria-label="カテゴリ"
          value={row.certificationCategoryId}
          onChange={(e) =>
            onChange({
              certificationCategoryId: e.target.value,
              certificationId: "",
              certificationNameInput: "",
            })
          }
          className="rounded border px-2 py-2 text-sm"
        >
          <option value="">カテゴリ *</option>
          {options.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.certificationCategoryName}
            </option>
          ))}
        </select>
        {/* Reactのフォームaction機能はaction完了後に非制御フィールドを自動
            リセットするが、controlled <select> の復元がその対象外になる
            ケースがあるため、送信値は非表示inputで別途保持する。 */}
        <input
          type="hidden"
          name={`${namePrefix}.certificationCategoryId`}
          value={row.certificationCategoryId}
        />

        <span className="inline-flex">
          <ClearableInput
            list={datalistId}
            aria-label="資格名"
            value={row.certificationNameInput}
            onChange={(e) => handleCertificationNameInput(e.target.value)}
            disabled={!row.certificationCategoryId}
            placeholder="資格名を選択 *"
            className="px-2 py-2 text-sm disabled:opacity-50"
          />
          <datalist id={datalistId}>
            {categoryCertifications.map((c) => (
              <option key={c.id} value={c.certificationName} />
            ))}
          </datalist>
        </span>
        <input
          type="hidden"
          name={`${namePrefix}.certificationId`}
          value={row.certificationId}
        />

        <DateField
          aria-label="取得年月日"
          title="取得年月日"
          name={`${namePrefix}.acquiredDate`}
          value={row.acquiredDate}
          onChange={(e) => onChange({ acquiredDate: e.target.value })}
          className="px-2 text-sm"
        />

        <DateField
          aria-label="有効期限"
          title="有効期限"
          name={`${namePrefix}.expirationDate`}
          value={row.expirationDate}
          onChange={(e) => onChange({ expirationDate: e.target.value })}
          className="px-2 text-sm"
        />

        <button
          type="button"
          onClick={onRemove}
          aria-label="この行を削除"
          className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-zinc-50 dark:hover:bg-zinc-800"
        >
          削除
        </button>
      </div>
      <p className="text-xs text-zinc-500">
        日付は左が取得年月日(必須)・右が有効期限(任意)
        {selectedCertification
          ? ` ／ 認定団体: ${selectedCertification.certificationOrganization}`
          : ""}
      </p>
      {errors.map((message, i) => (
        <p key={i} className="text-sm text-red-600">
          {message}
        </p>
      ))}
    </div>
  );
}
