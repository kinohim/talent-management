import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/LoginForm";
import { auth } from "@/lib/auth";
import { isProduction } from "@/lib/env";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-lg font-semibold">ログイン</h1>
      {isProduction ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          SSOログインは準備中です。しばらくお待ちください。
        </p>
      ) : (
        // 実SSO(Azure AD/Google/GitHub)実装前の開発用ログイン導線(AUTH001参照)。
        // 実SSO実装時にAzure AD/Google/GitHubの各ボタンへ差し替える。
        <LoginForm />
      )}
    </main>
  );
}
