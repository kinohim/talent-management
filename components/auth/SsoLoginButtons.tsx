import { githubLoginAction } from "@/app/login/actions";

// AUTH001のSSOログインボタン群(docs/screens.md参照)。実装済みはGitHubのみで、
// Azure AD(Microsoft)/Googleは未実装のため非活性で配置する。GitHubも
// クレデンシャル未設定の環境(gitHubEnabled=false)では非活性にする。
export function SsoLoginButtons({ gitHubEnabled }: { gitHubEnabled: boolean }) {
  const disabledButtonClass =
    "rounded border border-zinc-300 px-4 py-2 text-zinc-400 dark:border-zinc-700 dark:text-zinc-600";

  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <button type="button" disabled className={disabledButtonClass}>
        Microsoftアカウントでログイン(準備中)
      </button>
      <button type="button" disabled className={disabledButtonClass}>
        Googleアカウントでログイン(準備中)
      </button>
      {gitHubEnabled ? (
        <form action={githubLoginAction} className="flex flex-col">
          <button
            type="submit"
            className="rounded bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            GitHubアカウントでログイン
          </button>
        </form>
      ) : (
        <button type="button" disabled className={disabledButtonClass}>
          GitHubアカウントでログイン(未設定)
        </button>
      )}
    </div>
  );
}
