import { NextRequest, NextResponse } from "next/server";
import { ingestMessage } from "@/lib/inbox";
import { validMetaSignature } from "@/lib/meta";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams;
  if (query.get("hub.mode") === "subscribe" && process.env.META_VERIFY_TOKEN &&
      query.get("hub.verify_token") === process.env.META_VERIFY_TOKEN) {
    return new NextResponse(query.get("hub.challenge") || "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

type MetaEvent = {
  object?: string;
  entry?: Array<{
    id?: string;
    messaging?: Array<{
      sender?: { id?: string }; recipient?: { id?: string }; timestamp?: number;
      message?: { mid?: string; text?: string; is_echo?: boolean; attachments?: unknown[] };
    }>;
    changes?: Array<{ field?: string; value?: {
      metadata?: { phone_number_id?: string };
      contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
      messages?: Array<{ id?: string; from?: string; timestamp?: string; type?: string;
        text?: { body?: string }; image?: unknown; document?: unknown; audio?: unknown; video?: unknown }>;
      statuses?: Array<{ id?: string; status?: string }>;
    } }>;
  }>;
};

function timestamp(value: number | string | undefined, multiplier = 1) {
  const date = new Date(Number(value) * multiplier);
  return Number.isFinite(date.getTime()) ? date : new Date();
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (!validMetaSignature(raw, request.headers.get("x-hub-signature-256")))
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  let event: MetaEvent;
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!Array.isArray(event.entry)) return NextResponse.json({ ok: true });

  for (const entry of event.entry) {
    if (event.object === "whatsapp_business_account") {
      for (const change of entry.changes || []) {
        if (change.field !== "messages" || !change.value) continue;
        if (change.value.metadata?.phone_number_id !== process.env.WHATSAPP_PHONE_NUMBER_ID) continue;
        for (const status of change.value.statuses || []) {
          if (status.id && ["sent", "delivered", "read", "failed"].includes(status.status || ""))
            await db()`UPDATE messages SET status = ${status.status} WHERE external_id = ${status.id}`;
        }
        for (const message of change.value.messages || []) {
          if (!message.id || !message.from) continue;
          const contact = change.value.contacts?.find((item) => item.wa_id === message.from);
          const kind = message.type === "text" ? "text" : ["image", "document", "audio", "video"].includes(message.type || "") ? "media" : "unsupported";
          const body = kind === "text" ? message.text?.body || "[Pesan teks kosong]" : kind === "media" ? `[${message.type} diterima di WhatsApp]` : `[Pesan ${message.type || "lainnya"} belum didukung]`;
          await ingestMessage({ platform: "whatsapp", externalContactId: message.from,
            contactName: contact?.profile?.name || message.from, phone: message.from,
            externalMessageId: message.id, body, kind, timestamp: timestamp(message.timestamp, 1000) });
        }
      }
    } else if (event.object === "instagram") {
      if (entry.id !== process.env.INSTAGRAM_ACCOUNT_ID) continue;
      for (const item of entry.messaging || []) {
        const message = item.message;
        if (!message?.mid || !item.sender?.id || message.is_echo || item.sender.id === process.env.INSTAGRAM_ACCOUNT_ID) continue;
        const kind = message.text ? "text" : message.attachments?.length ? "media" : "unsupported";
        const body = message.text || (kind === "media" ? "[Lampiran diterima di Instagram]" : "[Pesan belum didukung]");
        await ingestMessage({ platform: "instagram", externalContactId: item.sender.id,
          contactName: `Instagram ${item.sender.id}`, externalMessageId: message.mid,
          body, kind, timestamp: timestamp(item.timestamp) });
      }
    }
  }
  return NextResponse.json({ ok: true });
}
