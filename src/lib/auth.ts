import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";
import type { Agent } from "./types";

const COOKIE = "guakodingin_session";
const WEEK = 7 * 24 * 60 * 60;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function verifyPassword(password: string, stored: string) {
  const [algorithm, salt, expected] = stored.split(":");
  if (algorithm !== "scrypt" || !salt || !expected || expected.length !== 128) return false;
  const actual = scryptSync(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(expected, "hex"));
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const sql = db();
  await sql`INSERT INTO sessions (user_id, token_hash, expires_at)
    VALUES (${userId}, ${hashToken(token)}, now() + interval '7 days')`;
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: WEEK,
  });
}

export async function getSession(): Promise<Agent | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || !process.env.DATABASE_URL) return null;
  const sql = db();
  const rows = await sql`SELECT u.id, u.name, u.email, u.role FROM sessions s
    JOIN app_users u ON u.id = s.user_id
    WHERE s.token_hash = ${hashToken(token)} AND s.expires_at > now() LIMIT 1`;
  return rows[0] as Agent | undefined ?? null;
}

export async function clearSession() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (token && process.env.DATABASE_URL) {
    await db()`DELETE FROM sessions WHERE token_hash = ${hashToken(token)}`;
  }
  (await cookies()).delete(COOKIE);
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try { return new URL(origin).host === host; } catch { return false; }
}
