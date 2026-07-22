import { SectionHeading } from "@/components/ui/SectionHeading";
import { Tile } from "@/components/ui/Tile";
import {
  ChartIcon,
  DocumentIcon,
  GearIcon,
  ListIcon,
  MapPinIcon,
  UsersIcon,
} from "@/components/ui/icons";
import { UserRole } from "@/generated/prisma/client";

type TileDef = {
  key: string;
  label: string;
  href?: string;
  roles: UserRole[];
  icon: React.ReactNode;
};

// 一般メニュー(経歴書の閲覧・作成系)。ロールで表示制御
const GENERAL_TILE_DEFS: TileDef[] = [
  {
    key: "mypage",
    label: "私の経歴書",
    href: "/mypage",
    roles: [UserRole.EMPLOYEE, UserRole.MANAGER],
    icon: <DocumentIcon />,
  },
  {
    key: "resume-list",
    label: "経歴書一覧",
    href: "/resumes",
    roles: [UserRole.EMPLOYEE, UserRole.HR_SALES, UserRole.MANAGER],
    icon: <ListIcon />,
  },
  {
    key: "skill-map",
    label: "スキルマップ/組織ダッシュボード",
    href: "/skill-map",
    roles: [UserRole.EMPLOYEE, UserRole.HR_SALES, UserRole.MANAGER],
    icon: <ChartIcon />,
  },
];

// 管理者メニュー(アカウント・マスタ管理系)。管理職のみ
const ADMIN_TILE_DEFS: TileDef[] = [
  {
    key: "master",
    label: "マスタ管理",
    href: "/master",
    roles: [UserRole.MANAGER],
    icon: <GearIcon />,
  },
  {
    key: "account-list",
    label: "アカウント一覧",
    href: "/accounts",
    roles: [UserRole.MANAGER],
    icon: <UsersIcon />,
  },
  {
    key: "site-search",
    label: "現場/社員最寄駅マップ",
    href: "/site-search",
    roles: [UserRole.MANAGER],
    icon: <MapPinIcon />,
  },
];

// 一般メニューと管理者メニューを視覚的に分ける(管理者メニューは見出し付きの
// 枠+淡い背景のグループにまとめる)。
export function HomeTiles({ role }: { role: UserRole }) {
  const generalTiles = GENERAL_TILE_DEFS.filter((tile) => tile.roles.includes(role));
  const adminTiles = ADMIN_TILE_DEFS.filter((tile) => tile.roles.includes(role));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {generalTiles.map((tile) => (
          <Tile key={tile.key} label={tile.label} href={tile.href} icon={tile.icon} />
        ))}
      </div>

      {adminTiles.length > 0 ? (
        <section className="flex flex-col gap-4 rounded-2xl border border-surface-border bg-background p-5">
          <SectionHeading eyebrow="ADMIN" title="管理者メニュー(管理職のみ)" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {adminTiles.map((tile) => (
              <Tile key={tile.key} label={tile.label} href={tile.href} icon={tile.icon} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
