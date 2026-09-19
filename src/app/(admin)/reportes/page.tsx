import { reportService } from "@/services/reportService";
import { ReportesDashboard } from "@/components/reportes/ReportesDashboard";
import { getCurrentUser } from "@/lib/supabase/auth";
import { redirect } from "next/navigation";

export default async function ReportesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  const reports = await reportService.getAllReports();

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-100 dark:bg-[#0b101d]">
      <ReportesDashboard initialReports={reports} user={user} />
    </div>
  );
}
