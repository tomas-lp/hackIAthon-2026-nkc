"use client";

import { useEffect, useState } from "react";
import { Report } from "@/types/report";
import { formatDate, TYPE_CONFIG } from "@/lib/utils";
import { heatColor } from "@/lib/heatmap";
import { resolveAddress } from "@/lib/geocode";

interface ReportPopupProps {
  report: Report;
  fetchAddress: boolean;
}

export function ReportPopup({ report, fetchAddress }: ReportPopupProps) {
  const [address, setAddress] = useState<string | null>(null);
  const [prevParams, setPrevParams] = useState({
    lat: report.latitud,
    lng: report.longitud,
    fetch: fetchAddress,
  });

  if (
    prevParams.lat !== report.latitud ||
    prevParams.lng !== report.longitud ||
    prevParams.fetch !== fetchAddress
  ) {
    setPrevParams({
      lat: report.latitud,
      lng: report.longitud,
      fetch: fetchAddress,
    });
    setAddress(null);
  }

  useEffect(() => {
    if (!fetchAddress) {
      return;
    }

    let isCancelled = false;

    resolveAddress(report.latitud, report.longitud)
      .then((resolved) => {
        if (!isCancelled) {
          setAddress(resolved);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setAddress("Ubicación no disponible");
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [report.latitud, report.longitud, fetchAddress]);

  const typeCfg = TYPE_CONFIG[report.tipo];
  const badgeColor = heatColor(report.puntajeReal ?? report.puntajeBase);

  return (
    <div className="p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-[9px] uppercase tracking-[0.2em] text-zinc-400">
            Reporte
          </p>
          <p className="text-[11px] font-semibold leading-tight text-zinc-900">
            {typeCfg.label}
          </p>
        </div>
        <span
          className="inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold text-white"
          style={{ backgroundColor: badgeColor }}
        >
          {report.puntajeBase} pts
        </span>
      </div>

      <div className="space-y-1.5 text-[10px]">
        <div className="flex items-start justify-between gap-2 rounded-md bg-zinc-50 px-2 py-1">
          <span className="uppercase tracking-[0.16em] text-zinc-500">
            Ubicación
          </span>
          <span className="max-w-45 text-right font-medium leading-snug text-zinc-700">
            {address ??
              report.localidad ??
              `Lat ${report.latitud.toFixed(4)}, Lng ${report.longitud.toFixed(4)}`}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 rounded-md bg-zinc-50 px-2 py-1">
          <span className="uppercase tracking-[0.16em] text-zinc-500">
            Fecha
          </span>
          <span className="font-medium text-zinc-700">
            {formatDate(report.fecha)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 rounded-md bg-zinc-50 px-2 py-1">
          <span className="uppercase tracking-[0.16em] text-zinc-500">
            Evidencia
          </span>
          <span className="font-medium text-zinc-700">
            {report.puntajeDescripcion} desc + {report.puntajeFoto} foto +{" "}
            {report.puntajeClima} clima
          </span>
        </div>

        {report.puntajeReal !== null && (
          <div className="flex items-center justify-between gap-2 rounded-md bg-zinc-50 px-2 py-1">
            <span className="uppercase tracking-[0.16em] text-zinc-500">
              Puntaje actual
            </span>
            <span className="font-medium text-zinc-700">
              {report.puntajeReal} pts
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
