import { githubLoginAction } from "@/app/login/actions";

// loginのSSOログインボタン群(docs/screens.md参照)。実装済みはGitHubのみで、
// Azure AD(Microsoft)/Googleは未実装のため「準備中」として先頭に非活性で配置する。
// GitHubもクレデンシャル未設定の環境(gitHubEnabled=false)では準備中扱いにする。
// 各ボタンは活性・非活性を問わずプロバイダのイメージカラーで配色し、
// 非活性であることは準備中アイコン+「(準備中)」表記で明示する。

function PendingIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-4 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function PendingButton({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <button
      type="button"
      disabled
      className={`flex cursor-not-allowed items-center justify-center gap-2 rounded-full border px-4 py-2 opacity-70 ${className}`}
    >
      <PendingIcon />
      <span>{label}(準備中)</span>
    </button>
  );
}

export function SsoLoginButtons({ gitHubEnabled }: { gitHubEnabled: boolean }) {
  return (
    <div className="flex w-full flex-col gap-3">
      {/* Microsoft: ブランドブルー #0078D4 */}
      <PendingButton
        label="Microsoftアカウントでログイン"
        className="border-[#0078D4] bg-[#0078D4]/10 text-[#0078D4]"
      />
      {/* Google: 白地 + ブランドブルー #4285F4 */}
      <PendingButton
        label="Googleアカウントでログイン"
        className="border-[#4285F4] bg-white text-[#4285F4]"
      />
      {/* GitHub: ブランドブラック #24292F */}
      {gitHubEnabled ? (
        <form action={githubLoginAction} className="flex flex-col">
          <button
            type="submit"
            className="rounded-full bg-[#24292F] px-4 py-2 text-white hover:bg-[#32383f]"
          >
            GitHubアカウントでログイン
          </button>
        </form>
      ) : (
        <PendingButton
          label="GitHubアカウントでログイン"
          className="border-[#24292F] bg-[#24292F]/10 text-[#24292F]"
        />
      )}
    </div>
  );
}
