import { redirect } from "next/navigation";

import { Tile } from "@/components/ui/Tile";
import { UserRole } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";

const MASTER_TILES = [
  { key: "organization-units", label: "部署マスタ管理", href: "/master/organization-units" },
  { key: "skills", label: "スキルマスタ管理", href: "/master/skills" },
  { key: "certifications", label: "資格マスタ管理", href: "/master/certifications" },
  { key: "project-roles", label: "現場ポジションマスタ管理" },
  { key: "sites", label: "現場マスタ管理" },
];

export default async function MasterPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== UserRole.MANAGER) {
    // マスタ管理は管理職専用(REF001参照)
    redirect("/");
  }

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <h1 className="text-lg font-semibold">マスタ管理</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {MASTER_TILES.map((tile) => (
          <Tile key={tile.key} label={tile.label} href={tile.href} />
        ))}
      </div>
    </main>
  );
}
