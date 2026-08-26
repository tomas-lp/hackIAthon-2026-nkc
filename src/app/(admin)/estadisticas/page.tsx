import { reportService } from "@/services/reportService";
import { barrioService } from "@/services/barrioService";
import { regionService } from "@/services/regionService";
import { EstadisticasDashboard } from "@/components/statistics/EstadisticasDashboard";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EstadisticasPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
    <div className="relative min-h-screen overflow-hidden bg-zinc-100">
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
