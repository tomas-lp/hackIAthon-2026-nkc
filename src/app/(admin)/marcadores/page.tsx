import { reportService } from "@/services/reportService";
import { safeZoneService } from "@/services/safeZoneService";
import { healthCenterService } from "@/services/healthCenterService";
import { barrioService } from "@/services/barrioService";
import { regionService } from "@/services/regionService";
import { MarcadoresDashboard } from "@/components/markers/MarcadoresDashboard";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/supabase/auth";
import { redirect } from "next/navigation";

export default async function MarcadoresPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const user = await getCurrentUser();

  // Si no está logueado, redirigir al home
  if (!user) {
    redirect("/");
  }

  // Cargar centros de evacuación, centros de salud, reportes, barrios y regiones
  const [
    safeZones,
    healthCenters,
    reports,
    barriosGeoJson,
    regionLists,
    customRegions,
  ] = await Promise.all([
    safeZoneService.getSafeZones(),
    healthCenterService.getHealthCenters(),
    reportService.getReports(),
    barrioService.getBarriosGeoJson(),
    regionService.getLists(supabase),
    regionService.getRegions(supabase),
  ]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-100">
      <MarcadoresDashboard
        initialSafeZones={safeZones}
        initialHealthCenters={healthCenters}
        initialReports={reports}
        initialBarriosGeoJson={barriosGeoJson}
        initialRegionLists={regionLists}
        initialCustomRegions={customRegions}
        user={user}
      />
    </div>
  );
}
