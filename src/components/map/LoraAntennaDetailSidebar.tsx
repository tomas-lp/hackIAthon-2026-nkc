"use client";

import { useState } from "react";
import { LoraAntenna } from "@/types/loraAntenna";
import {
  Radio,
  MapPin,
  Navigation,
  Loader2,
  Wifi,
  Activity,
  BatteryCharging,
  AlignLeft,
  Info,
} from "lucide-react";
import { formatDate } from "@/lib/format";
import { MapDetailRow } from "@/components/map/MapDetailRow";
import { MapDetailShell } from "@/components/map/MapDetailShell";

interface LoraAntennaDetailSidebarProps {
  antenna: LoraAntenna | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: () => void;
  isNavigating?: boolean;
}

export function LoraAntennaDetailSidebar({
  antenna,
  isOpen,
  onClose,
  onNavigate,
  isNavigating = false,
}: LoraAntennaDetailSidebarProps) {
  const [isClosing, setIsClosing] = useState(!isOpen);
  const [activeAntenna, setActiveAntenna] = useState<LoraAntenna | null>(
    antenna
  );
  const [prevAntenna, setPrevAntenna] = useState<LoraAntenna | null>(antenna);

  if (antenna !== prevAntenna) {
    setPrevAntenna(antenna);
    if (antenna) {
      setActiveAntenna(antenna);
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

  if (!activeAntenna) return null;

  const displayAddress =
    activeAntenna.direccion ||
    `${activeAntenna.localidad || "Corrientes"}, ${activeAntenna.departamento || "Capital"}`;

  const tipoLabel =
    activeAntenna.tipo === "GATEWAY"
      ? "Gateway LoRaWAN Maestro"
      : activeAntenna.tipo === "REPETIDOR"
        ? "Nodo Repetidor de Malla (Mesh)"
        : "Estación LoRa Base";

  const actionFooter = onNavigate ? (
    <div className="flex w-full gap-2">
      <button
        type="button"
        onClick={onNavigate}
        disabled={isNavigating}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white border border-transparent dark:bg-indigo-600 dark:hover:bg-indigo-500 dark:active:bg-indigo-700 px-3 py-2.5 text-xs font-bold transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer shadow-sm"
      >
        {isNavigating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Navigation className="h-4 w-4" />
        )}
        {isNavigating ? "Calculando ruta segura…" : "Cómo llegar (Ruta Segura)"}
      </button>
    </div>
  ) : undefined;

  return (
    <MapDetailShell
      title="Nodo de Red de Emergencia"
      isOpen={isOpen}
      isClosing={isClosing}
      onClose={handleClose}
      footer={actionFooter}
      headerExtra={
        <span className="flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-800/60">
          <Radio className="h-3 w-3 animate-pulse" />
          LoRa {activeAntenna.frecuencia}
        </span>
      }
    >
      <div className="flex flex-col gap-1">
        <span className="text-[16px] font-bold leading-snug text-zinc-900 dark:text-white">
          {activeAntenna.nombre}
        </span>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            {activeAntenna.estado === "OPERATIVO"
              ? "En línea • Operativo"
              : activeAntenna.estado}
          </span>
          {activeAntenna.created_at && (
            <span className="text-[10px] font-medium text-zinc-400 dark:text-slate-500">
              • Alta: {formatDate(activeAntenna.created_at)}
            </span>
          )}
        </div>
      </div>

      {/* Banner explicativo de tecnología LoRa */}
      <div className="flex items-start gap-2 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/50 p-2.5 text-[11px] text-indigo-950 dark:text-indigo-200">
        <Info className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" />
        <p className="leading-relaxed">
          Esta estación recibe y propaga reportes de emergencia de ciudadanos
          vía radiofrecuencia LoRa sin depender de antenas 4G ni Internet.
        </p>
      </div>

      <dl className="flex flex-col">
        <MapDetailRow
          icon={<Activity className="h-4 w-4" />}
          label="Tipo de nodo"
        >
          {tipoLabel}
        </MapDetailRow>

        <MapDetailRow
          icon={<Wifi className="h-4 w-4" />}
          label="Frecuencia y Cobertura"
        >
          {activeAntenna.frecuencia} • Radio ~{activeAntenna.coberturaKm} km
        </MapDetailRow>

        <MapDetailRow
          icon={<Radio className="h-4 w-4" />}
          label="Canal de enlace"
        >
          {activeAntenna.canal}
        </MapDetailRow>

        {activeAntenna.bateria && (
          <MapDetailRow
            icon={<BatteryCharging className="h-4 w-4" />}
            label="Alimentación"
          >
            {activeAntenna.bateria}
          </MapDetailRow>
        )}

        <MapDetailRow icon={<MapPin className="h-4 w-4" />} label="Ubicación">
          {displayAddress}
        </MapDetailRow>

        {activeAntenna.descripcion && (
          <MapDetailRow
            icon={<AlignLeft className="h-4 w-4" />}
            label="Detalles del nodo"
          >
            {activeAntenna.descripcion}
          </MapDetailRow>
        )}
      </dl>
    </MapDetailShell>
  );
}
