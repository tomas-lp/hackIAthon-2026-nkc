"use client";

import { useEffect, useState } from "react";
import { Report } from "@/types/report";
import { formatDate, formatLocationAddress } from "@/lib/format";
import { TYPE_CONFIG } from "@/lib/constants";
import { resolveAddress } from "@/lib/geocode";
import { ageMultiplier } from "@/lib/zones";
import { X, MapPin, Loader2, AlignLeft, Mic } from "lucide-react";

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
    <div className="relative aspect-square w-full rounded-xl bg-zinc-100 dark:bg-[#0b101d] border border-zinc-200 dark:border-[#2b395b] overflow-hidden">
      {imgLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-sm text-zinc-500 dark:text-slate-400 gap-2 bg-zinc-50 dark:bg-[#0b101d] animate-pulse">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-400 dark:text-slate-500" />
          <span className="text-xs font-medium text-zinc-400 dark:text-slate-500">
            Cargando foto...
          </span>
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={fotoUrl}
        alt="Foto del reporte"
        className={`w-full h-full object-cover transition-opacity duration-300 ${imgLoading ? "opacity-0" : "opacity-100"}`}
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
    <aside
      className={`absolute right-4 top-28 z-[1000] w-80 max-w-80 rounded-2xl border border-gray-200 dark:border-[#2b395b] bg-white/50 dark:bg-[#0b101d]/80 backdrop-blur-xs p-2.5 transition-all duration-300 ease-in-out ${
        isClosing || !isOpen
          ? "translate-x-[120%] opacity-0 pointer-events-none"
          : "translate-x-0 opacity-100"
      }`}
    >
      <div className="flex items-center justify-between mb-2 px-1.5 pt-1">
        <span className="text-sm font-semibold text-zinc-800 dark:text-slate-100 tracking-tight">
          Detalle de Alerta
        </span>
        <button
          onClick={handleClose}
          className="rounded-full p-1.5 text-zinc-500 dark:text-slate-400 transition-colors hover:bg-zinc-200/50 dark:hover:bg-[#1e2a4a] hover:text-zinc-800 dark:hover:text-white cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col rounded-[14px] border border-gray-200 dark:border-[#2b395b] bg-white dark:bg-[#161f36] p-3.5 gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[15px] font-bold text-zinc-900 dark:text-slate-100 leading-snug">
              {typeCfg.label}
            </span>
            <span className="text-xs font-medium text-zinc-400 dark:text-slate-500">
              {formatDate(activeReport.fecha)}
            </span>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowScoreBreakdown(!showScoreBreakdown)}
              className="rounded-full bg-blue-50 dark:bg-blue-900/40 px-2.5 py-1 text-[11px] font-bold text-blue-600 dark:text-blue-300 w-fit text-nowrap ring-1 ring-blue-500/20 transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/60 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              title="Ver desglose del puntaje"
            >
              {activeReport.puntajeBase} pts
            </button>
          )}
        </div>

        {isAdmin && showScoreBreakdown && (
          <div className="flex flex-col gap-1.5 p-2.5 bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/60 rounded-xl text-xs animate-in fade-in slide-in-from-top-2 duration-200">
            <span className="font-semibold text-blue-800 dark:text-blue-200">
              Detalle del puntaje:
            </span>
            <span className="text-blue-700 dark:text-blue-300 leading-relaxed font-medium">
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

        <div className="flex items-start gap-2.5 text-xs p-3 bg-zinc-50 dark:bg-[#0b101d] border border-zinc-100 dark:border-[#2b395b] rounded-xl">
          <MapPin className="h-4 w-4 text-zinc-400 dark:text-slate-500 mt-0.5 shrink-0" />
          <span className="font-medium text-zinc-600 dark:text-slate-300 leading-relaxed">
            {formatLocationAddress(activeReport) ??
              address ??
              activeReport.localidad ??
              `Lat ${activeReport.latitud.toFixed(4)}, Lng ${activeReport.longitud.toFixed(4)}`}
          </span>
        </div>

        {activeReport.descripcion && (
          <div className="flex items-start gap-2.5 text-xs px-1">
            {activeReport.es_audio ? (
              <Mic className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
            ) : (
              <AlignLeft className="h-4 w-4 text-zinc-400 dark:text-slate-500 mt-0.5 shrink-0" />
            )}
            <span className="font-medium text-zinc-600 dark:text-slate-300 leading-relaxed italic">
              &quot;{activeReport.descripcion}&quot;
            </span>
          </div>
        )}

        <ReportPhoto
          key={activeReport.fotoUrl}
          fotoUrl={activeReport.fotoUrl}
        />
      </div>
    </aside>
  );
}
