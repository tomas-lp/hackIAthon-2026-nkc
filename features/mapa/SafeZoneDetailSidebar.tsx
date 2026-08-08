"use client";

import { SafeZone } from "@/types/safeZone";
import { X, MapPin, AlignLeft, ShieldCheck, Edit, Trash2 } from "lucide-react";
import { resolveAddress } from "@/lib/geocode";
import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";

interface SafeZoneDetailSidebarProps {
  safeZone: SafeZone;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function SafeZoneDetailSidebar({
  safeZone,
  onClose,
  onEdit,
  onDelete,
}: SafeZoneDetailSidebarProps) {
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    resolveAddress(safeZone.latitud, safeZone.longitud)
      .then((resolved) => {
        if (!isCancelled) setAddress(resolved);
      })
      .catch(() => {
        if (!isCancelled) setAddress("Ubicación no disponible");
      });

    return () => {
      isCancelled = true;
    };
  }, [safeZone.latitud, safeZone.longitud]);

  return (
    <aside className="absolute right-4 top-28 z-[1000] w-80 max-w-80 rounded-2xl border border-gray-200 bg-white/50 p-2.5 backdrop-blur-xs animate-in slide-in-from-right-4 duration-200">
      <div className="flex items-center justify-between mb-2 px-1.5 pt-1">
        <span className="text-sm font-semibold text-zinc-800 tracking-tight flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          Zona Segura
        </span>
        <button
          onClick={onClose}
          className="rounded-full p-1.5 text-zinc-500 transition-colors hover:bg-zinc-200/50 hover:text-zinc-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col rounded-[14px] border border-gray-200 bg-white p-3.5 gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[16px] font-bold text-zinc-900 leading-snug">
            {safeZone.nombre}
          </span>
          <span className="text-[10px] font-medium text-zinc-400">
            Creado: {formatDate(safeZone.created_at)}
          </span>
        </div>

        <div className="flex items-start gap-2.5 text-xs p-3 bg-zinc-50 border border-zinc-100 rounded-xl">
          <MapPin className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
          <span className="font-medium text-zinc-600 leading-relaxed">
            {address ??
              `Lat ${safeZone.latitud.toFixed(4)}, Lng ${safeZone.longitud.toFixed(4)}`}
          </span>
        </div>

        {safeZone.descripcion && (
          <div className="flex items-start gap-2.5 text-xs px-1">
            <AlignLeft className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
            <span className="font-medium text-zinc-600 leading-relaxed italic">
              &quot;{safeZone.descripcion}&quot;
            </span>
          </div>
        )}

        <div className="mt-2 flex gap-2">
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
        </div>
      </div>
    </aside>
  );
}
