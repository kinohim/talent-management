import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { UserRole } from "@/generated/prisma/client";
import { NotRegisteredError, RetiredEmployeeError } from "@/lib/auth-errors";
import { findDevLoginUser } from "@/lib/dev-login";
import { isDevLoginEnabled, isProduction } from "@/lib/env";
import { prisma } from "@/lib/prisma";

// 実SSO実装時のTODO(docs/schema.md「ログイン判定ロジック」・docs/screens.md AUTH001参照):
// - Azure AD(Microsoft Entra ID)/Google/GitHubプロバイダを追加する
// - signInコールバックでメール照合・未登録/退職済み/プロバイダ不一致エラーを判定する
//   (未登録は既存Userなし、プロバイダ不一致は紐付き済みAccount.providerとの比較で判定する。
//   external_id/auth_providerカラムは廃止したためAccountテーブルを参照すること)
//
// 下記のCredentialsプロバイダは本番では無効化される開発専用のダミーログイン。
// 社員ID(users.employee_id)を入力するとログインでき、実SSOの画面確認導線を
// 塞がないようにするための一時的な仕組み。
//
// Credentialsプロバイダはjwtセッション戦略でしか動作しない(Auth.jsの制約)ため、
// 開発環境のみjwt、本番環境はdatabaseとセッション戦略を分けている
// (docs/decisions.md「認証」参照)。
const devEmployeeIdLogin = Credentials({
  id: "dev-employee-id",
  name: "開発用ログイン(社員IDでログイン)",
  credentials: {
    employeeId: { label: "社員ID", type: "text" },
  },
  async authorize(credentials) {
    const result = await findDevLoginUser(credentials?.employeeId);
    if (result.ok) return result.user;

    if (result.reason === "RETIRED") throw new RetiredEmployeeError();
    // EMPTY_EMPLOYEE_ID/NOT_REGISTEREDはどちらも「未登録」文言に丸める
    // (社員ID空欄は開発用ログイン固有のUXで、仕様上の文言に対応がないため)
    throw new NotRegisteredError();
  },
});

// 実SSO実装までの一時措置: ENABLE_DEV_LOGIN=trueの環境では本番相当でも
// 開発用ログインを有効化する(docs/decisions.md「認証」参照)。
const useDevLogin = !isProduction || isDevLoginEnabled;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: useDevLogin ? "jwt" : "database" },
  providers: useDevLogin ? [devEmployeeIdLogin] : [],
  // Auth.js標準の英語signin画面(/api/auth/signin)を自前の日本語画面(AUTH001)に
  // 差し替える(docs/README.md「ライブラリのデフォルト画面は自前の日本語画面に
  // 差し替える」参照)。
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.employeeId = user.employeeId;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token, user }) {
      const employeeId = token?.employeeId ?? user?.employeeId;
      const role = token?.role ?? user?.role;
      if (employeeId && role) {
        session.user.employeeId = employeeId;
        session.user.role = role;
      }
      return session;
    },
  },
  events: {
    // ログイン成功のたびにusers.last_login_atを更新する(REF007「最終ログイン」列)。
    // 人事・営業(HR_SALES)は経歴書を作成しないため、EDT001を経ずisRegisteredを
    // 自動でTRUEにする(docs/screens.md AUTH001参照)。employee.nameへのSSO表示名
    // 設定は、開発用ログインには対応する情報源がないため実SSO実装時に対応する。
    async signIn({ user }) {
      const employeeId = (user as { employeeId?: string }).employeeId;
      const role = (user as { role?: UserRole }).role;
      if (!employeeId) return;

      await prisma.user.update({
        where: { employeeId },
        data: {
          lastLoginAt: new Date(),
          updatedBy: employeeId,
          updatedProgram: "AUTH001",
        },
      });

      if (role === UserRole.HR_SALES) {
        await prisma.employee.updateMany({
          where: { employeeId, isRegistered: false },
          data: {
            isRegistered: true,
            updatedBy: employeeId,
            updatedProgram: "AUTH001",
          },
        });
      }
    },
  },
});
