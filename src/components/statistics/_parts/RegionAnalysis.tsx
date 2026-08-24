"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { Report } from "@/types/report";
import { BarriosFeatureCollection } from "@/services/barrioService";
import { RegionLista, RegionPersonalizada } from "@/types/region";
import { isPointInGeoJSONGeometry, isPointInPolygon } from "@/lib/geometry";
import { ChevronDown, Plus } from "lucide-react";

// Importación dinámica del minimapa Leaflet sin SSR
const MinimapInternal = dynamic(
  () => import("./MinimapInternal").then((mod) => mod.MinimapInternal),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-zinc-100 animate-pulse rounded-2xl border border-gray-200" />
    ),
  }
);

interface RegionAnalysisProps {
  reports: Report[];
  barriosGeoJson: BarriosFeatureCollection | null;
  regionLists: RegionLista[];
  customRegions: RegionPersonalizada[];
  selectedZoneFilter: string; // "MAPA_CALOR" | "BARRIOS" | lista_id
  onZoneFilterChange: (filter: string) => void;
}

export function RegionAnalysis({
  reports,
  barriosGeoJson,
  regionLists,
  customRegions,
  selectedZoneFilter,
  onZoneFilterChange,
}: RegionAnalysisProps) {
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        overflowRef.current &&
        !overflowRef.current.contains(e.target as Node)
      ) {
        setIsOverflowOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Máximo 2 listas en vista directa, el resto va al desplegable +
  const MAX_VISIBLE_LISTS = 2;
  const visibleLists = regionLists.slice(0, MAX_VISIBLE_LISTS);
  const overflowLists = regionLists.slice(MAX_VISIBLE_LISTS);

  // Lista lateral calculada según filtro activo
  const regionAffectedItems = useMemo(() => {
    const totalReportsCount = Math.max(reports.length, 1);

    if (selectedZoneFilter === "MAPA_CALOR") {
      // Si es Mapa de Calor, agrupamos por localidad/tipo o mostramos reclamos recientes
      const grouped: Record<string, number> = {};
      for (const r of reports) {
        const key = r.localidad || r.tipo;
        grouped[key] = (grouped[key] || 0) + 1;
      }
      return Object.entries(grouped)
        .map(([nombre, count]) => ({
          nombre,
          count,
          percentage: Math.round((count / totalReportsCount) * 100),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);
    }

    if (selectedZoneFilter === "BARRIOS") {
      if (!barriosGeoJson || !barriosGeoJson.features) return [];

      return barriosGeoJson.features
        .map((feature) => {
          const nombre = feature.properties.nombre || "Barrio";
          const count = reports.filter((r) =>
            isPointInGeoJSONGeometry([r.latitud, r.longitud], feature.geometry)
          ).length;
          return {
            nombre,
            count,
            percentage: Math.round((count / totalReportsCount) * 100),
          };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);
    }

    // Si es una Lista Personalizada específica
    const listRegions = customRegions.filter(
      (r) => r.lista_id === selectedZoneFilter
    );

    return listRegions
      .map((region) => {
        const count = reports.filter((r) =>
          isPointInPolygon([r.latitud, r.longitud], region.points)
        ).length;
        return {
          nombre: region.nombre,
          count,
          percentage: Math.round((count / totalReportsCount) * 100),
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [reports, barriosGeoJson, customRegions, selectedZoneFilter]);

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-2xs flex flex-col gap-4">
      {/* Encabezado y Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-zinc-900">Análisis por región</h3>

        {/* Botones de Filtro Zona */}
        <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-xl">
          <button
            onClick={() => onZoneFilterChange("MAPA_CALOR")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              selectedZoneFilter === "MAPA_CALOR"
                ? "bg-white text-zinc-900 shadow-2xs"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Mapa de calor
          </button>
          <button
            onClick={() => onZoneFilterChange("BARRIOS")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              selectedZoneFilter === "BARRIOS"
                ? "bg-white text-zinc-900 shadow-2xs"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Barrios
          </button>

          {/* Listas Personalizadas visibles */}
          {visibleLists.map((lista) => (
            <button
              key={lista.id}
              onClick={() => onZoneFilterChange(lista.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                selectedZoneFilter === lista.id
                  ? "bg-white text-zinc-900 shadow-2xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              {lista.nombre}
            </button>
          ))}

          {/* Botón + para desbordamiento de listas */}
          {overflowLists.length > 0 && (
            <div ref={overflowRef} className="relative">
              <button
                onClick={() => setIsOverflowOpen((prev) => !prev)}
                className={`p-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                  overflowLists.some((l) => l.id === selectedZoneFilter)
                    ? "bg-white text-zinc-900 shadow-2xs"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
                title="Más listas"
              >
                <Plus className="w-3.5 h-3.5" />
                <ChevronDown className="w-3 h-3 ml-0.5" />
              </button>

              {isOverflowOpen && (
                <div className="absolute right-0 top-full mt-1.5 z-50 w-44 bg-white rounded-xl border border-gray-200 shadow-lg p-1.5 flex flex-col gap-0.5">
                  {overflowLists.map((lista) => (
                    <button
                      key={lista.id}
                      onClick={() => {
                        onZoneFilterChange(lista.id);
                        setIsOverflowOpen(false);
                      }}
                      className={`text-left px-3 py-2 text-xs rounded-lg font-medium transition cursor-pointer ${
                        selectedZoneFilter === lista.id
                          ? "bg-zinc-100 font-bold text-zinc-900"
                          : "text-zinc-700 hover:bg-zinc-50"
                      }`}
                    >
                      {lista.nombre}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cuerpo: Lista lateral + Minimapa */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 min-h-[380px]">
        {/* Columna Izquierda: Regiones más afectadas */}
        <div className="md:col-span-4 flex flex-col gap-2.5">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Regiones más afectadas:
          </span>

          <div className="flex flex-col gap-2 overflow-y-auto max-h-[340px] pr-1">
            {regionAffectedItems.length > 0 ? (
              regionAffectedItems.map((item, idx) => (
                <div
                  key={`${item.nombre}-${idx}`}
                  className="bg-zinc-50/80 hover:bg-zinc-100 border border-gray-200/80 rounded-xl p-3 flex items-center justify-between transition"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-zinc-900 line-clamp-1">
                      {item.nombre}
                    </span>
                    <span className="text-[11px] font-medium text-zinc-500">
                      {item.count} {item.count === 1 ? "reclamo" : "reclamos"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-gray-200 text-xs font-bold text-zinc-800">
                    {item.percentage}%
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-zinc-400 border border-dashed border-gray-200 rounded-xl">
                No hay datos de afectación para esta zona.
              </div>
            )}
          </div>
        </div>

        {/* Columna Derecha: Minimapa */}
        <div className="md:col-span-8 min-h-[340px]">
          <MinimapInternal
            reports={reports}
            barriosGeoJson={barriosGeoJson}
            customRegions={customRegions}
            selectedZoneFilter={selectedZoneFilter}
          />
        </div>
      </div>
    </div>
  );
}
