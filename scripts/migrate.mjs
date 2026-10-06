import "dotenv/config";
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local", override: true, quiet: true });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL belum diatur");
const sql = neon(process.env.DATABASE_URL);
const statements = readFileSync("db/schema.sql", "utf8").split(";").map((s) => s.trim()).filter(Boolean);
for (const statement of statements) await sql.query(statement);
console.log(`Database siap (${statements.length} perintah).`);
