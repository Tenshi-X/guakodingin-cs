import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import LoginForm from "@/components/login-form";

export const dynamic = "force-dynamic";
export default async function LoginPage() {
  if (!process.env.DATABASE_URL) redirect("/demo");
  if (await getSession()) redirect("/inbox");
  return <LoginForm />;
}
