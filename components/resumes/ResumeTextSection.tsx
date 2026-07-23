import { MissingFieldPrompt } from "@/components/ui/MissingFieldPrompt";

type ResumeTextSectionProps = {
  title: string;
  content: string;
  // mypage(本人編集画面)限定: 未入力を前向きな促し表示にする
  promptEmpty?: boolean;
};

export function ResumeTextSection({
  title,
  content,
  promptEmpty = false,
}: ResumeTextSectionProps) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-semibold">{title}</h2>
      {content ? (
        <p className="whitespace-pre-wrap break-words text-sm">{content}</p>
      ) : promptEmpty ? (
        <MissingFieldPrompt />
      ) : (
        <p className="whitespace-pre-wrap break-words text-sm">未登録</p>
      )}
    </section>
  );
}
