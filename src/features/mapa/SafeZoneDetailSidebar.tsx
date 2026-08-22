"use client";

import { SafeZone } from "@/types/safeZone";
import {
  X,
  MapPin,
  AlignLeft,
  Edit,
  Trash2,
  Navigation,
  Loader2,
  Building2,
} from "lucide-react";
import { resolveAddress } from "@/lib/geocode";
import { useEffect, useState } from "react";
import { formatDate } from "@/lib/format";

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

    if (!activeSafeZone) {
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

  const isDescSameAsName =
    activeSafeZone.descripcion &&
    activeSafeZone.nombre &&
    activeSafeZone.descripcion.trim().toLowerCase() ===
      activeSafeZone.nombre.trim().toLowerCase();

  const displayAddress =
    asyncAddress ||
    (!isDescSameAsName && activeSafeZone.descripcion) ||
    `Lat ${activeSafeZone.latitud.toFixed(4)}, Lng ${activeSafeZone.longitud.toFixed(4)}`;

  const showDescription =
    !typeText &&
    activeSafeZone.descripcion &&
    activeSafeZone.descripcion !== displayAddress &&
    !isDescSameAsName;

  return (
    <aside
      className={`absolute right-4 top-28 z-[1000] w-80 max-w-80 rounded-2xl border border-gray-200 bg-white/50 backdrop-blur-xs p-2.5 transition-all duration-300 ease-in-out ${
        isClosing || !isOpen
          ? "translate-x-[120%] opacity-0 pointer-events-none"
          : "translate-x-0 opacity-100"
      }`}
    >
      <div className="flex items-center justify-between mb-2 px-1.5 pt-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-zinc-800 tracking-tight">
            {categoryTitle}
          </span>
          {typeBadge && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 border border-red-200">
              {typeBadge}
            </span>
          )}
        </div>
        <button
          onClick={handleClose}
          className="rounded-full p-1.5 text-zinc-500 transition-colors hover:bg-zinc-200/50 hover:text-zinc-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col rounded-[14px] border border-gray-200 bg-white p-3.5 gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[16px] font-bold text-zinc-900 leading-snug">
            {activeSafeZone.nombre}
          </span>
          <span className="text-[10px] font-medium text-zinc-400">
            Creado: {formatDate(activeSafeZone.created_at)}
          </span>
        </div>

        {typeText && (
          <div className="flex items-center gap-2.5 text-xs p-3 bg-zinc-50 border border-zinc-100 rounded-xl">
            <Building2 className="h-4 w-4 text-zinc-400 shrink-0" />
            <span className="font-medium text-zinc-600 leading-relaxed">
              Tipo: {typeText}
            </span>
          </div>
        )}

        <div className="flex items-start gap-2.5 text-xs p-3 bg-zinc-50 border border-zinc-100 rounded-xl">
          <MapPin className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
          <span className="font-medium text-zinc-600 leading-relaxed">
            {displayAddress}
          </span>
        </div>

        {showDescription && (
          <div className="flex items-start gap-2.5 text-xs px-1">
            <AlignLeft className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
            <span className="font-medium text-zinc-600 leading-relaxed italic">
              &quot;{activeSafeZone.descripcion}&quot;
            </span>
          </div>
        )}

        <div className="mt-2 flex gap-2">
          {/* Modo admin: botones Editar / Eliminar */}
          {onEdit && (
            <button
              onClick={onEdit}
              className="flex w-1/2 items-center justify-center gap-1.5 rounded-xl bg-zinc-100 px-3 py-2.5 text-xs font-bold text-zinc-700 transition-colors hover:bg-zinc-200"
            >
              <Edit className="h-3.5 w-3.5" />
              Editar
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="flex w-1/2 items-center justify-center gap-1.5 rounded-xl bg-red-50 px-3 py-2.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-100 hover:text-red-700"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Eliminar
            </button>
          )}

          {/* Modo usuario: botón Cómo llegar */}
          {onNavigate && (
            <button
              onClick={onNavigate}
              disabled={isNavigating}
              className={`flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold text-white transition-colors active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer shadow-sm ${
                buttonColor === "red"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-blue-500 hover:bg-blue-600"
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
      </div>
    </aside>
  );
}
