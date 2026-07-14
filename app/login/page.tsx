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
      <h1 className="text-lg font-semibold">ログイン</h1>
      {errorMessage ? (
        <p role="alert" className="w-full max-w-sm text-sm text-red-600">
          {errorMessage}
        </p>
      ) : null}
      <SsoLoginButtons gitHubEnabled={isGitHubSsoEnabled} />
      {useDevLogin ? (
        <section className="flex w-full max-w-sm flex-col gap-3 border-t border-zinc-300 pt-6 dark:border-zinc-700">
          <h2 className="text-sm font-semibold">開発用ログイン</h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            <span className="block">開発・動作確認専用の仮ログインです。</span>
            <span className="block">社員IDのみでログインできます。</span>
          </p>
          <LoginForm />
        </section>
      ) : null}
    </main>
  );
}
