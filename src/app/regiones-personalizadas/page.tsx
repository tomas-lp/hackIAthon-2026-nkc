import { reportService } from "@/services/reportService";
import { regionService } from "@/services/regionService";
import { RegionsDashboard } from "@/features/regiones/RegionsDashboard";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RegionesPersonalizadasPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Si no esta logueado, redirigir al home
  if (!user) {
    redirect("/");
  }

  // Cargar reportes activos, todos los reportes historicos y regiones
  const [reports, allReports, regiones] = await Promise.all([
    reportService.getReports(),
    reportService.getAllReports(),
    regionService.getRegions(),
  ]);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-zinc-100">
      <RegionsDashboard
        initialReports={reports}
        initialAllReports={allReports}
        initialRegiones={regiones}
        user={user}
      />
    </main>
  );
}
