import { NextRequest, NextResponse } from "next/server";
import { getSession, sameOrigin } from "@/lib/auth";
import { db } from "@/lib/db";
import { getConversation } from "@/lib/inbox";
import { sendMetaText } from "@/lib/meta";

type Params = { params: Promise<{ id: string }> };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest, { params }: Params) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Masuk terlebih dahulu" }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 403 });
  const { id } = await params;
  if (!uuid.test(id)) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  const payload = await request.json().catch(() => ({}));
  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  if (!body || body.length > 1000) return NextResponse.json({ error: "Pesan harus berisi 1–1.000 karakter" }, { status: 400 });
  const sql = db();
  const claimed = await sql`UPDATE conversations SET assigned_to = ${user.id}, status = 'open', updated_at = now()
    WHERE id = ${id} AND (assigned_to IS NULL OR assigned_to = ${user.id}) RETURNING id`;
  if (!claimed.length) return NextResponse.json({ error: "Percakapan sedang ditangani anggota lain" }, { status: 409 });
  const conversation = await getConversation(id);
  if (!conversation) return NextResponse.json({ error: "Percakapan tidak ditemukan" }, { status: 404 });
  if (conversation.platform === "whatsapp" &&
      (!conversation.lastInboundAt || Date.now() - new Date(conversation.lastInboundAt).getTime() >= 24 * 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Jendela balasan WhatsApp 24 jam telah berakhir. Gunakan template yang disetujui di Meta." }, { status: 409 });
  }
  const pending = await sql`INSERT INTO messages (conversation_id, direction, kind, body, status, sent_by)
    VALUES (${id}, 'outbound', 'text', ${body}, 'pending', ${user.id}) RETURNING id`;
  const messageId = String(pending[0].id);
  try {
    const externalId = await sendMetaText(conversation.platform, conversation.externalId, body);
    await sql`UPDATE messages SET status = 'sent', external_id = ${externalId ?? null} WHERE id = ${messageId}`;
    await sql`UPDATE conversations SET last_message_at = now(), last_message_preview = ${body.slice(0, 160)}, updated_at = now() WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    await sql`UPDATE messages SET status = 'failed' WHERE id = ${messageId}`;
    const detail = error instanceof Error ? error.message : "Gagal mengirim pesan";
    return NextResponse.json({ error: detail }, { status: 502 });
  }
}
