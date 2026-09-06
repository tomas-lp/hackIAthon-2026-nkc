import { reportService } from "@/services/reportService";
import { barrioService } from "@/services/barrioService";
import { regionService } from "@/services/regionService";
import { RegionsDashboard } from "@/components/regions/RegionsDashboard";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/supabase/auth";
import { redirect } from "next/navigation";

export default async function RegionesPersonalizadasPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const user = await getCurrentUser();

  // Si no esta logueado, redirigir al home
  if (!user) {
    redirect("/");
  }

  // Cargar reportes activos, todos los reportes historicos, regiones y listas
  const [reports, allReports, regiones, listas, barriosGeoJson] =
    await Promise.all([
      reportService.getReports(),
      reportService.getAllReports(),
      regionService.getRegions(supabase),
      regionService.getLists(supabase),
      barrioService.getBarriosGeoJson(),
    ]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-100 dark:bg-[#0b101d]">
      <RegionsDashboard
        initialReports={reports}
        initialAllReports={allReports}
        initialRegiones={regiones}
        initialListas={listas}
        initialBarriosGeoJson={barriosGeoJson}
        user={user}
      />
    </div>
  );
}
