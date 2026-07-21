type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  as?: "h1" | "h2" | "h3";
  className?: string;
};

// デザイン案A: 英語ラベル(小さく・字間広め・グリーン) + 日本語見出し(大きめ)の
// 2段構成のセクション見出し。
export function SectionHeading({
  eyebrow,
  title,
  as: Tag = "h2",
  className,
}: SectionHeadingProps) {
  return (
    <div className={className}>
      <p className="text-xs font-semibold tracking-[0.2em] text-primary-dark">
        {eyebrow}
      </p>
      <Tag className="text-xl font-semibold text-brand">{title}</Tag>
    </div>
  );
}
