"use client";

import { SafeZone, SafeZoneType } from "@/types/safeZone";
import { SAFE_ZONE_TYPE_LABELS } from "@/types/marker";
import {
  X,
  MapPin,
  AlignLeft,
  Edit,
  Trash2,
  Navigation,
  Loader2,
  Building2,
  Users,
} from "lucide-react";
import { resolveAddress } from "@/lib/geocode";
import { useEffect, useState } from "react";
import { formatDate, formatLocationAddress } from "@/lib/format";

interface SafeZoneDetailSidebarProps {
  safeZone: SafeZone | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  /** Si se provee (modo usuario), muestra el botón "Cómo llegar" en vez de Editar/Eliminar */
  onNavigate?: () => void;
  /** true mientras se está calculando una ruta hacia este centro */
  isNavigating?: boolean;
  categoryTitle?: string;
  typeBadge?: string;
  typeText?: string;
  buttonColor?: "blue" | "red";
}

export function SafeZoneDetailSidebar({
  safeZone,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onNavigate,
  isNavigating = false,
  categoryTitle = "Centro de evacuación",
  typeBadge,
  typeText,
  buttonColor = "blue",
}: SafeZoneDetailSidebarProps) {
  const [asyncAddress, setAsyncAddress] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(!isOpen);
  const [activeSafeZone, setActiveSafeZone] = useState<SafeZone | null>(
    safeZone
  );
  const [prevSafeZone, setPrevSafeZone] = useState<SafeZone | null>(safeZone);

  if (safeZone !== prevSafeZone) {
    setPrevSafeZone(safeZone);
    if (safeZone) {
      setActiveSafeZone(safeZone);
      setIsClosing(false);
    } else {
      setIsClosing(true);
    }
  }

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 250);
  };

  useEffect(() => {
    let isCancelled = false;

    if (!activeSafeZone) return;

    // Si ya tenemos dirección completa desde la BD, no llamamos a Nominatim
    if (formatLocationAddress(activeSafeZone)) {
      return;
    }

    if (activeSafeZone.latitud && activeSafeZone.longitud) {
      resolveAddress(activeSafeZone.latitud, activeSafeZone.longitud)
        .then((resolved) => {
          if (!isCancelled && resolved) setAsyncAddress(resolved);
        })
        .catch(() => {
          if (!isCancelled) setAsyncAddress(null);
        });
    }

    return () => {
      isCancelled = true;
    };
  }, [activeSafeZone]);

  if (!activeSafeZone) return null;

  const displayAddress =
    formatLocationAddress(activeSafeZone) ??
    asyncAddress ??
    `${activeSafeZone.localidad || "Corrientes"}, ${activeSafeZone.departamento || "Capital"}`;

  const tipoLabel =
    typeText ||
    (activeSafeZone.tipo &&
    (activeSafeZone.tipo as SafeZoneType) in SAFE_ZONE_TYPE_LABELS
      ? SAFE_ZONE_TYPE_LABELS[activeSafeZone.tipo as SafeZoneType]
      : activeSafeZone.tipo?.replace("_", " "));

  return (
    <aside
      className={`absolute right-4 top-28 z-[1000] w-80 max-w-80 rounded-2xl border border-gray-200 dark:border-[#2b395b] bg-white/50 dark:bg-[#0b101d]/80 backdrop-blur-xs p-2.5 transition-all duration-300 ease-in-out ${
        isClosing || !isOpen
          ? "translate-x-[120%] opacity-0 pointer-events-none"
          : "translate-x-0 opacity-100"
      }`}
    >
      <div className="flex items-center justify-between mb-2 px-1.5 pt-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-zinc-800 dark:text-white tracking-tight">
            {categoryTitle}
          </span>
          {typeBadge && (
            <span className="rounded-full bg-red-100 dark:bg-red-900/40 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60">
              {typeBadge}
            </span>
          )}
        </div>
        <button
          onClick={handleClose}
          className="rounded-full p-1.5 text-zinc-500 dark:text-slate-400 transition-colors hover:bg-zinc-200/50 dark:hover:bg-[#1e2a4a] hover:text-zinc-800 dark:hover:text-white cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col rounded-[14px] border border-gray-200 dark:border-[#2b395b] bg-white dark:bg-[#161f36] p-3.5 gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[16px] font-bold text-zinc-900 dark:text-white leading-snug">
            {activeSafeZone.nombre}
          </span>
          <span className="text-[10px] font-medium text-zinc-400 dark:text-slate-500">
            Creado: {formatDate(activeSafeZone.created_at)}
          </span>
        </div>

        {tipoLabel && (
          <div className="flex items-center gap-2.5 text-xs p-3 bg-zinc-50 dark:bg-[#0b101d] border border-zinc-100 dark:border-[#2b395b] rounded-xl">
            <Building2 className="h-4 w-4 text-zinc-400 dark:text-slate-500 shrink-0" />
            <span className="font-medium text-zinc-700 dark:text-slate-300 leading-relaxed">
              Tipo: {tipoLabel}
            </span>
          </div>
        )}

        {activeSafeZone.capacidad_maxima !== null &&
          activeSafeZone.capacidad_maxima !== undefined && (
            <div className="flex items-center gap-2.5 text-xs p-3 bg-zinc-50 dark:bg-[#0b101d] border border-zinc-100 dark:border-[#2b395b] rounded-xl">
              <Users className="h-4 w-4 text-zinc-400 dark:text-slate-500 shrink-0" />
              <span className="font-medium text-zinc-700 dark:text-slate-300 leading-relaxed">
                Capacidad máxima: {activeSafeZone.capacidad_maxima} personas
              </span>
            </div>
          )}

        <div className="flex items-start gap-2.5 text-xs p-3 bg-zinc-50 dark:bg-[#0b101d] border border-zinc-100 dark:border-[#2b395b] rounded-xl">
          <MapPin className="h-4 w-4 text-zinc-400 dark:text-slate-500 mt-0.5 shrink-0" />
          <span className="font-medium text-zinc-700 dark:text-slate-300 leading-relaxed">
            {displayAddress}
          </span>
        </div>

        {activeSafeZone.descripcion && (
          <div className="flex items-start gap-2.5 text-xs p-3 bg-zinc-50 dark:bg-[#0b101d] border border-zinc-100 dark:border-[#2b395b] rounded-xl">
            <AlignLeft className="h-4 w-4 text-zinc-400 dark:text-slate-500 mt-0.5 shrink-0" />
            <span className="font-medium text-zinc-600 dark:text-slate-300 leading-relaxed">
              {activeSafeZone.descripcion}
            </span>
          </div>
        )}

        <div className="mt-2 flex gap-2">
          {/* Modo admin: botones Editar / Eliminar */}
          {onDelete && (
            <button
              onClick={onDelete}
              className="flex w-1/2 items-center justify-center gap-1.5 rounded-xl border border-red-200/80 dark:border-[#f87171]/40 bg-white dark:bg-[#1e2a4a] px-3 py-2.5 text-xs font-bold text-red-600 dark:text-[#f87171] shadow-2xs transition-all duration-200 hover:bg-red-50/60 dark:hover:bg-[#25355d] hover:border-red-300 dark:hover:border-[#f87171]/70 dark:hover:text-[#fca5a5] active:scale-95 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Eliminar
            </button>
          )}
          {onEdit && (
            <button
              onClick={onEdit}
              className="flex w-1/2 items-center justify-center gap-1.5 rounded-xl border border-gray-200 dark:border-[#2b395b] bg-white dark:bg-[#1e2a4a] px-3 py-2.5 text-xs font-bold text-zinc-700 dark:text-slate-200 shadow-2xs transition-all duration-200 hover:bg-gray-50 dark:hover:bg-[#25355d] hover:border-gray-300 dark:hover:border-slate-500 active:scale-95 cursor-pointer"
            >
              <Edit className="h-3.5 w-3.5" />
              Editar
            </button>
          )}

          {/* Modo usuario: botón Cómo llegar */}
          {onNavigate && (
            <button
              onClick={onNavigate}
              disabled={isNavigating}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#435bb5] hover:bg-[#364ba0] active:bg-[#2d3e84] text-white border border-transparent dark:bg-[#435ebd] dark:hover:bg-[#4f6cd1] dark:active:bg-[#364ea3] dark:border-[#5270d8] dark:text-white px-3 py-2.5 text-xs font-bold shadow-2xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isNavigating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Navigation className="h-4 w-4" />
              )}
              {isNavigating ? "Calculando…" : "Cómo llegar"}
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
