import { AdminShell } from "@/components/common/AdminShell";
import { getCurrentUser } from "@/lib/supabase/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();

  if (!user) redirect("/");

  return <AdminShell user={user}>{children}</AdminShell>;
}
