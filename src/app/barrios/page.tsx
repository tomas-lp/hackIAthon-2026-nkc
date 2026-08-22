import { reportService } from "@/services/reportService";
import { CrisisDashboard } from "@/features/dashboard/CrisisDashboard";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function BarriosPage() {
  const reports = await reportService.getReports();

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-zinc-100 ">
      <CrisisDashboard
        initialReports={reports}
        user={user}
        showBarrios={true}
      />
    </main>
  );
}
