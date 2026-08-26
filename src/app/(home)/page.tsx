import { reportService } from "@/services/reportService";
import { regionService } from "@/services/regionService";
import { HomeDashboard } from "@/components/home/HomeDashboard";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export default async function CrisisGraphPage() {
  const reports = await reportService.getReports();

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const user = await getCurrentUser();
  const listas = user ? await regionService.getLists(supabase) : [];

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-zinc-100 ">
      <HomeDashboard
        initialReports={reports}
        initialListas={listas}
        user={user}
      />
    </main>
  );
}
