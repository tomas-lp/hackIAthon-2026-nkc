"use client";

import { useEffect, useState } from "react";
import { Report } from "@/types/report";
import { formatDate, formatReportAddress } from "@/lib/format";
import { TYPE_CONFIG } from "@/lib/constants";
import { resolveAddress } from "@/lib/geocode";

export function ReportCard({
  report,
  isSelected,
  onSelect,
  isAdmin,
}: {
  report: Report;
  isSelected: boolean;
  onSelect: (report: Report) => void;
  isAdmin?: boolean;
}) {
  const storedAddress = formatReportAddress(report);
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    if (storedAddress) return; // ya tenemos datos de la BD

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
  }, [report.latitud, report.longitud, storedAddress]);

  const typeLabel = TYPE_CONFIG[report.tipo].label;

  return (
    <button
      onClick={() => onSelect(report)}
      className={`shrink-0 w-full text-left transition overflow-hidden ${
        isSelected
          ? "bg-zinc-50 dark:bg-[#1e2a4a]"
          : "bg-transparent hover:bg-zinc-50/80 dark:hover:bg-[#1e2a4a]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col p-3">
          <span className="text-sm font-medium text-black dark:text-slate-100">
            {typeLabel}
          </span>
          <span
            className="text-xs font-medium text-black/50 dark:text-slate-400"
            suppressHydrationWarning
          >
            {formatDate(report.fecha)}
          </span>
          <span
            className="text-xs font-medium text-black/80 dark:text-slate-300"
            title={storedAddress ?? address ?? report.descripcion}
          >
            {storedAddress ?? address ?? "Dirección no disponible"}
          </span>
        </div>
        {isAdmin && (
          <div className="flex flex-col items-end p-3 gap-1">
            <span className="rounded-full bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-300 w-fit text-nowrap">
              {report.puntajeBase} pts
            </span>
          </div>
        )}
      </div>
    </button>
  );
}
