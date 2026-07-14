import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";

import { UserRole } from "@/generated/prisma/client";
import { NotRegisteredError, RetiredEmployeeError } from "@/lib/auth-errors";
import { findDevLoginUser } from "@/lib/dev-login";
import { isDevLoginEnabled, isGitHubSsoEnabled, isProduction } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { pickVerifiedPrimaryEmail, resolveSsoLogin } from "@/lib/sso-login";

// 実SSOはGitHubのみ実装済み。Azure AD(Microsoft Entra ID)/Googleプロバイダの
// 追加が残TODO(docs/schema.md「ログイン判定ロジック」・docs/screens.md AUTH001参照)。
// 追加時はGitHubと同様に、確認済みメールだけをsignInコールバックの照合に渡すこと。

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

// 実運用開始までの一時措置: ENABLE_DEV_LOGIN=trueの環境では本番相当でも
// 開発用ログインを有効化する(docs/decisions.md「認証」参照)。
const useDevLogin = !isProduction || isDevLoginEnabled;

const gitHubLogin = GitHub({
  // 事前登録済みユーザー(EDT006でemail登録済み)の初回SSOログイン時に、
  // accountsへのプロバイダ紐付けを自動で作成させる。"Dangerous"なのは未検証
  // メールでの紐付けを許す場合であり、ここでは (a)下記userinfoでverifiedメール
  // のみ採用 (b)signInコールバックのresolveSsoLoginで事前登録照合・プロバイダ
  // 不一致チェックを先に実施するため安全。signInコールバックの照合を外すと
  // 危険になるため、必ずセットで維持すること。
  allowDangerousEmailAccountLinking: true,
  // 標準のGitHubプロバイダは/user/emailsのverifiedフラグを確認せずprimaryを
  // 無条件に採用するため、userinfoを差し替えて「確認済み(verified)かつ
  // プライマリ」のメールだけを使う(docs/screens.md AUTH001「確認済みメール
  // アドレス」)。該当がなければemailはnullになり、signInコールバックで
  // 未登録エラーに落ちる。userinfoは部分マージではなく全体置換のためurlも併記。
  userinfo: {
    url: "https://api.github.com/user",
    async request({ tokens }: { tokens: { access_token?: string } }) {
      const headers = {
        Authorization: `Bearer ${tokens.access_token}`,
        "User-Agent": "authjs",
      };
      const profile = await fetch("https://api.github.com/user", { headers }).then(
        (res) => res.json(),
      );
      const emailsResponse = await fetch("https://api.github.com/user/emails", {
        headers,
      });
      profile.email = emailsResponse.ok
        ? pickVerifiedPrimaryEmail(await emailsResponse.json())
        : null;
      return profile;
    },
  },
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Credentialsプロバイダ(開発用ログイン)がjwt戦略でしか動作しないための切替。
  // OAuth(GitHub)はどちらの戦略でも動作し、jwt戦略でもadapter経由の
  // ユーザー/アカウント永続化は行われる。
  session: { strategy: useDevLogin ? "jwt" : "database" },
  providers: [
    ...(isGitHubSsoEnabled ? [gitHubLogin] : []),
    ...(useDevLogin ? [devEmployeeIdLogin] : []),
  ],
  // Auth.js標準の英語signin画面(/api/auth/signin)を自前の日本語画面(AUTH001)に
  // 差し替える(docs/README.md「ライブラリのデフォルト画面は自前の日本語画面に
  // 差し替える」参照)。
  pages: { signIn: "/login" },
  callbacks: {
    // SSOログインの事前登録照合(docs/screens.md AUTH001)。このコールバックは
    // PrismaAdapterのcreateUser/linkAccountより前に実行されるため、ここで
    // ブロックすればemployeeId必須のUserが自動作成されることはない。
    // OAuthフローではthrowしたエラーを画面に返せないため、エラー時は
    // `/login?error=<code>` への文字列を返してリダイレクトさせる
    // (Auth.js v5はsignInコールバックの文字列返却をredirect先として扱う)。
    async signIn({ account, profile }) {
      // 開発用ログインはauthorize()で検証済み
      if (account?.provider === "dev-employee-id") {
        return true;
      }
      if (account?.type !== "oauth" && account?.type !== "oidc") {
        return false;
      }

      const result = await resolveSsoLogin({
        email: profile?.email,
        provider: account.provider,
      });
      if (result.ok) {
        return true;
      }
      return `/login?error=${result.errorCode}`;
    },
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
    // 自動でTRUEにする(docs/screens.md AUTH001参照)。
    async signIn({ user, account, profile }) {
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

        // 人事・営業はEDT001(基本情報登録)を通らないためemployee.nameが未設定の
        // まま残る。SSOログイン時のみプロバイダの表示名で補完する(設定済みの
        // 名前は上書きしない。開発用ログインには対応する情報源がないため対象外)。
        const ssoName =
          account && account.provider !== "dev-employee-id"
            ? (profile?.name ?? user.name ?? null)
            : null;
        if (ssoName) {
          await prisma.employee.updateMany({
            where: { employeeId, name: null },
            data: {
              name: ssoName,
              updatedBy: employeeId,
              updatedProgram: "AUTH001",
            },
          });
        }
      }
    },
  },
});
