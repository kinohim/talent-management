type ResumeTextSectionProps = {
  title: string;
  content: string;
};

export function ResumeTextSection({ title, content }: ResumeTextSectionProps) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="whitespace-pre-wrap break-words text-sm">{content || "未登録"}</p>
    </section>
  );
}
