import { redirect } from "next/navigation";

import { PdfPreviewClient } from "@/components/pdf-preview/PdfPreviewClient";
import { PdfPreviewHeading } from "@/components/pdf-preview/PdfPreviewHeading";
import { UserRole } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { resolveDestination } from "@/lib/auth-routing";
import { initialsFromKana } from "@/lib/print-name";
import { defaultPdfPreviewSettings } from "@/lib/pdf-preview-settings";
import { buildPdfResumeData, getResumeForView } from "@/lib/resume-view-data";

// mypage発のPDF出力プレビュー(本人の経歴書のみ)。ガードはmypageと同じ
// (人事・営業は経歴書を持たないためトップへ、未登録はresolveDestinationが
// basic-infoへ戻す)。
export default async function MyPagePdfPreviewPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === UserRole.HR_SALES) {
    redirect("/");
  }

  const destination = await resolveDestination(session.user);
  if (destination !== "/") {
    redirect(destination);
  }

  const target = await getResumeForView(session.user.employeeId);
  if (!target || !target.isRegistered) {
    redirect("/");
  }

  const initials = initialsFromKana(target.nameKana);

  return (
    <main className="flex flex-1 flex-col gap-6 p-6 print:p-0">
      <PdfPreviewHeading />
      <PdfPreviewClient
        data={buildPdfResumeData(target)}
        initials={initials}
        defaultSettings={defaultPdfPreviewSettings({
          viewerRole: session.user.role,
          isSelf: true,
          hasInitials: initials != null,
        })}
      />
    </main>
  );
}
