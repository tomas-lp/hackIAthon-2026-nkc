import { reportService } from "@/services/reportService";
import { regionService } from "@/services/regionService";
import { RegionsDashboard } from "@/features/regiones/RegionsDashboard";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RegionesPersonalizadasPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Si no esta logueado, redirigir al home o mostrar algo
  if (!user) {
    redirect("/");
  }

  // Cargar datos asincronamente
  const [reports, regiones] = await Promise.all([
    reportService.getReports(),
    regionService.getRegions()
  ]);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-zinc-100 ">
      <RegionsDashboard initialReports={reports} initialRegiones={regiones} user={user} />
    </main>
  );
}
