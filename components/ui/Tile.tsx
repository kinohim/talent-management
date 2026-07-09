import Link from "next/link";

type TileProps = {
  label: string;
  href?: string;
  badge?: string;
};

export function Tile({ label, href, badge }: TileProps) {
  if (!href) {
    return (
      <div
        aria-disabled="true"
        className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed p-6 text-center text-zinc-400 dark:text-zinc-600"
      >
        <span>{label}</span>
        <span className="text-xs">準備中</span>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center gap-1 rounded-lg border p-6 text-center transition hover:bg-zinc-50 dark:hover:bg-zinc-900"
    >
      <span>{label}</span>
      {badge ? (
        <span className="text-xs text-zinc-500">{badge}</span>
      ) : null}
    </Link>
  );
}
