import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";

import { UserRole } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import {
  buildCareerTextPrompt,
  listMissingData,
  type CareerTextPromptInput,
} from "@/lib/career-text-prompt";
import { prisma } from "@/lib/prisma";

const MAX_TEXT_LENGTH = 1000;

const requestSchema = z.object({
  target: z.enum(["careerSummary", "selfPr"]),
});

function errorResponse(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return errorResponse(401, "ログインしてください。");
  }
  // 人事・営業は自分の経歴書を持たないためEDT002(AI生成含む)の対象外
  if (session.user.role === UserRole.HR_SALES) {
    return errorResponse(403, "この機能を利用する権限がありません。");
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(400, "リクエストが不正です。");
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return errorResponse(
      500,
      "AI生成機能が利用できません(サーバー設定エラー)。管理者にお問い合わせください。",
    );
  }

  const employee = await prisma.employee.findUnique({
    where: { employeeId: session.user.employeeId, deletedAt: null },
    include: {
      projects: {
        where: { deletedAt: null },
        orderBy: { startDate: "desc" },
        include: {
          projectDetail: true,
          projectSkills: {
            where: { deletedAt: null },
            include: { skill: true, skillVersion: true },
          },
          projectRoleLinks: {
            where: { deletedAt: null },
            include: { projectRole: true },
          },
        },
      },
      employeeSkills: {
        where: { deletedAt: null },
        include: { skill: true, skillVersion: true },
      },
      employeeCertifications: {
        where: { deletedAt: null },
        include: { certification: true },
      },
    },
  });
  if (!employee) {
    return errorResponse(404, "社員情報が見つかりません。");
  }

  const promptInput: CareerTextPromptInput = {
    experienceMonths: employee.experienceMonths,
    careerSummary: employee.careerSummary,
    selfPr: employee.selfPr,
    projects: employee.projects.map((project) => ({
      projectTitle: project.projectTitle,
      industry: project.industry,
      projectSummary: project.projectSummary,
      overview: project.projectDetail?.overview ?? null,
      startDate: project.startDate,
      endDate: project.endDate,
      roles: project.projectRoleLinks.map(
        (link) => link.projectRole.projectRoleName,
      ),
      skills: project.projectSkills.map((projectSkill) =>
        projectSkill.skillVersion
          ? `${projectSkill.skill.skillName} ${projectSkill.skillVersion.versionName}`
          : projectSkill.skill.skillName,
      ),
      phases: projectPhases(project.projectDetail),
    })),
    skills: employee.employeeSkills.map((employeeSkill) => ({
      name: employeeSkill.skill.skillName,
      version: employeeSkill.skillVersion?.versionName ?? null,
      level: employeeSkill.skillLevel,
    })),
    certifications: employee.employeeCertifications.map(
      (employeeCertification) => ({
        name: employeeCertification.certification.certificationName,
        acquiredDate: employeeCertification.acquiredDate,
      }),
    ),
  };

  const { system, user } = buildCareerTextPrompt(parsed.data.target, promptInput);

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048, // 出力は最大1000文字程度のため意図的に小さめ
      thinking: { type: "adaptive" },
      system,
      messages: [{ role: "user", content: user }],
    });

    if (response.stop_reason === "refusal") {
      return errorResponse(
        502,
        "AIが文章を生成できませんでした。時間をおいて再度お試しください。",
      );
    }

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim()
      .slice(0, MAX_TEXT_LENGTH);
    if (!text) {
      return errorResponse(
        502,
        "AIが文章を生成できませんでした。時間をおいて再度お試しください。",
      );
    }

    return NextResponse.json({
      text,
      missingData: listMissingData(promptInput),
    });
  } catch (error) {
    console.error(error);
    // クレジット残高不足(400 invalid_request_error、メッセージに"credit balance"を含む)は
    // リトライしても解決しないため、他のAPIエラーと区別する
    if (
      error instanceof Anthropic.APIError &&
      error.message.toLowerCase().includes("credit balance")
    ) {
      return errorResponse(
        502,
        "AI生成機能のクレジット残高が不足しています。管理者にお問い合わせください。",
      );
    }
    if (error instanceof Anthropic.RateLimitError) {
      return errorResponse(
        429,
        "AI生成が混み合っています。時間をおいて再度お試しください。",
      );
    }
    if (error instanceof Anthropic.APIError) {
      return errorResponse(
        502,
        "AI生成に失敗しました。時間をおいて再度お試しください。",
      );
    }
    return errorResponse(
      500,
      "AI生成に失敗しました。時間をおいて再度お試しください。",
    );
  }
}

type ProjectDetailPhases = {
  researchAnalysis: boolean | null;
  requirementsDefinition: boolean | null;
  basicDesign: boolean | null;
  detailedDesign: boolean | null;
  development: boolean | null;
  testing: boolean | null;
  operation: boolean | null;
} | null;

function projectPhases(detail: ProjectDetailPhases): string[] {
  if (!detail) return [];
  const phases: [boolean | null, string][] = [
    [detail.researchAnalysis, "調査・分析"],
    [detail.requirementsDefinition, "要件定義"],
    [detail.basicDesign, "基本設計"],
    [detail.detailedDesign, "詳細設計"],
    [detail.development, "開発"],
    [detail.testing, "テスト"],
    [detail.operation, "運用"],
  ];
  return phases.filter(([flag]) => flag === true).map(([, label]) => label);
}
