import { reportService } from "@/services/reportService";
import { CrisisDashboard } from "@/features/dashboard/CrisisDashboard";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default async function CrisisGraphPage() {
  const reports = await reportService.getReports();

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-zinc-100 ">
      <CrisisDashboard initialReports={reports} />

      <div className="pointer-events-none absolute bottom-4 right-4 z-50 rounded-2xl backdrop-blur-xs border border-gray-200 bg-white/50 p-2">
        <div className="flex flex-col items-center gap-1">
          <Image
            src="/qrbot.png"
            alt="QR para el bot de Telegram"
            width={96}
            height={96}
          />
          <span className="text-xs font-semibold text-black/90">
            Bot de Telegram
          </span>
        </div>
      </div>
    </main>
  );
}
