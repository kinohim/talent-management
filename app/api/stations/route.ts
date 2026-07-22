import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { HeartRailsApiError, fetchStations } from "@/lib/heartrails";

function errorResponse(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

const querySchema = z.object({ line: z.string().min(1).max(100) });

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return errorResponse(401, "ログインしてください。");

  const parsed = querySchema.safeParse({ line: req.nextUrl.searchParams.get("line") ?? "" });
  if (!parsed.success) return NextResponse.json({ items: [] });

  try {
    const items = await fetchStations(parsed.data.line);
    return NextResponse.json({ items });
  } catch (err) {
    if (err instanceof HeartRailsApiError) return errorResponse(502, err.message);
    throw err;
  }
}
