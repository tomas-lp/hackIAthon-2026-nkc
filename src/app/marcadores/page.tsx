import { reportService } from "@/services/reportService";
import { safeZoneService } from "@/services/safeZoneService";
import { healthCenterService } from "@/services/healthCenterService";
import { MarcadoresDashboard } from "@/components/markers/MarcadoresDashboard";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MarcadoresPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Si no está logueado, redirigir al home
  if (!user) {
    redirect("/");
  }

  // Cargar centros de evacuación, centros de salud y reportes iniciales
  const [safeZones, healthCenters, reports] = await Promise.all([
    safeZoneService.getSafeZones(),
    healthCenterService.getHealthCenters(),
    reportService.getReports(),
  ]);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-zinc-100">
      <MarcadoresDashboard
        initialSafeZones={safeZones}
        initialHealthCenters={healthCenters}
        initialReports={reports}
        user={user}
      />
    </main>
  );
}
