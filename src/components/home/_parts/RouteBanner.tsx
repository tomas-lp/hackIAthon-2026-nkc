"use client";

import { AlertTriangle, Navigation, X } from "lucide-react";
import { RouteResult } from "@/lib/routing";
import { buildGoogleMapsNavigationUrl } from "@/lib/googleMaps";
import { RoutingState } from "@/hooks/useRouting";

interface RouteBannerProps {
  isAdmin: boolean;
  displayRoute: RouteResult | null;
  isClosingRoute: boolean;
  onCancel: () => void;
  routingState: RoutingState;
  onClearError: () => void;
}

export function RouteBanner({
  isAdmin,
  displayRoute,
  isClosingRoute,
  onCancel,
  routingState,
  onClearError,
}: RouteBannerProps) {
  if (isAdmin) return null;

  return (
    <>
      {displayRoute && (
        <div
          className={`absolute top-4 left-1/2 -translate-x-1/2 z-[500] flex items-center justify-between gap-4 rounded-2xl border border-gray-200/80 dark:border-[#2b395b] bg-white/90 dark:bg-[#161f36]/95 backdrop-blur-md px-4 py-2.5 shadow-lg transition-all duration-300 ease-out font-sans ${
            isClosingRoute
              ? "-translate-y-28 opacity-0 pointer-events-none"
              : "translate-y-0 opacity-100"
          }`}
          style={{ maxWidth: "calc(100vw - 2rem)" }}
        >
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-zinc-900 dark:text-white text-nowrap">
              Ruta a {displayRoute.zone.nombre}
            </span>
            <span className="text-[11px] text-zinc-500 dark:text-slate-300 text-nowrap">
              Distancia: {(displayRoute.distanceM / 1000).toFixed(1)} km ·
              Riesgo:{" "}
              {displayRoute.riskScore < 1
                ? "bajo"
                : displayRoute.riskScore < 3
                  ? "medio"
                  : "alto"}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={buildGoogleMapsNavigationUrl(displayRoute)}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir esta ruta en Google Maps con navegación por voz"
              aria-label="Abrir esta ruta en Google Maps con navegación por voz"
              className="flex items-center justify-center gap-1.5 rounded-xl bg-[#435bb5] hover:bg-[#364ba0] active:bg-[#2d3e84] text-white border border-transparent dark:bg-[#435ebd] dark:hover:bg-[#4f6cd1] dark:active:bg-[#364ea3] dark:border-[#5270d8] dark:text-white px-3.5 py-2 text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <Navigation className="h-3.5 w-3.5" />
              Navegar
            </a>
            <button
              onClick={onCancel}
              title="Cancelar ruta"
              className="flex items-center justify-center h-8 w-8 rounded-full border border-gray-200/60 dark:border-[#2b395b] bg-zinc-100/80 dark:bg-[#0b101d] text-zinc-800 hover:text-black dark:text-slate-200 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-[#1e2a4a] transition-all cursor-pointer shrink-0 shadow-2xs"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {routingState.status === "error" && routingState.error && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-3 rounded-2xl border border-red-200 dark:border-red-900/50 bg-white/90 dark:bg-[#161f36]/95 backdrop-blur-md px-4 py-2.5 shadow-xl"
          style={{ maxWidth: "calc(100vw - 2rem)" }}
        >
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
          <span className="text-xs font-medium text-red-700 dark:text-red-400">
            {routingState.error}
          </span>
          <button
            onClick={onClearError}
            title="Cerrar"
            className="ml-1 rounded-full p-1 text-zinc-700 hover:text-black dark:text-slate-300 dark:hover:text-white transition hover:bg-zinc-100 dark:hover:bg-[#1e2a4a] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  );
}
