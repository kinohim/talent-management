import Anthropic from "@anthropic-ai/sdk";
import { ApiError, GoogleGenAI } from "@google/genai";
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

// 無料枠対象モデル。pro 系は無料枠対象外のため flash を採用
// (gemini-2.5-flash は新規ユーザー利用不可のため 3.5 を使用)
const GEMINI_MODEL = "gemini-3.5-flash";

const requestSchema = z.object({
  target: z.enum(["careerSummary", "selfPr"]),
  provider: z.enum(["claude", "gemini"]).default("gemini"),
});

function errorResponse(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return errorResponse(401, "ログインしてください。");
  }
  // 人事・営業は自分の経歴書を持たないためmypageの経歴概要・自己PRセクション(AI生成含む)の対象外
  if (session.user.role === UserRole.HR_SALES) {
    return errorResponse(403, "この機能を利用する権限がありません。");
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(400, "リクエストが不正です。");
  }

  const apiKeyByProvider = {
    claude: process.env.ANTHROPIC_API_KEY,
    gemini: process.env.GEMINI_API_KEY,
  };
  if (!apiKeyByProvider[parsed.data.provider]) {
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
    const text =
      parsed.data.provider === "gemini"
        ? await generateWithGemini(system, user)
        : await generateWithClaude(system, user);
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
    if (error instanceof ApiError) {
      // 無料枠のquota超過・レート制限はいずれも429で返る
      if (error.status === 429) {
        return errorResponse(
          429,
          "AI生成の無料利用枠の上限に達しました。時間をおいて再度お試しください。",
        );
      }
      return errorResponse(
        502,
        "AI生成に失敗しました。時間をおいて再度お試しください。",
      );
    }
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

// 生成失敗(refusal・safety block・空文字)は null を返し、呼び出し側で502にする
async function generateWithClaude(
  system: string,
  user: string,
): Promise<string | null> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 2048, // 出力は最大1000文字程度のため意図的に小さめ
    thinking: { type: "adaptive" },
    system,
    messages: [{ role: "user", content: user }],
  });

  if (response.stop_reason === "refusal") {
    return null;
  }

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim()
    .slice(0, MAX_TEXT_LENGTH);
  return text || null;
}

async function generateWithGemini(
  system: string,
  user: string,
): Promise<string | null> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: user,
    config: { systemInstruction: system },
  });
  // text は safety block 時に undefined になる
  const text = response.text?.trim().slice(0, MAX_TEXT_LENGTH);
  return text || null;
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
    [detail.researchAnalysis, "調査分析"],
    [detail.requirementsDefinition, "要件定義"],
    [detail.basicDesign, "基本設計"],
    [detail.detailedDesign, "詳細設計"],
    [detail.development, "製造"],
    [detail.testing, "テスト"],
    [detail.operation, "運用"],
  ];
  return phases.filter(([flag]) => flag === true).map(([, label]) => label);
}
