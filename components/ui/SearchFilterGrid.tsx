import type { FormEvent, ReactNode } from "react";

type SearchFilterGridProps = {
  onSubmit: (e: FormEvent) => void;
  onClear: () => void;
  children: ReactNode;
};

// resume-list/account-list共通の検索条件エリア。項目は常に4列グリッドに
// 並べ(狭幅では2列/1列に縮退)、各項目を同じ幅のセルに配置する。項目数が
// 4の倍数でなくてもCSS Gridの自動配置が次の項目をそのまま前詰めするため、
// 列がずれたり余白だけの列ができたりしない。検索/クリアボタンはグリッドの
// 直下・左寄せで固定し、画面によって位置がずれないようにする。
export function SearchFilterGrid({
  onSubmit,
  onClear,
  children,
}: SearchFilterGridProps) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 items-start gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
        {children}
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary-dark"
        >
          検索
        </button>
        <button
          type="button"
          onClick={onClear}
          className="rounded-full border border-primary px-4 py-2 text-sm text-brand hover:bg-primary/10"
        >
          クリア
        </button>
      </div>
    </form>
  );
}

type SearchFilterFieldProps = {
  // 省略時は見えないラベル分の高さだけを確保する(チェックボックス単体の
  // 項目などでも、他の項目とコントロールの開始位置を揃えるため)
  label?: string;
  children: ReactNode;
};

// グリッド内の1項目。ラベル→入力欄の縦積みで高さの起点を統一する。
// スキル条件・資格条件・携わったプロジェクトのように項目側で既に見出しを
// 描画しているものは、本コンポーネントを介さず直接グリッドの子要素にする。
export function SearchFilterField({ label, children }: SearchFilterFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium" aria-hidden={label ? undefined : true}>
        {label ?? " "}
      </span>
      {children}
    </div>
  );
}
