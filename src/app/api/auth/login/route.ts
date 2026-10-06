import { NextRequest, NextResponse } from "next/server";
import { createSession, sameOrigin, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 403 });
  const payload = await request.json().catch(() => ({}));
  const email = String(payload.email || "").trim().toLowerCase();
  const password = String(payload.password || "");
  if (!email || !password || email.length > 254 || password.length > 1024)
    return NextResponse.json({ error: "Email atau kata sandi salah" }, { status: 400 });
  const sql = db();
  const rows = await sql`SELECT id, password_hash, locked_until FROM app_users WHERE email = ${email} LIMIT 1`;
  const user = rows[0];
  const locked = user?.locked_until && new Date(String(user.locked_until)) > new Date();
  if (!user || locked || !verifyPassword(password, String(user.password_hash))) {
    if (user && !locked) await sql`UPDATE app_users SET
      failed_logins = CASE WHEN failed_logins >= 4 THEN 0 ELSE failed_logins + 1 END,
      locked_until = CASE WHEN failed_logins >= 4 THEN now() + interval '15 minutes' ELSE NULL END
      WHERE id = ${user.id}`;
    return NextResponse.json({ error: "Email atau kata sandi salah. Coba lagi nanti jika akun terkunci." }, { status: 401 });
  }
  await sql`UPDATE app_users SET failed_logins = 0, locked_until = NULL WHERE id = ${user.id}`;
  await createSession(String(user.id));
  return NextResponse.json({ ok: true });
}
