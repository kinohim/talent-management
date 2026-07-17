// PDF出力プレビューの画面名と注意書き(見出しの右に表示)。印刷には出さない。
// 2つのpage(resumes配下/mypage配下)で共通。
export function PdfPreviewHeading() {
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 print:hidden">
      <h1 className="text-lg font-semibold">PDF出力プレビュー</h1>
      <p className="text-xs text-zinc-500">
        マスクした項目（グレー表示）は出力されず、レイアウトは出力時に詰め直されます。
        ダウンロード押下後の印刷ダイアログのプレビューで確認し、送信先「PDFに保存」で保存してください。
      </p>
    </div>
  );
}
