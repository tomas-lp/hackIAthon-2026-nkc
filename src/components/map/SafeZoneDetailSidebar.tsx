"use client";

import { SafeZone, SafeZoneType } from "@/types/safeZone";
import { SAFE_ZONE_TYPE_LABELS } from "@/types/marker";
import {
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
import { formatDate, formatMapLocationAddress } from "@/lib/format";
import { MapDetailRow } from "@/components/map/MapDetailRow";
import { MapDetailShell } from "@/components/map/MapDetailShell";

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
    if (formatMapLocationAddress(activeSafeZone)) {
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
    formatMapLocationAddress(activeSafeZone) ??
    asyncAddress ??
    `${activeSafeZone.localidad || "Corrientes"}, ${activeSafeZone.departamento || "Capital"}`;

  const tipoLabel =
    typeText ||
    (activeSafeZone.tipo &&
    (activeSafeZone.tipo as SafeZoneType) in SAFE_ZONE_TYPE_LABELS
      ? SAFE_ZONE_TYPE_LABELS[activeSafeZone.tipo as SafeZoneType]
      : activeSafeZone.tipo?.replace("_", " "));

  const actionFooter =
    onEdit || onDelete || onNavigate ? (
      <div className="flex w-full gap-2">
        {/* Modo admin: botones Editar / Eliminar */}
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="flex w-1/2 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-bold text-zinc-700 shadow-2xs transition-all duration-200 hover:bg-gray-50 hover:border-gray-300 active:scale-95 cursor-pointer dark:border-[#2b395b] dark:bg-[#1e2a4a] dark:text-slate-200 dark:hover:bg-[#25355d] dark:hover:border-slate-500"
          >
            <Edit className="h-3.5 w-3.5" />
            Editar
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="flex w-1/2 items-center justify-center gap-1.5 rounded-xl border border-red-200/80 bg-white px-3 py-2.5 text-xs font-bold text-red-600 shadow-2xs transition-all duration-200 hover:bg-red-50/60 hover:border-red-300 active:scale-95 cursor-pointer dark:border-[#f87171]/40 dark:bg-[#1e2a4a] dark:text-[#f87171] dark:hover:bg-[#25355d] dark:hover:border-[#f87171]/70 dark:hover:text-[#fca5a5]"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Eliminar
          </button>
        )}

        {/* Modo usuario: botón Cómo llegar */}
        {onNavigate && (
          <button
            type="button"
            onClick={onNavigate}
            disabled={isNavigating}
            className={`flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold text-white transition-colors active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer shadow-sm ${
              buttonColor === "red"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-[#435bb5] hover:bg-[#364ba0] active:bg-[#2d3e84] border border-transparent dark:bg-[#435ebd] dark:hover:bg-[#4f6cd1] dark:active:bg-[#364ea3] dark:border-[#5270d8] dark:text-white"
            }`}
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
    ) : undefined;

  return (
    <MapDetailShell
      title={categoryTitle}
      isOpen={isOpen}
      isClosing={isClosing}
      onClose={handleClose}
      footer={actionFooter}
      headerExtra={
        typeBadge ? (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 border border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800/60">
            {typeBadge}
          </span>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-1">
        <span className="text-[16px] font-bold leading-snug text-zinc-900 dark:text-white">
          {activeSafeZone.nombre}
        </span>
        <span className="text-[10px] font-medium text-zinc-400 dark:text-slate-500">
          Creado: {formatDate(activeSafeZone.created_at)}
        </span>
      </div>

      <dl className="flex flex-col">
        {tipoLabel && (
          <MapDetailRow icon={<Building2 className="h-4 w-4" />} label="Tipo">
            {tipoLabel}
          </MapDetailRow>
        )}

        {activeSafeZone.capacidad_maxima !== null &&
          activeSafeZone.capacidad_maxima !== undefined && (
            <MapDetailRow
              icon={<Users className="h-4 w-4" />}
              label="Capacidad máxima"
            >
              {activeSafeZone.capacidad_maxima} personas
            </MapDetailRow>
          )}

        <MapDetailRow icon={<MapPin className="h-4 w-4" />} label="Ubicación">
          {displayAddress}
        </MapDetailRow>

        {activeSafeZone.descripcion && (
          <MapDetailRow
            icon={<AlignLeft className="h-4 w-4" />}
            label="Descripción"
          >
            {activeSafeZone.descripcion}
          </MapDetailRow>
        )}
      </dl>
    </MapDetailShell>
  );
}
