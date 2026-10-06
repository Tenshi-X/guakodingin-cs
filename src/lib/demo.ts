import type { Agent, Conversation, InboxMessage } from "./types";

export const demoAgents: Agent[] = [
  { id: "agent-1", name: "Farel", email: "farel@guakodingin.com", role: "owner" },
  { id: "agent-2", name: "Dimas", email: "dimas@guakodingin.com", role: "agent" },
  { id: "agent-3", name: "Nadia", email: "nadia@guakodingin.com", role: "agent" },
  { id: "agent-4", name: "Raka", email: "raka@guakodingin.com", role: "agent" },
];

const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();
export const demoConversations: Conversation[] = [
  { id: "demo-1", platform: "whatsapp", contactId: "c1", externalId: "6281234567890", contactName: "Budi Santoso", username: null, phone: "6281234567890", status: "open", assignedTo: null, assignedName: null, notes: "Punya rental mobil 12 unit. Tertarik website booking online.", unreadCount: 2, lastMessageAt: minutesAgo(3), lastInboundAt: minutesAgo(3), lastMessagePreview: "Kalau sistem booking online bisa sekalian?" },
  { id: "demo-2", platform: "instagram", contactId: "c2", externalId: "1784140002", contactName: "@putri.rental", username: "putri.rental", phone: null, status: "open", assignedTo: "agent-2", assignedName: "Dimas", notes: "", unreadCount: 1, lastMessageAt: minutesAgo(11), lastInboundAt: minutesAgo(11), lastMessagePreview: "Kak, boleh lihat portofolio websitenya?" },
  { id: "demo-3", platform: "whatsapp", contactId: "c3", externalId: "6285777778899", contactName: "Rizky Pratama", username: null, phone: "6285777778899", status: "pending", assignedTo: "agent-1", assignedName: "Farel", notes: "Follow up soal domain minggu depan.", unreadCount: 0, lastMessageAt: minutesAgo(49), lastInboundAt: minutesAgo(95), lastMessagePreview: "Baik kak, saya diskusikan dulu dengan tim." },
  { id: "demo-4", platform: "instagram", contactId: "c4", externalId: "1784140004", contactName: "@nabila.design", username: "nabila.design", phone: null, status: "open", assignedTo: null, assignedName: null, notes: "", unreadCount: 0, lastMessageAt: minutesAgo(140), lastInboundAt: minutesAgo(140), lastMessagePreview: "Hai! Mau tanya soal pembuatan landing page" },
  { id: "demo-5", platform: "whatsapp", contactId: "c5", externalId: "6282166665533", contactName: "CV Maju Bersama", username: null, phone: "6282166665533", status: "closed", assignedTo: "agent-3", assignedName: "Nadia", notes: "Sudah deal paket company profile.", unreadCount: 0, lastMessageAt: minutesAgo(1500), lastInboundAt: minutesAgo(1550), lastMessagePreview: "Terima kasih, kami tunggu invoice-nya ya." },
];

export const demoMessages: Record<string, InboxMessage[]> = {
  "demo-1": [
    { id: "m1", conversationId: "demo-1", direction: "inbound", kind: "text", body: "Halo min, saya punya rental mobil dan sedang cari jasa pembuatan website.", status: "read", sentByName: null, createdAt: minutesAgo(28) },
    { id: "m2", conversationId: "demo-1", direction: "outbound", kind: "text", body: "Halo Pak Budi! Tentu bisa. Kami bisa bantu buat website rental mobil yang mudah digunakan pelanggan. Boleh cerita kebutuhan utamanya?", status: "read", sentByName: "Farel", createdAt: minutesAgo(24) },
    { id: "m3", conversationId: "demo-1", direction: "inbound", kind: "text", body: "Saya punya sekitar 12 mobil. Ingin pelanggan bisa lihat unit yang tersedia dan langsung pesan.", status: "read", sentByName: null, createdAt: minutesAgo(8) },
    { id: "m4", conversationId: "demo-1", direction: "inbound", kind: "text", body: "Kalau sistem booking online bisa sekalian?", status: "sent", sentByName: null, createdAt: minutesAgo(3) },
  ],
  "demo-2": [{ id: "m5", conversationId: "demo-2", direction: "inbound", kind: "text", body: "Kak, boleh lihat portofolio websitenya?", status: "sent", sentByName: null, createdAt: minutesAgo(11) }],
  "demo-3": [
    { id: "m6", conversationId: "demo-3", direction: "inbound", kind: "text", body: "Untuk domain dan hosting sudah termasuk paket?", status: "read", sentByName: null, createdAt: minutesAgo(95) },
    { id: "m7", conversationId: "demo-3", direction: "outbound", kind: "text", body: "Bisa kami bantu siapkan. Detailnya akan kami jelaskan dalam penawaran ya, Kak.", status: "read", sentByName: "Farel", createdAt: minutesAgo(49) },
  ],
  "demo-4": [{ id: "m8", conversationId: "demo-4", direction: "inbound", kind: "text", body: "Hai! Mau tanya soal pembuatan landing page", status: "sent", sentByName: null, createdAt: minutesAgo(140) }],
  "demo-5": [{ id: "m9", conversationId: "demo-5", direction: "inbound", kind: "text", body: "Terima kasih, kami tunggu invoice-nya ya.", status: "read", sentByName: null, createdAt: minutesAgo(1500) }],
};
