"use client";

import { AlertTriangle, X } from "lucide-react";
import { RouteResult } from "@/lib/routing";
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
          className={`absolute top-4 left-1/2 -translate-x-1/2 z-[500] flex items-center justify-between gap-4 rounded-2xl border border-white/50 bg-white/60 backdrop-blur-md px-4 py-2 shadow-lg transition-all duration-300 ease-out ${
            isClosingRoute
              ? "-translate-y-28 opacity-0 pointer-events-none"
              : "translate-y-0 opacity-100"
          }`}
          style={{ maxWidth: "calc(100vw - 2rem)" }}
        >
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-zinc-800 text-nowrap">
              Ruta a {displayRoute.zone.nombre}
            </span>
            <span className="text-[11px] text-zinc-500 text-nowrap">
              Distancia: {(displayRoute.distanceM / 1000).toFixed(1)} km ·
              Riesgo:{" "}
              {displayRoute.riskScore < 1
                ? "bajo"
                : displayRoute.riskScore < 3
                  ? "medio"
                  : "alto"}
            </span>
          </div>
          <button
            onClick={onCancel}
            title="Cancelar ruta"
            className="rounded-full p-1 text-zinc-400 transition-colors hover:bg-zinc-200/50 hover:text-zinc-700 cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {routingState.status === "error" && routingState.error && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-3 rounded-2xl border border-red-200 bg-white/90 backdrop-blur-md px-4 py-2.5 shadow-xl"
          style={{ maxWidth: "calc(100vw - 2rem)" }}
        >
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
          <span className="text-xs font-medium text-red-700">
            {routingState.error}
          </span>
          <button
            onClick={onClearError}
            title="Cerrar"
            className="ml-1 rounded-full p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  );
}
