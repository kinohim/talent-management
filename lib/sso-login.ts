import { prisma } from "@/lib/prisma";

export type SsoLoginErrorCode = "not-registered" | "retired" | "provider-mismatch";

export type SsoLoginResult = { ok: true } | { ok: false; errorCode: SsoLoginErrorCode };

// GitHubの/user/emailsレスポンスのうち照合に使う項目
type GitHubEmailEntry = { email: string; primary: boolean; verified: boolean };

// GitHubの/user/emailsレスポンスから「確認済み(verified)かつプライマリ」の
// メールだけを採用する。未検証メールを事前登録照合に使うと他人のメールを
// 登録したGitHubアカウントでなりすましログインできてしまうため、verifiedは
// 必須(docs/screens.md AUTH001「確認済みメールアドレス」)。
export function pickVerifiedPrimaryEmail(emails: unknown): string | null {
  if (!Array.isArray(emails)) {
    return null;
  }
  const entry = (emails as GitHubEmailEntry[]).find((e) => e.primary && e.verified);
  return entry?.email ?? null;
}

// SSOログインの事前登録照合(docs/screens.md AUTH001、docs/decisions.md「認証」)。
// 管理職がEDT006で登録したusers.emailとSSOの確認済みメールを照合し、
// 未登録・退職済み・プロバイダ不一致(初回プロバイダ固定)を判定する。
// lib/auth.tsのsignInコールバックから呼ばれ、ok: false時はPrismaAdapterの
// createUser/linkAccountに到達させない。
export async function resolveSsoLogin(params: {
  email: string | null | undefined;
  provider: string;
}): Promise<SsoLoginResult> {
  // 確認済みメールが取得できなかった場合(GitHubでverifiedメールなし等)は
  // 照合しようがないため「未登録」に丸める
  const email = params.email?.toLowerCase();
  if (!email) {
    return { ok: false, errorCode: "not-registered" };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { employee: true, accounts: true },
  });

  if (!user) {
    return { ok: false, errorCode: "not-registered" };
  }

  if (user.employee.employmentStatus === "RETIRED") {
    return { ok: false, errorCode: "retired" };
  }

  // 初回プロバイダ固定: 紐付き済みaccountsがあり今回のプロバイダと1つも
  // 一致しなければ不一致エラー。accountsが空なら初回ログインとして許可
  // (この後allowDangerousEmailAccountLinkingにより自動で紐付けされる)
  const hasAccounts = user.accounts.length > 0;
  const matchesProvider = user.accounts.some((a) => a.provider === params.provider);
  if (hasAccounts && !matchesProvider) {
    return { ok: false, errorCode: "provider-mismatch" };
  }

  return { ok: true };
}
