import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { HeartRailsApiError, fetchLines } from "@/lib/heartrails";
import { PREFECTURES } from "@/lib/prefectures";

function errorResponse(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

const querySchema = z.object({ prefecture: z.string().min(1) });

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return errorResponse(401, "ログインしてください。");

  const parsed = querySchema.safeParse({
    prefecture: req.nextUrl.searchParams.get("prefecture") ?? "",
  });
  if (!parsed.success || !PREFECTURES.includes(parsed.data.prefecture)) {
    return NextResponse.json({ items: [] });
  }

  try {
    const items = await fetchLines(parsed.data.prefecture);
    return NextResponse.json({ items });
  } catch (err) {
    if (err instanceof HeartRailsApiError) return errorResponse(502, err.message);
    throw err;
  }
}
