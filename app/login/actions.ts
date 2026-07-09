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
