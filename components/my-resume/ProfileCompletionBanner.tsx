import type { ProfileCompletionResult } from "@/lib/profile-completion";

type ProfileCompletionBannerProps = {
  completion: ProfileCompletionResult;
  // クリックで最初の未入力セクションまでスクロールする(nullなら未表示)
  incompleteSectionId: string | null;
};

// mypage(私の経歴書)専用: 入力率が100%未満のときのみ表示する入力促進バナー
export function ProfileCompletionBanner({
  completion,
  incompleteSectionId,
}: ProfileCompletionBannerProps) {
  if (completion.percent >= 100 || incompleteSectionId == null) return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-surface-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-2">
        <span className="text-sm font-medium text-brand">
          プロフィール入力率 {completion.percent}%
        </span>
        <div
          role="progressbar"
          aria-valuenow={completion.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-2 w-full overflow-hidden rounded-full bg-surface"
        >
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${completion.percent}%` }}
          />
        </div>
      </div>
      <a
        href={`#${incompleteSectionId}`}
        className="shrink-0 rounded-full bg-primary px-4 py-2 text-center text-sm text-primary-foreground hover:bg-primary-dark"
      >
        未入力項目を入力する
      </a>
    </div>
  );
}
