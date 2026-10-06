import { createHmac, timingSafeEqual } from "node:crypto";

const version = () => process.env.META_API_VERSION || "v25.0";

export function validMetaSignature(body: string, signature: string | null) {
  const secret = process.env.META_APP_SECRET;
  if (!secret || !signature?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const received = signature.slice(7);
  if (!/^[a-f0-9]{64}$/i.test(received)) return false;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(received, "hex"));
}

export async function sendMetaText(platform: "whatsapp" | "instagram", recipient: string, text: string) {
  const isWa = platform === "whatsapp";
  const token = isWa ? process.env.WHATSAPP_ACCESS_TOKEN : process.env.INSTAGRAM_ACCESS_TOKEN;
  const account = isWa ? process.env.WHATSAPP_PHONE_NUMBER_ID : process.env.INSTAGRAM_ACCOUNT_ID;
  if (!token || !account) throw new Error(`Kredensial ${platform} belum diatur`);
  const endpoint = isWa
    ? `https://graph.facebook.com/${version()}/${account}/messages`
    : `https://graph.instagram.com/${version()}/${account}/messages`;
  const payload = isWa
    ? { messaging_product: "whatsapp", to: recipient, type: "text", text: { body: text, preview_url: false } }
    : { recipient: { id: recipient }, message: { text } };
  const response = await fetch(endpoint, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload), cache: "no-store",
  });
  const result = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const error = result.error as { message?: string } | undefined;
    throw new Error(error?.message || `Meta mengembalikan HTTP ${response.status}`);
  }
  const waMessages = result.messages as { id?: string }[] | undefined;
  return isWa ? waMessages?.[0]?.id : result.message_id as string | undefined;
}
