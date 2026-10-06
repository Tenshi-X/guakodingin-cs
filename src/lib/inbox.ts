import { db } from "./db";
import type { Agent, Conversation, InboxMessage } from "./types";

type Row = Record<string, unknown>;
const iso = (value: unknown) => new Date(String(value)).toISOString();

function conversation(row: Row): Conversation {
  return {
    id: String(row.id), platform: row.platform as Conversation["platform"],
    contactId: String(row.contact_id), externalId: String(row.external_id),
    contactName: String(row.contact_name), username: row.username ? String(row.username) : null,
    phone: row.phone ? String(row.phone) : null,
    status: row.status as Conversation["status"],
    assignedTo: row.assigned_to ? String(row.assigned_to) : null,
    assignedName: row.assigned_name ? String(row.assigned_name) : null,
    notes: String(row.notes), unreadCount: Number(row.unread_count),
    lastMessageAt: iso(row.last_message_at),
    lastInboundAt: row.last_inbound_at ? iso(row.last_inbound_at) : null,
    lastMessagePreview: String(row.last_message_preview),
  };
}

export async function listInbox() {
  const sql = db();
  const [rows, users] = await Promise.all([
    sql`SELECT c.*, t.platform, t.external_id, t.name AS contact_name, t.username, t.phone,
      u.name AS assigned_name
      FROM conversations c JOIN contacts t ON t.id = c.contact_id
      LEFT JOIN app_users u ON u.id = c.assigned_to
      ORDER BY c.last_message_at DESC LIMIT 300`,
    sql`SELECT id, name, email, role FROM app_users ORDER BY name`,
  ]);
  return { conversations: rows.map(conversation), agents: users as Agent[] };
}

export async function getConversation(id: string) {
  const sql = db();
  const rows = await sql`SELECT c.*, t.platform, t.external_id, t.name AS contact_name,
    t.username, t.phone, u.name AS assigned_name
    FROM conversations c JOIN contacts t ON t.id = c.contact_id
    LEFT JOIN app_users u ON u.id = c.assigned_to WHERE c.id = ${id} LIMIT 1`;
  return rows[0] ? conversation(rows[0]) : null;
}

export async function getMessages(conversationId: string): Promise<InboxMessage[]> {
  const rows = await db()`SELECT recent.*, u.name AS sent_by_name FROM (
      SELECT id, conversation_id, direction, kind, body, status, created_at, sent_by
      FROM messages WHERE conversation_id = ${conversationId}
      ORDER BY created_at DESC, id DESC LIMIT 500
    ) recent LEFT JOIN app_users u ON u.id = recent.sent_by
    ORDER BY recent.created_at ASC, recent.id ASC`;
  return rows.map((row) => ({
    id: String(row.id), conversationId: String(row.conversation_id),
    direction: row.direction as InboxMessage["direction"],
    kind: row.kind as InboxMessage["kind"], body: String(row.body),
    status: row.status as InboxMessage["status"],
    sentByName: row.sent_by_name ? String(row.sent_by_name) : null,
    createdAt: iso(row.created_at),
  }));
}

export async function ingestMessage(input: {
  platform: "whatsapp" | "instagram";
  externalContactId: string;
  contactName: string;
  username?: string;
  phone?: string;
  externalMessageId: string;
  body: string;
  kind: "text" | "media" | "unsupported";
  timestamp: Date;
}) {
  // A single statement keeps contact, conversation and message creation together.
  // ON CONFLICT makes Meta webhook retries harmless.
  const sql = db();
  await sql`
    WITH contact AS (
      INSERT INTO contacts (platform, external_id, name, username, phone)
      VALUES (${input.platform}, ${input.externalContactId}, ${input.contactName},
        ${input.username ?? null}, ${input.phone ?? null})
      ON CONFLICT (platform, external_id) DO UPDATE SET
        name = CASE WHEN EXCLUDED.name = contacts.external_id THEN contacts.name ELSE EXCLUDED.name END,
        username = COALESCE(EXCLUDED.username, contacts.username),
        phone = COALESCE(EXCLUDED.phone, contacts.phone)
      RETURNING id
    ), thread AS (
      INSERT INTO conversations (contact_id, last_message_at)
      SELECT id, ${input.timestamp.toISOString()}::timestamptz FROM contact
      ON CONFLICT (contact_id) DO UPDATE SET updated_at = now()
      RETURNING id
    ), inserted AS (
      INSERT INTO messages (conversation_id, external_id, direction, kind, body, status, created_at)
      SELECT id, ${input.externalMessageId}, 'inbound', ${input.kind}, ${input.body},
        'sent', ${input.timestamp.toISOString()}::timestamptz FROM thread
      ON CONFLICT (external_id) DO NOTHING
      RETURNING conversation_id
    )
    UPDATE conversations c SET
      status = 'open', unread_count = c.unread_count + 1,
      last_inbound_at = GREATEST(COALESCE(c.last_inbound_at, ${input.timestamp.toISOString()}::timestamptz), ${input.timestamp.toISOString()}::timestamptz),
      last_message_at = GREATEST(c.last_message_at, ${input.timestamp.toISOString()}::timestamptz),
      last_message_preview = CASE WHEN ${input.timestamp.toISOString()}::timestamptz >= c.last_message_at THEN ${input.body.slice(0, 160)} ELSE c.last_message_preview END,
      updated_at = now()
    FROM inserted WHERE c.id = inserted.conversation_id`;
}
