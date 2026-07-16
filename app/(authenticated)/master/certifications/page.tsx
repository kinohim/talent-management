import { redirect } from "next/navigation";

import { CertificationMasterManager } from "@/components/master/CertificationMasterManager";
import { UserRole } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function CertificationMasterPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== UserRole.MANAGER) {
    // マスタ管理は管理職専用(home参照)
    redirect("/");
  }

  const [categories, certifications] = await Promise.all([
    prisma.certificationCategory.findMany({
      where: { deletedAt: null },
      select: { id: true, certificationCategoryName: true },
      orderBy: { certificationCategoryName: "asc" },
    }),
    prisma.certification.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        certificationName: true,
        certificationOrganization: true,
        certificationCategoryId: true,
        certificationCategory: { select: { certificationCategoryName: true } },
      },
      orderBy: { certificationName: "asc" },
    }),
  ]);

  const categoryOptions = categories.map((c) => ({
    id: c.id,
    name: c.certificationCategoryName,
  }));
  const certificationRows = certifications.map((c) => ({
    id: c.id,
    certificationName: c.certificationName,
    certificationOrganization: c.certificationOrganization,
    categoryId: c.certificationCategoryId,
    categoryName: c.certificationCategory.certificationCategoryName,
  }));

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <h1 className="text-lg font-semibold">資格マスタ管理</h1>
      <CertificationMasterManager categories={categoryOptions} certifications={certificationRows} />
    </main>
  );
}
