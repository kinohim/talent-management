import { redirect } from "next/navigation";

import { PdfPreviewClient } from "@/components/pdf-preview/PdfPreviewClient";
import { PdfPreviewHeading } from "@/components/pdf-preview/PdfPreviewHeading";
import { auth } from "@/lib/auth";
import { resolveDestination } from "@/lib/auth-routing";
import { initialsFromKana } from "@/lib/print-name";
import { defaultPdfPreviewSettings } from "@/lib/pdf-preview-settings";
import { buildPdfResumeData, getResumeForView } from "@/lib/resume-view-data";

type PdfPreviewPageProps = {
  params: Promise<{ employeeId: string }>;
};

// 経歴書一覧の「PDF」・resume-detailの「PDF出力」発のPDF出力プレビュー。
// PDF出力(ダウンロード)の権限は本人・人事・営業・管理職のみ
// (docs/screens.md pdf-preview)。一般社員は閲覧範囲内の他人でも本画面は
// 開けない(閲覧はresume-detailで行う)。未登録社員はトップへ戻す。
export default async function ResumePdfPreviewPage({
  params,
}: PdfPreviewPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const destination = await resolveDestination(session.user);
  if (destination !== "/") {
    redirect(destination);
  }

  const { employeeId } = await params;

  const isSelf = employeeId === session.user.employeeId;
  const allowed =
    isSelf || session.user.role === "HR_SALES" || session.user.role === "MANAGER";
  if (!allowed) {
    redirect("/");
  }

  const target = await getResumeForView(employeeId);
  if (!target || !target.isRegistered) {
    redirect("/");
  }

  const initials = initialsFromKana(target.nameKana);

  return (
    <main className="flex flex-1 flex-col gap-6 p-6 print:p-0">
      <PdfPreviewHeading />
      {/* 社員をまたいだ遷移でコンポーネントが再利用されても、手修正した
          氏名(ローカルstate)が前の社員のまま残らないようkeyで再マウントする */}
      <PdfPreviewClient
        key={employeeId}
        data={buildPdfResumeData(target)}
        initials={initials}
        defaultSettings={defaultPdfPreviewSettings({
          viewerRole: session.user.role,
          isSelf,
          hasInitials: initials != null,
        })}
      />
    </main>
  );
}
