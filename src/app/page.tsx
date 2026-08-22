import { reportService } from "@/services/reportService";
import { CrisisDashboard } from "@/components/home/CrisisDashboard";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function CrisisGraphPage() {
  const reports = await reportService.getReports();

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-zinc-100 ">
      <CrisisDashboard initialReports={reports} user={user} />
    </main>
  );
}
