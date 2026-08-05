import { reportService } from "@/services/reportService";
import { CrisisDashboard } from "@/features/dashboard/CrisisDashboard";

export const dynamic = "force-dynamic";

export default async function CrisisGraphPage() {
  const reports = await reportService.getReports();

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-zinc-100 ">
      <CrisisDashboard initialReports={reports} />

      <div className="pointer-events-none absolute bottom-4 right-4 z-50 rounded-2xl border border-white/80 bg-white/90 p-2 shadow-lg shadow-black/10 sm:bottom-6 sm:right-6">
        <div className="flex flex-col items-center gap-1">
          <img
            src="/qrbot.png"
            alt="QR para el bot de Telegram"
            className="h-24 w-24 rounded-2xl object-cover"
          />
          <span className="text-xs font-semibold text-zinc-700">
            Bot de Telegram
          </span>
        </div>
      </div>
    </main>
  );
}
