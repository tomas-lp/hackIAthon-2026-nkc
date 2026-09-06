import { reportService } from "@/services/reportService";
import { barrioService } from "@/services/barrioService";
import { regionService } from "@/services/regionService";
import { EstadisticasDashboard } from "@/components/statistics/EstadisticasDashboard";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/supabase/auth";
import { redirect } from "next/navigation";

export default async function EstadisticasPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  const [allReports, barriosGeoJson, regionLists, customRegions] =
    await Promise.all([
      reportService.getAllReports(),
      barrioService.getBarriosGeoJson(),
      regionService.getLists(supabase),
      regionService.getRegions(supabase),
    ]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-100 dark:bg-[#0b101d]">
      <EstadisticasDashboard
        allReports={allReports}
        barriosGeoJson={barriosGeoJson}
        regionLists={regionLists}
        customRegions={customRegions}
        user={user}
      />
    </div>
  );
}
