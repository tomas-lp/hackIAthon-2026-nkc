"use client";

import dynamic from "next/dynamic";
import { Report } from "@/types/report";
import { RegionLista, RegionPersonalizada } from "@/types/region";
import { Loader2 } from "lucide-react";

import { BarriosFeatureCollection } from "@/services/barrioService";

const RegionsMapInternal = dynamic(() => import("./RegionsMapInternal"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-zinc-100">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        <span className="text-sm font-medium text-zinc-500">
          Cargando mapa...
        </span>
      </div>
    </div>
  ),
});

export function RegionsMap({
  reports,
  regiones,
  listas,
  barriosGeoJson,
  activeHeaderTab,
  isDrawing,
  draftPoints,
  onAddDraftPoint,
  onFinishDrawing,
  onCancelDrawing,
  selectedRegionId,
  hideHeatmap,
  showAllBarrios,
}: {
  reports: Report[];
  regiones: RegionPersonalizada[];
  listas?: RegionLista[];
  barriosGeoJson?: BarriosFeatureCollection | null;
  activeHeaderTab?: string;
  isDrawing: boolean;
  draftPoints: [number, number][];
  onAddDraftPoint: (pt: [number, number]) => void;
  onFinishDrawing: () => void;
  onCancelDrawing: () => void;
  selectedRegionId: string | null;
  hideHeatmap?: boolean;
  showAllBarrios?: boolean;
}) {
  return (
    <RegionsMapInternal
      reports={reports}
      regiones={regiones}
      listas={listas}
      barriosGeoJson={barriosGeoJson}
      activeHeaderTab={activeHeaderTab}
      isDrawing={isDrawing}
      draftPoints={draftPoints}
      onAddDraftPoint={onAddDraftPoint}
      onFinishDrawing={onFinishDrawing}
      onCancelDrawing={onCancelDrawing}
      selectedRegionId={selectedRegionId}
      hideHeatmap={hideHeatmap}
      showAllBarrios={showAllBarrios}
    />
  );
}
