"use client";

import dynamic from "next/dynamic";
import { Report } from "@/types/report";
import { Loader2 } from "lucide-react";

interface ReportMapProps {
  reports: Report[];
  selectedReport: Report | null;
  onSelectReport: (report: Report | null) => void;
}

const ReportMapInternal = dynamic(() => import("./ReportMapInternal"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[500px] flex flex-col items-center justify-center bg-zinc-50  border border-zinc-200  rounded-lg text-zinc-400">
      <Loader2 className="w-8 h-8 animate-spin mb-2 text-zinc-400" />
      <span className="text-xs font-mono">Cargando mapa de Corrientes...</span>
    </div>
  ),
});

export function ReportMap(props: ReportMapProps) {
  return <ReportMapInternal {...props} />;
}
