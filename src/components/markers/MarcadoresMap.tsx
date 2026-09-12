"use client";

import dynamic from "next/dynamic";
import { MarkerRow } from "@/types/marker";
import { Loader2 } from "lucide-react";

const MarcadoresMapInternal = dynamic(() => import("./MarcadoresMapInternal"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-zinc-100 dark:bg-[#0b101d]">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400 dark:text-sky-400" />
        <span className="text-sm font-medium text-zinc-500 dark:text-slate-400">
          Cargando mapa de marcadores...
        </span>
      </div>
    </div>
  ),
});

interface MarcadoresMapProps {
  markers: MarkerRow[];
  selectedMarker: MarkerRow | null;
  onSelectMarker: (marker: MarkerRow | null) => void;
  isCreating: boolean;
  creatingCategory: "EVACUACION" | "SALUD";
  draftLocation: { lat: number; lng: number } | null;
  onMapClickToCreate: (lat: number, lng: number) => void;
  className?: string;
}

export function MarcadoresMap(props: MarcadoresMapProps) {
  return <MarcadoresMapInternal {...props} />;
}
