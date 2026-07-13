import { Tile } from "@/components/ui/Tile";
import { UserRole } from "@/generated/prisma/client";

type TileDef = {
  key: string;
  label: string;
  href?: string;
  roles: UserRole[];
};

const TILE_DEFS: TileDef[] = [
  {
    key: "mypage",
    label: "マイページ",
    href: "/mypage",
    roles: [UserRole.EMPLOYEE, UserRole.MANAGER],
  },
  {
    key: "resume-list",
    label: "経歴書一覧",
    roles: [UserRole.EMPLOYEE, UserRole.HR_SALES, UserRole.MANAGER],
  },
  {
    key: "account-list",
    label: "アカウント一覧",
    roles: [UserRole.MANAGER],
  },
  {
    key: "master",
    label: "マスタ管理",
    href: "/master",
    roles: [UserRole.MANAGER],
  },
  {
    key: "skill-map",
    label: "スキルマップ/組織ダッシュボード",
    roles: [UserRole.EMPLOYEE, UserRole.HR_SALES, UserRole.MANAGER],
  },
];

export function HomeTiles({ role }: { role: UserRole }) {
  const tiles = TILE_DEFS.filter((tile) => tile.roles.includes(role));

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {tiles.map((tile) => (
        <Tile key={tile.key} label={tile.label} href={tile.href} />
      ))}
    </div>
  );
}
