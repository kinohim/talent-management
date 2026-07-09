import { UserRole } from "@/generated/prisma/client";

import { Tile } from "./Tile";

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
    // 本来の遷移先はREF004(マイページ)だが今回のスコープでは未実装のため、
    // 一時的にEDT001(基本情報登録)へ直接遷移する。REF004実装時に差し替える。
    href: "/register",
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
