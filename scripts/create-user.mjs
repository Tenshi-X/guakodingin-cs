import "dotenv/config";
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { randomBytes, scryptSync } from "node:crypto";

config({ path: ".env.local", override: true, quiet: true });
const [name, rawEmail, role = "agent"] = process.argv.slice(2);
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL belum diatur");
if (!name || !rawEmail || !["agent", "owner"].includes(role)) {
  throw new Error('Pakai: npm run user:create -- "Nama" email@contoh.com [owner|agent]');
}
if (!process.stdin.isTTY) throw new Error("Jalankan perintah ini di terminal interaktif agar kata sandi bisa dimasukkan dengan aman.");
const password = await new Promise((resolve, reject) => {
  let secret = "";
  process.stdout.write("Kata sandi (minimal 12 karakter): ");
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");
  const finish = (error) => {
    process.stdin.removeListener("data", onData);
    process.stdin.setRawMode(false);
    process.stdin.pause();
    process.stdout.write("\n");
    if (error) reject(error); else resolve(secret);
  };
  const onData = (chunk) => {
    for (const char of chunk) {
      if (char === "\r" || char === "\n") return finish();
      if (char === "\u0003") return finish(new Error("Dibatalkan"));
      if (char === "\u007f" || char === "\b") {
        if (secret.length) { secret = secret.slice(0, -1); process.stdout.write("\b \b"); }
      } else if (char >= " " && secret.length < 1024) { secret += char; process.stdout.write("*"); }
    }
  };
  process.stdin.on("data", onData);
});
if (password.length < 12) throw new Error("Kata sandi minimal 12 karakter.");
const email = rawEmail.toLowerCase().trim();
const salt = randomBytes(16).toString("hex");
const hash = scryptSync(password, salt, 64).toString("hex");
const sql = neon(process.env.DATABASE_URL);
await sql`INSERT INTO app_users (name, email, password_hash, role)
  VALUES (${name}, ${email}, ${`scrypt:${salt}:${hash}`}, ${role})
  ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash, role = EXCLUDED.role`;
console.log(`Akun ${email} siap.`);
