import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export default async function Home() {
  if (!process.env.DATABASE_URL) redirect("/demo");
  redirect((await getSession()) ? "/inbox" : "/login");
}
