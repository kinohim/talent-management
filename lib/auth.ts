import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { findDevLoginUser } from "@/lib/dev-login";
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
    return findDevLoginUser(credentials?.employeeId);
  },
});

const isProduction = process.env.NODE_ENV === "production";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: isProduction ? "database" : "jwt" },
  providers: isProduction ? [] : [devEmployeeIdLogin],
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
});
