"use server";

import { AuthError } from "@auth/core/errors";

import { signIn } from "@/lib/auth";
import { messageForLoginError } from "@/lib/auth-errors";

export type LoginFormState = { error: string | null };

export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  try {
    await signIn("dev-employee-id", {
      employeeId: formData.get("employeeId"),
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: messageForLoginError(error) };
    }
    // signIn()成功時、内部でnext/navigationのredirect()がNEXT_REDIRECTを
    // throwして遷移する(Next.jsの制御フロー例外)。AuthError以外はそのまま
    // 再throwして遷移を成立させる。
    throw error;
  }

  return { error: null };
}

export async function githubLoginAction(): Promise<void> {
  // OAuthフローは成功時NEXT_REDIRECTのthrowでGitHubへ遷移する。エラー
  // (未登録・退職済み・プロバイダ不一致)はsignInコールバックから
  // `/login?error=<code>` へのリダイレクトで戻ってくるため(lib/auth.ts参照)、
  // Credentialsと違いここでのcatch/useActionStateは不要。
  await signIn("github", { redirectTo: "/" });
}
