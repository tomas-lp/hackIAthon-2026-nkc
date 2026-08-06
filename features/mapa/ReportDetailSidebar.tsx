"use client";

import { useEffect, useState } from "react";
import { Report } from "@/types/report";
import { formatDate, TYPE_CONFIG } from "@/lib/utils";
import { resolveAddress } from "@/lib/geocode";
import { X, MapPin } from "lucide-react";

interface ReportDetailSidebarProps {
  report: Report;
  onClose: () => void;
}

const mapCriticidad = {
  CRITICO: { label: "Crítico", color: "bg-red-500" },
  ALTO: { label: "Grave", color: "bg-orange-400" },
  MEDIO: { label: "Moderado", color: "bg-yellow-500" },
  BAJO: { label: "Leve", color: "bg-green-500" },
};

export function ReportDetailSidebar({
  report,
  onClose,
}: ReportDetailSidebarProps) {
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    resolveAddress(report.latitud, report.longitud)
      .then((resolved) => {
        if (!isCancelled) setAddress(resolved);
      })
      .catch(() => {
        if (!isCancelled) setAddress("Ubicación no disponible");
      });

    return () => {
      isCancelled = true;
    };
  }, [report.latitud, report.longitud]);

  const typeCfg = TYPE_CONFIG[report.tipo];

  return (
    <aside className="absolute right-4 top-4 z-100 w-80 max-w-80 rounded-2xl border border-gray-200 bg-white/50 p-3 backdrop-blur-xs">
      <div className="flex items-center justify-between">
        <span className="text-md font-medium text-black">
          Detalle de Alerta
        </span>
        <button
          onClick={onClose}
          className="rounded-full p-1 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex flex-col rounded-2xl border border-gray-200 bg-white p-3 gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-zinc-900">
              {typeCfg.label}
            </span>
            <span className="text-xs font-medium text-black/50">
              {formatDate(report.fecha)}
            </span>
          </div>
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600 w-fit text-nowrap">
            {report.puntajeBase} pts
          </span>
        </div>

        <div className="aspect-square w-full rounded-xl bg-gray-300" />

        <div className="flex items-center gap-2 text-xs p-2 border border-gray-200 rounded-2xl">
          <MapPin className="h-6 w-6 text-black/90" />
          <span className="font-medium leading-snug text-black/90">
            {address ??
              report.localidad ??
              `Lat ${report.latitud.toFixed(4)}, Lng ${report.longitud.toFixed(4)}`}
          </span>
        </div>
      </div>
    </aside>
  );
}
