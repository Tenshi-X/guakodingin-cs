export type Platform = "whatsapp" | "instagram";
export type ConversationStatus = "open" | "pending" | "closed";
export type MessageStatus = "pending" | "sent" | "failed" | "delivered" | "read";

export type Agent = { id: string; name: string; email: string; role: "owner" | "agent" };
export type Conversation = {
  id: string;
  platform: Platform;
  contactId: string;
  externalId: string;
  contactName: string;
  username: string | null;
  phone: string | null;
  status: ConversationStatus;
  assignedTo: string | null;
  assignedName: string | null;
  notes: string;
  unreadCount: number;
  lastMessageAt: string;
  lastInboundAt: string | null;
  lastMessagePreview: string;
};
export type InboxMessage = {
  id: string;
  conversationId: string;
  direction: "inbound" | "outbound";
  kind: "text" | "media" | "unsupported";
  body: string;
  status: MessageStatus;
  sentByName: string | null;
  createdAt: string;
};
