import { Tile } from "@/components/ui/Tile";

// PDF出力(print-preview)は未実装のため、home/mypageの他タイルと
// 同じ「準備中」表示にする(hrefを渡さない)。Excel出力は提供しない(docs/README.md参照)。
export function ResumeExportButtons() {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-base font-semibold">出力</h2>
      <div className="grid grid-cols-2 gap-4 sm:max-w-md">
        <Tile label="PDF出力" />
      </div>
    </section>
  );
}
