"use client";

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

  return (
    <div className="flex flex-col gap-3 rounded border p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">
            カテゴリ <span className="text-red-600">*</span>
          </label>
          <select
            value={row.certificationCategoryId}
            onChange={(e) =>
              onChange({
                certificationCategoryId: e.target.value,
                certificationId: "",
                certificationNameInput: "",
              })
            }
            className="rounded border px-3 py-2"
          >
            <option value="">選択してください</option>
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
          {fieldErrors?.certificationCategoryId ? (
            <p className="text-sm text-red-600">
              {fieldErrors.certificationCategoryId}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">
            資格名 <span className="text-red-600">*</span>
          </label>
          <input
            list={datalistId}
            value={row.certificationNameInput}
            onChange={(e) => handleCertificationNameInput(e.target.value)}
            disabled={!row.certificationCategoryId}
            placeholder="資格名を選択"
            className="rounded border px-3 py-2 disabled:opacity-50"
          />
          <datalist id={datalistId}>
            {categoryCertifications.map((c) => (
              <option key={c.id} value={c.certificationName} />
            ))}
          </datalist>
          <input
            type="hidden"
            name={`${namePrefix}.certificationId`}
            value={row.certificationId}
          />
          {fieldErrors?.certificationId ? (
            <p className="text-sm text-red-600">{fieldErrors.certificationId}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">認定団体</span>
          <p className="rounded border bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {selectedCertification?.certificationOrganization ?? "-"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">
            取得年月日 <span className="text-red-600">*</span>
          </label>
          <input
            type="date"
            name={`${namePrefix}.acquiredDate`}
            value={row.acquiredDate}
            onChange={(e) => onChange({ acquiredDate: e.target.value })}
            className="rounded border px-3 py-2"
          />
          {fieldErrors?.acquiredDate ? (
            <p className="text-sm text-red-600">{fieldErrors.acquiredDate}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">有効期限</label>
          <input
            type="date"
            name={`${namePrefix}.expirationDate`}
            value={row.expirationDate}
            onChange={(e) => onChange({ expirationDate: e.target.value })}
            className="rounded border px-3 py-2"
          />
          {fieldErrors?.expirationDate ? (
            <p className="text-sm text-red-600">{fieldErrors.expirationDate}</p>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="self-start rounded border border-red-300 px-3 py-1 text-sm text-red-600"
      >
        削除
      </button>
    </div>
  );
}
