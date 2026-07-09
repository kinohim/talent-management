import { Tile } from "@/components/ui/Tile";

type MyPageTileDef = {
  key: string;
  label: string;
  href?: string;
};

// REF004の8項目。基本情報(EDT001)・経歴概要・自己PR(EDT002)は実装済みでリンク可。
// 残り6項目はEDT003〜005・REF006・REF003・REF005が未実装のため、
// REF001の「準備中」タイルと同じ扱い(href省略=クリック不可)とする。
const TILE_DEFS: MyPageTileDef[] = [
  { key: "basic-info", label: "基本情報", href: "/register" },
  { key: "summary", label: "経歴概要・自己PR", href: "/career-summary" },
  { key: "skills", label: "スキル" },
  { key: "certifications", label: "資格" },
  { key: "projects", label: "プロジェクト経歴" },
  { key: "preview", label: "プレビュー" },
  { key: "pdf", label: "PDF出力" },
  { key: "excel", label: "Excel出力" },
];

export function MyPageTiles() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {TILE_DEFS.map((tile) => (
        <Tile key={tile.key} label={tile.label} href={tile.href} />
      ))}
    </div>
  );
}
