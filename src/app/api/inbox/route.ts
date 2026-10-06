import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listInbox } from "@/lib/inbox";

export async function GET() {
  if (!await getSession()) return NextResponse.json({ error: "Masuk terlebih dahulu" }, { status: 401 });
  return NextResponse.json(await listInbox(), { headers: { "Cache-Control": "no-store" } });
}
