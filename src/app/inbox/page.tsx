import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import InboxApp from "@/components/inbox-app";

export const dynamic = "force-dynamic";
export default async function InboxPage() {
  if (!process.env.DATABASE_URL) redirect("/demo");
  const user = await getSession();
  if (!user) redirect("/login");
  return <InboxApp currentUser={user} demo={false} />;
}
