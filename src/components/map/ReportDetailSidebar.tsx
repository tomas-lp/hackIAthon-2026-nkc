"use client";

import { useEffect, useState } from "react";
import { Report } from "@/types/report";
import { formatDate, formatLocationAddress } from "@/lib/format";
import { TYPE_CONFIG } from "@/lib/constants";
import { resolveAddress } from "@/lib/geocode";
import { ageMultiplier } from "@/lib/zones";
import { MapPin, Loader2, AlignLeft, Mic } from "lucide-react";
import { MapDetailRow } from "@/components/map/MapDetailRow";
import { MapDetailShell } from "@/components/map/MapDetailShell";

interface ReportDetailSidebarProps {
  report: Report | null;
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
}

function ReportPhoto({ fotoUrl }: { fotoUrl?: string | null }) {
  const [imgError, setImgError] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);

  if (!fotoUrl || imgError) {
    return null;
  }

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-[#2b395b] dark:bg-[#0b101d]">
      {imgLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-50 text-sm text-zinc-500 animate-pulse dark:bg-[#0b101d] dark:text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-400 dark:text-slate-500" />
          <span className="text-xs font-medium text-zinc-400 dark:text-slate-500">
            Cargando foto...
          </span>
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={fotoUrl}
        alt="Foto del reporte"
        className={`h-full w-full object-cover transition-opacity duration-300 ${imgLoading ? "opacity-0" : "opacity-100"}`}
        onError={() => setImgError(true)}
        onLoad={() => setImgLoading(false)}
      />
    </div>
  );
}

export function ReportDetailSidebar({
  report,
  isOpen,
  onClose,
  isAdmin,
}: ReportDetailSidebarProps) {
  const [address, setAddress] = useState<string | null>(null);
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);
  const [isClosing, setIsClosing] = useState(!isOpen);
  const [activeReport, setActiveReport] = useState<Report | null>(report);

  useEffect(() => {
    if (report) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveReport(report);
      setIsClosing(false);
    } else {
      setIsClosing(true);
    }
  }, [report, isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 250);
  };

  useEffect(() => {
    let isCancelled = false;

    // Si ya tenemos dirección guardada completa en la BD, no llamamos a Nominatim
    if (activeReport && formatLocationAddress(activeReport)) {
      return;
    }

    if (activeReport?.latitud && activeReport?.longitud) {
      resolveAddress(activeReport.latitud, activeReport.longitud)
        .then((resolved) => {
          if (!isCancelled) setAddress(resolved);
        })
        .catch(() => {
          if (!isCancelled) setAddress("Ubicación no disponible");
        });
    }

    return () => {
      isCancelled = true;
    };
  }, [activeReport]);

  if (!activeReport) return null;

  const typeCfg = TYPE_CONFIG[activeReport.tipo];

  return (
    <MapDetailShell
      title="Detalle de Alerta"
      isOpen={isOpen}
      isClosing={isClosing}
      onClose={handleClose}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[15px] font-bold leading-snug text-zinc-900 dark:text-slate-100">
            {typeCfg.label}
          </span>
          <span className="text-xs font-medium text-zinc-400 dark:text-slate-500">
            {formatDate(activeReport.fecha)}
          </span>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowScoreBreakdown(!showScoreBreakdown)}
            className="w-fit shrink-0 text-nowrap rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-600 ring-1 ring-blue-500/20 transition-colors hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/60"
            title="Ver desglose del puntaje"
          >
            {activeReport.puntajeBase} pts
          </button>
        )}
      </div>

      {isAdmin && showScoreBreakdown && (
        <div className="flex flex-col gap-1 border-l-2 border-blue-400/70 py-1 pl-3 text-xs animate-in fade-in slide-in-from-top-2 duration-200">
          <span className="font-semibold text-blue-800 dark:text-blue-200">
            Detalle del puntaje
          </span>
          <span className="font-medium leading-relaxed text-blue-700 dark:text-blue-300">
            Puntaje actual: {activeReport.puntajeClima} (Clima) +{" "}
            {activeReport.puntajeDescripcion} (Descripción) +{" "}
            {activeReport.puntajeFoto} (Foto válida) *{" "}
            {(() => {
              const horas =
                (new Date().getTime() -
                  new Date(activeReport.fecha).getTime()) /
                3600000;
              return ageMultiplier(horas) ?? 0;
            })()}{" "}
            (Antigüedad)
          </span>
        </div>
      )}

      <dl className="flex flex-col">
        <MapDetailRow icon={<MapPin className="h-4 w-4" />} label="Ubicación">
          {formatLocationAddress(activeReport) ??
            address ??
            activeReport.localidad ??
            `Lat ${activeReport.latitud.toFixed(4)}, Lng ${activeReport.longitud.toFixed(4)}`}
        </MapDetailRow>

        {activeReport.descripcion && (
          <MapDetailRow
            icon={
              activeReport.es_audio ? (
                <Mic className="h-4 w-4 text-blue-400" />
              ) : (
                <AlignLeft className="h-4 w-4" />
              )
            }
            label="Descripción"
          >
            <span className="italic">
              &quot;{activeReport.descripcion}&quot;
            </span>
          </MapDetailRow>
        )}
      </dl>

      <ReportPhoto key={activeReport.fotoUrl} fotoUrl={activeReport.fotoUrl} />
    </MapDetailShell>
  );
}
