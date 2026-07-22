import Link from "next/link";

import { UserRole } from "@/generated/prisma/client";
import { MASTER_NAV_ITEMS } from "@/lib/master-nav-items";

type NavChildLinkDef = {
  key: string;
  label: string;
  href: string;
};

type NavLinkDef = {
  key: string;
  label: string;
  href: string;
  roles: UserRole[];
  children?: readonly NavChildLinkDef[];
};

const NAV_LINK_DEFS: NavLinkDef[] = [
  {
    key: "mypage",
    label: "私の経歴書",
    href: "/mypage",
    roles: [UserRole.EMPLOYEE, UserRole.MANAGER],
  },
  {
    key: "resume-list",
    label: "経歴書一覧",
    href: "/resumes",
    roles: [UserRole.EMPLOYEE, UserRole.HR_SALES, UserRole.MANAGER],
  },
  {
    key: "skill-map",
    label: "ダッシュボード",
    href: "/skill-map",
    roles: [UserRole.EMPLOYEE, UserRole.HR_SALES, UserRole.MANAGER],
  },
  {
    key: "master",
    label: "マスタ管理",
    href: "/master",
    roles: [UserRole.MANAGER],
    children: MASTER_NAV_ITEMS,
  },
  {
    key: "account-list",
    label: "アカウント一覧",
    href: "/accounts",
    roles: [UserRole.MANAGER],
  },
  {
    key: "site-search",
    label: "現場/参画者一覧",
    href: "/site-search",
    roles: [UserRole.MANAGER],
  },
];

export function getHeaderNavLinks(role: UserRole) {
  return NAV_LINK_DEFS.filter((link) => link.roles.includes(role));
}

export function HeaderNav({ role }: { role: UserRole }) {
  const links = getHeaderNavLinks(role);

  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm">
      {links.map((link) =>
        link.children ? (
          <div key={link.key} className="group relative">
            <Link
              href={link.href}
              className="rounded-full px-3 py-1.5 text-brand transition hover:bg-primary/10"
            >
              {link.label}
            </Link>
            <div className="absolute left-0 top-full z-50 hidden min-w-max flex-col gap-1 rounded-2xl border border-surface-border bg-surface p-2 shadow-md group-focus-within:flex group-hover:flex">
              {link.children.map((child) => (
                <Link
                  key={child.key}
                  href={child.href}
                  className="rounded-full px-3 py-1.5 text-foreground hover:bg-primary/10"
                >
                  {child.label}
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <Link
            key={link.key}
            href={link.href}
            className="rounded-full px-3 py-1.5 text-brand transition hover:bg-primary/10"
          >
            {link.label}
          </Link>
        ),
      )}
    </nav>
  );
}
