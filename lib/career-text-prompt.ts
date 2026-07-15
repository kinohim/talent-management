// EDT002 のAI生成(経歴概要・自己PR)で使うプロンプト構築ロジック。
// Anthropic API 呼び出し本体は app/api/career-summary/generate/route.ts が担い、
// ここは入力データの整形とプロンプト文字列の組み立てのみを行う純粋関数群。

export type CareerTextTarget = "careerSummary" | "selfPr";

export type PromptProject = {
  projectTitle: string;
  industry: string | null;
  projectSummary: string | null;
  overview: string | null;
  startDate: Date;
  endDate: Date | null;
  roles: string[];
  skills: string[];
  phases: string[];
};

export type PromptSkill = {
  name: string;
  version: string | null;
  level: "EXPERT" | "EXPERIENCED" | "BASIC";
};

export type PromptCertification = {
  name: string;
  acquiredDate: Date;
};

export type CareerTextPromptInput = {
  experienceYears: number | null;
  careerSummary: string | null;
  selfPr: string | null;
  projects: PromptProject[];
  skills: PromptSkill[];
  certifications: PromptCertification[];
};

export type MissingDataKind = "projects" | "skills" | "certifications";

const SKILL_LEVEL_LABELS: Record<PromptSkill["level"], string> = {
  EXPERT: "得意",
  EXPERIENCED: "経験あり",
  BASIC: "基礎知識",
};

const MISSING_DATA_LABELS: Record<MissingDataKind, string> = {
  projects: "経歴",
  skills: "スキル",
  certifications: "資格",
};

const TARGET_LABELS: Record<CareerTextTarget, string> = {
  careerSummary: "経歴概要",
  selfPr: "自己PR",
};

// 対象カラムはDATE型(UTC深夜保存)のため、実行環境のタイムゾーンに
// 影響されないようUTC getterで読み出す
function formatYearMonth(date: Date): string {
  return `${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatProject(project: PromptProject): string {
  const period = `${formatYearMonth(project.startDate)}〜${
    project.endDate ? formatYearMonth(project.endDate) : "現在"
  }`;
  const lines = [`- ${project.projectTitle}(${period})`];
  if (project.industry) lines.push(`  業種: ${project.industry}`);
  if (project.projectSummary) lines.push(`  概要: ${project.projectSummary}`);
  if (project.overview) lines.push(`  業務内容: ${project.overview}`);
  if (project.roles.length > 0)
    lines.push(`  ロール: ${project.roles.join("、")}`);
  if (project.phases.length > 0)
    lines.push(`  担当工程: ${project.phases.join("、")}`);
  if (project.skills.length > 0)
    lines.push(`  使用技術: ${project.skills.join("、")}`);
  return lines.join("\n");
}

function formatSkill(skill: PromptSkill): string {
  const name = skill.version ? `${skill.name} ${skill.version}` : skill.name;
  return `- ${name}(${SKILL_LEVEL_LABELS[skill.level]})`;
}

function formatCertification(certification: PromptCertification): string {
  return `- ${certification.name}(${formatYearMonth(certification.acquiredDate)}取得)`;
}

function buildProfileSection(input: CareerTextPromptInput): string {
  const sections: string[] = [];

  if (input.experienceYears !== null) {
    sections.push(`## 経験年数\n${input.experienceYears}年`);
  }

  sections.push(
    input.projects.length > 0
      ? `## プロジェクト経歴\n${input.projects.map(formatProject).join("\n")}`
      : "## プロジェクト経歴\n(未登録)",
  );
  sections.push(
    input.skills.length > 0
      ? `## スキル\n${input.skills.map(formatSkill).join("\n")}`
      : "## スキル\n(未登録)",
  );
  sections.push(
    input.certifications.length > 0
      ? `## 資格\n${input.certifications.map(formatCertification).join("\n")}`
      : "## 資格\n(未登録)",
  );

  if (input.careerSummary) {
    sections.push(`## 登録済みの経歴概要\n${input.careerSummary}`);
  }
  if (input.selfPr) {
    sections.push(`## 登録済みの自己PR\n${input.selfPr}`);
  }

  return sections.join("\n\n");
}

export function buildCareerTextPrompt(
  target: CareerTextTarget,
  input: CareerTextPromptInput,
): { system: string; user: string } {
  const targetLabel = TARGET_LABELS[target];

  const targetInstruction =
    target === "careerSummary"
      ? "経歴概要には、従事してきた業務分野・担当工程・役割・主要技術を事実ベースで要約してください。誇張や推測は避け、登録データから読み取れる内容のみを記述します。"
      : "自己PRには、一人称「私」を用いて、経歴・スキル・資格から読み取れる強みを2〜3点に絞ってアピールしてください。";

  const existingText =
    target === "careerSummary" ? input.careerSummary : input.selfPr;
  const existingInstruction = existingText
    ? `登録済みの${targetLabel}が既に存在します。その内容と意図を活かしつつ、登録データを踏まえて改善した文章を生成してください。`
    : `登録済みの${targetLabel}はありません。登録データからゼロから作成してください。`;

  const system = [
    `あなたはITエンジニアの業務経歴書作成を支援するアシスタントです。社員の登録データをもとに、業務経歴書の「${targetLabel}」欄の下書きを日本語で作成します。`,
    "",
    "必ず次のルールに従ってください:",
    "- です・ます調で書く",
    "- 300〜500字を目安とし、どれだけ長くても1000文字以内に収める",
    "- 前置き・見出し・箇条書きは使わず、本文のみを出力する",
    `- ${targetInstruction}`,
    "- 登録データが少ない場合は、経験年数など分かる情報のみから汎用的な下書きを作成する",
  ].join("\n");

  const user = [
    `以下の社員データをもとに、${targetLabel}の下書きを作成してください。`,
    existingInstruction,
    "",
    buildProfileSection(input),
  ].join("\n");

  return { system, user };
}

export function listMissingData(
  input: CareerTextPromptInput,
): MissingDataKind[] {
  const missing: MissingDataKind[] = [];
  if (input.projects.length === 0) missing.push("projects");
  if (input.skills.length === 0) missing.push("skills");
  if (input.certifications.length === 0) missing.push("certifications");
  return missing;
}

export function buildMissingDataMessage(
  missing: MissingDataKind[],
): string | null {
  if (missing.length === 0) return null;
  const labels = missing.map((kind) => MISSING_DATA_LABELS[kind]).join("・");
  return `${labels}を登録すると、より精度の高い文章を生成できます。`;
}
