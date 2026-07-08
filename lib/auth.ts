import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { findDevLoginUser } from "@/lib/dev-login";

// 実SSO実装時のTODO(docs/schema.md「ログイン判定ロジック」・docs/screens.md AUTH001参照):
// - Azure AD(Microsoft Entra ID)/Google/GitHubプロバイダを追加する
// - signInコールバックでメール照合・未登録/退職済み/プロバイダ不一致エラーを判定する
// - 初回ログイン時にuser_account.external_id/auth_providerを確定する
//
// 下記のCredentialsプロバイダは本番では無効化される開発専用のダミーログイン。
// 社員ID(user_account.employeeId)を入力するとログインでき、実SSOの画面確認導線を
// 塞がないようにするための一時的な仕組み。
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

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  providers: process.env.NODE_ENV === "production" ? [] : [devEmployeeIdLogin],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.employeeId = user.employeeId;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.employeeId && token.role) {
        session.user.employeeId = token.employeeId;
        session.user.role = token.role;
      }
      return session;
    },
  },
});
