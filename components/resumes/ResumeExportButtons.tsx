import { Tile } from "@/components/ui/Tile";

// PDF出力(REF005)・Excel出力機能とも未実装のため、REF001/REF004の他タイルと
// 同じ「準備中」表示にする(hrefを渡さない)。
export function ResumeExportButtons() {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-base font-semibold">出力</h2>
      <div className="grid grid-cols-2 gap-4 sm:max-w-md">
        <Tile label="PDF出力" />
        <Tile label="Excel出力" />
      </div>
    </section>
  );
}
