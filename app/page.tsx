import { reportService } from "@/services/reportService";
import { CrisisDashboard } from "@/features/dashboard/CrisisDashboard";
import { BotQRWidget } from "@/features/dashboard/BotQRWidget";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default async function CrisisGraphPage() {
  const reports = await reportService.getReports();

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-zinc-100 ">
      <CrisisDashboard initialReports={reports} />

      <BotQRWidget />
    </main>
  );
}
