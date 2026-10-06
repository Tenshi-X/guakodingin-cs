import { NextRequest, NextResponse } from "next/server";
import { clearSession, sameOrigin } from "@/lib/auth";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 403 });
  await clearSession();
  return NextResponse.json({ ok: true });
}
