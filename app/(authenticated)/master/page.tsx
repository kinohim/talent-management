import { redirect } from "next/navigation";

import { SectionHeading } from "@/components/ui/SectionHeading";
import { Tile } from "@/components/ui/Tile";
import {
  BadgeIcon,
  BuildingIcon,
  MapPinIcon,
  SparkleIcon,
  UsersIcon,
} from "@/components/ui/icons";
import { UserRole } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { resolveDestination } from "@/lib/auth-routing";
import { MASTER_NAV_ITEMS } from "@/lib/master-nav-items";

const MASTER_TILE_ICONS: Record<(typeof MASTER_NAV_ITEMS)[number]["key"], React.ReactNode> = {
  "organization-units": <BuildingIcon />,
  skills: <SparkleIcon />,
  certifications: <BadgeIcon />,
  "project-roles": <UsersIcon />,
  sites: <MapPinIcon />,
};

export default async function MasterPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  // 未登録の管理職はbasic-info(初回登録)へ誘導する(全認証必須ページ共通のガード)
  const destination = await resolveDestination(session.user);
  if (destination !== "/") {
    redirect(destination);
  }
  if (session.user.role !== UserRole.MANAGER) {
    // マスタ管理は管理職専用(home参照)
    redirect("/");
  }

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <SectionHeading as="h1" eyebrow="MASTER" title="マスタ管理" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {MASTER_NAV_ITEMS.map((tile) => (
          <Tile
            key={tile.key}
            label={tile.label}
            href={tile.href}
            icon={MASTER_TILE_ICONS[tile.key]}
          />
        ))}
      </div>
    </main>
  );
}
