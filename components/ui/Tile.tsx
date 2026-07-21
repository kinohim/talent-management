import Link from "next/link";

type TileProps = {
  label: string;
  href?: string;
  badge?: string;
  icon?: React.ReactNode;
};

export function Tile({ label, href, badge, icon }: TileProps) {
  if (!href) {
    return (
      <div
        aria-disabled="true"
        className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-surface-border p-6 text-center text-foreground/40"
      >
        {icon ? (
          <span className="flex size-11 items-center justify-center rounded-full bg-background text-foreground/30">
            {icon}
          </span>
        ) : null}
        <span>{label}</span>
        <span className="text-xs">準備中</span>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-surface-border bg-surface p-6 text-center transition hover:border-primary hover:bg-primary/10"
    >
      {icon ? (
        <span className="flex size-11 items-center justify-center rounded-full bg-primary/15 text-primary-dark">
          {icon}
        </span>
      ) : null}
      <span>{label}</span>
      {badge ? <span className="text-xs text-foreground/60">{badge}</span> : null}
    </Link>
  );
}
