import { NextRequest, NextResponse } from "next/server";
import { getSession, sameOrigin } from "@/lib/auth";
import { db } from "@/lib/db";
import { getConversation, getMessages } from "@/lib/inbox";

type Params = { params: Promise<{ id: string }> };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: NextRequest, { params }: Params) {
  if (!await getSession()) return NextResponse.json({ error: "Masuk terlebih dahulu" }, { status: 401 });
  const { id } = await params;
  if (!uuid.test(id)) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  const conversation = await getConversation(id);
  if (!conversation) return NextResponse.json({ error: "Percakapan tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ conversation, messages: await getMessages(id) }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Masuk terlebih dahulu" }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 403 });
  const { id } = await params;
  if (!uuid.test(id)) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  const input = await request.json().catch(() => ({}));
  const sql = db();
  let rows;
  switch (input.action) {
    case "claim":
      rows = await sql`UPDATE conversations SET assigned_to = ${user.id}, updated_at = now()
        WHERE id = ${id} AND (assigned_to IS NULL OR assigned_to = ${user.id}) RETURNING id`;
      break;
    case "assign": {
      const agentId = input.agentId === null ? null : String(input.agentId || "");
      if (agentId && !uuid.test(agentId)) return NextResponse.json({ error: "Agen tidak valid" }, { status: 400 });
      if (agentId) {
        const agents = await sql`SELECT id FROM app_users WHERE id = ${agentId} LIMIT 1`;
        if (!agents.length) return NextResponse.json({ error: "Agen tidak ditemukan" }, { status: 400 });
      }
      rows = await sql`UPDATE conversations SET assigned_to = ${agentId}, updated_at = now()
        WHERE id = ${id} AND (assigned_to IS NULL OR assigned_to = ${user.id} OR ${user.role} = 'owner') RETURNING id`;
      break;
    }
    case "status":
      if (!["open", "pending", "closed"].includes(input.status))
        return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
      rows = await sql`UPDATE conversations SET status = ${input.status}, updated_at = now()
        WHERE id = ${id} AND (assigned_to IS NULL OR assigned_to = ${user.id} OR ${user.role} = 'owner') RETURNING id`;
      break;
    case "notes":
      if (typeof input.notes !== "string" || input.notes.length > 5000)
        return NextResponse.json({ error: "Catatan terlalu panjang" }, { status: 400 });
      rows = await sql`UPDATE conversations SET notes = ${input.notes}, updated_at = now()
        WHERE id = ${id} AND (assigned_to IS NULL OR assigned_to = ${user.id} OR ${user.role} = 'owner') RETURNING id`;
      break;
    case "read":
      rows = await sql`UPDATE conversations SET unread_count = 0 WHERE id = ${id} RETURNING id`;
      break;
    default:
      return NextResponse.json({ error: "Aksi tidak valid" }, { status: 400 });
  }
  if (!rows.length) return NextResponse.json({ error: "Percakapan tidak ditemukan atau ditangani anggota lain" }, { status: 409 });
  return NextResponse.json({ conversation: await getConversation(id) });
}
