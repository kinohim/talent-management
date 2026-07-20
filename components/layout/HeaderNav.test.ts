import { describe, expect, it } from "vitest";

import { UserRole } from "@/generated/prisma/client";
import { MASTER_NAV_ITEMS } from "@/lib/master-nav-items";

import { getHeaderNavLinks } from "./HeaderNav";

describe("getHeaderNavLinks", () => {
  it("一般社員には私の経歴書・経歴書一覧・ダッシュボードのみ表示する", () => {
    const keys = getHeaderNavLinks(UserRole.EMPLOYEE).map((link) => link.key);
    expect(keys).toEqual(["mypage", "resume-list", "skill-map"]);
  });

  it("人事・営業には私の経歴書を表示せず、経歴書一覧・ダッシュボードは表示する", () => {
    const keys = getHeaderNavLinks(UserRole.HR_SALES).map((link) => link.key);
    expect(keys).toEqual(["resume-list", "skill-map"]);
  });

  it("管理職には全リンクを表示する", () => {
    const keys = getHeaderNavLinks(UserRole.MANAGER).map((link) => link.key);
    expect(keys).toEqual([
      "mypage",
      "resume-list",
      "skill-map",
      "master",
      "account-list",
    ]);
  });

  it("マスタ管理にはマスタ管理トップと同じ5画面へのドロップダウン項目を持つ", () => {
    const masterLink = getHeaderNavLinks(UserRole.MANAGER).find(
      (link) => link.key === "master",
    );
    expect(masterLink?.children).toEqual(MASTER_NAV_ITEMS);
  });
});
