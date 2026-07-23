import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/LoginForm";
import { SsoLoginButtons } from "@/components/auth/SsoLoginButtons";
import { auth } from "@/lib/auth";
import { messageForLoginErrorCode } from "@/lib/auth-errors";
import { isDevLoginEnabled, isGitHubSsoEnabled, isProduction } from "@/lib/env";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

  // SSO(OAuth)フローのエラーはsignInコールバックから`/login?error=<code>`への
  // リダイレクトで伝わる(lib/auth.ts参照)ため、クエリから日本語文言に変換して表示する
  const { error } = await searchParams;
  const errorMessage = error ? messageForLoginErrorCode(error) : null;

  const useDevLogin = !isProduction || isDevLoginEnabled;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <div className="w-full max-w-[480px] rounded-2xl border border-surface-border bg-surface p-10 shadow-sm">
        <div className="mb-8 flex flex-col items-center gap-1.5 text-center">
          <span className="text-xs font-medium tracking-widest text-primary-dark">
            LOGIN
          </span>
          <h1 className="text-2xl font-semibold text-brand">ログイン</h1>
        </div>
        {errorMessage ? (
          <p role="alert" className="mb-4 rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-600">
            {errorMessage}
          </p>
        ) : null}
        <SsoLoginButtons gitHubEnabled={isGitHubSsoEnabled} />
        {useDevLogin ? (
          <section className="mt-6 flex flex-col gap-3 border-t border-surface-border pt-6">
            <h2 className="text-sm font-semibold text-brand">開発用ログイン</h2>
            <p className="text-xs text-foreground/60">
              <span className="block">開発・動作確認専用の仮ログインです。</span>
              <span className="block">社員IDのみでログインできます。</span>
            </p>
            <LoginForm />
          </section>
        ) : null}
      </div>
    </main>
  );
}
