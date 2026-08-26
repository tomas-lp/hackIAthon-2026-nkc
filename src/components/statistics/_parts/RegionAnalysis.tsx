"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { Report } from "@/types/report";
import { BarriosFeatureCollection } from "@/services/barrioService";
import { RegionLista, RegionPersonalizada } from "@/types/region";
import { isPointInGeoJSONGeometry, isPointInPolygon } from "@/lib/geometry";
import { Switch } from "@/components/ui/Switch";
import { ArrowUpDown, ChevronDown, Check } from "lucide-react";

// Importación dinámica del minimapa Leaflet sin SSR
const MinimapInternal = dynamic(
  () => import("./MinimapInternal").then((mod) => mod.MinimapInternal),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[420px] bg-zinc-100 animate-pulse rounded-2xl border border-gray-200" />
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [selectedRegionName, setSelectedRegionName] = useState<string | null>(
    null
  );
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleZoneFilterChange = (filter: string) => {
    onZoneFilterChange(filter);
    setSelectedRegionName(null);
  };

  const activeCustomList = useMemo(() => {
    return (
      regionLists.find((l) => l.id === selectedZoneFilter) ||
      regionLists[0] ||
      null
    );
  }, [regionLists, selectedZoneFilter]);

  const hasMultipleLists = regionLists.length >= 2;

  const regionAffectedItems = useMemo(() => {
    const totalReportsCount = Math.max(reports.length, 1);

    if (selectedZoneFilter === "BARRIOS") {
      if (!barriosGeoJson || !barriosGeoJson.features) return [];

      const items = barriosGeoJson.features.map((feature) => {
        const nombre = feature.properties.nombre || "Barrio";
        const count = reports.filter((r) =>
          isPointInGeoJSONGeometry([r.latitud, r.longitud], feature.geometry)
        ).length;
        return {
          id: feature.properties.id || nombre,
          nombre,
          count,
          percentage: Math.round((count / totalReportsCount) * 100),
        };
      });

      return items.sort((a, b) =>
        sortOrder === "desc" ? b.count - a.count : a.count - b.count
      );
    }

    if (selectedZoneFilter === "MAPA_CALOR") {
      return [];
    }

    // Filtro por lista personalizada
    const targetRegions = customRegions.filter(
      (r) => r.lista_id === selectedZoneFilter
    );

    const items = targetRegions.map((region) => {
      const count = reports.filter((r) =>
        isPointInPolygon([r.latitud, r.longitud], region.points)
      ).length;
      return {
        id: region.id,
        nombre: region.nombre,
        count,
        percentage: Math.round((count / totalReportsCount) * 100),
      };
    });

    return items.sort((a, b) =>
      sortOrder === "desc" ? b.count - a.count : a.count - b.count
    );
  }, [reports, barriosGeoJson, customRegions, selectedZoneFilter, sortOrder]);

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-2xs flex flex-col gap-4">
      {/* Encabezado y Selector con Switch (sin separador inferior) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-zinc-900">Análisis por región</h3>

        {/* Interruptor Switch con Mapa de Calor, Barrios y Lista seleccionable */}
        <div ref={dropdownRef} className="relative flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-600">Región:</span>
          <Switch
            value={selectedZoneFilter}
            onValueChange={(val) => {
              handleZoneFilterChange(val);
            }}
          >
            <Switch.Option value="MAPA_CALOR">Mapa de calor</Switch.Option>
            <Switch.Option value="BARRIOS">Barrios</Switch.Option>

            {/* Pestaña de lista personalizada única con dropdown */}
            {activeCustomList && (
              <Switch.Option
                value={activeCustomList.id}
                onClick={() => {
                  if (selectedZoneFilter === activeCustomList.id) {
                    if (hasMultipleLists) {
                      setIsDropdownOpen((prev) => !prev);
                    }
                  } else {
                    handleZoneFilterChange(activeCustomList.id);
                    setIsDropdownOpen(false);
                  }
                }}
              >
                <span className="flex items-center gap-1">
                  <span>{activeCustomList.nombre}</span>
                  {hasMultipleLists && (
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-300 ${
                        isDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  )}
                </span>
              </Switch.Option>
            )}
          </Switch>

          {/* Menú desplegable flotante con las demás listas */}
          {hasMultipleLists && isDropdownOpen && (
            <div className="absolute top-full mt-2 right-0 z-50 flex flex-col rounded-2xl border border-gray-200/60 bg-white/90 backdrop-blur-md shadow-[0_7px_50px_0px_rgb(0,0,0,0.1)] min-w-[170px] overflow-hidden transition-all duration-200 ease-out p-1.5 animate-in fade-in zoom-in-95">
              {regionLists.map((lista) => {
                const isSelected = selectedZoneFilter === lista.id;
                return (
                  <button
                    key={lista.id}
                    type="button"
                    onClick={() => {
                      handleZoneFilterChange(lista.id);
                      setIsDropdownOpen(false);
                    }}
                    className={`flex items-center justify-between rounded-xl px-3.5 py-2 text-xs text-left transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-white font-bold text-zinc-950 shadow-xs"
                        : "text-zinc-700 hover:bg-white/60 hover:text-zinc-950 font-medium"
                    }`}
                  >
                    <span>{lista.nombre}</span>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-zinc-900 ml-2" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cuerpo: Lista lateral + Minimapa con animación de desplazamiento */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch min-h-[420px]">
        {/* Columna Izquierda: Regiones más afectadas (se oculta en Mapa de calor) */}
        {selectedZoneFilter !== "MAPA_CALOR" && (
          <div className="md:col-span-4 flex flex-col gap-2.5 h-[420px] animate-list-slide-left">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-600">
                Regiones más afectadas:
              </span>

              {/* Botón de Ordenamiento (Fondo blanco y recuadro gris) */}
              <button
                onClick={() =>
                  setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))
                }
                className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-700 bg-white border border-gray-200 shadow-2xs hover:bg-zinc-50 px-2.5 py-1 rounded-xl transition cursor-pointer"
                title="Cambiar orden de afectación"
              >
                <ArrowUpDown className="w-3 h-3" />
                <span>
                  {sortOrder === "desc" ? "Mayor afección" : "Menor afección"}
                </span>
              </button>
            </div>

            {/* Lista completa de elementos (con scroll si excede la altura) */}
            <div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-1.5">
              {regionAffectedItems.length > 0 ? (
                regionAffectedItems.map((item, idx) => (
                  <button
                    key={`${item.nombre}-${idx}`}
                    onClick={() =>
                      setSelectedRegionName((prev) =>
                        prev === item.nombre ? null : item.nombre
                      )
                    }
                    className={`text-left rounded-xl p-3 flex items-center justify-between transition cursor-pointer border ${
                      selectedRegionName === item.nombre
                        ? "bg-blue-50/90 border-blue-400 font-bold"
                        : "bg-zinc-50/80 hover:bg-zinc-100 border-gray-200/80"
                    }`}
                    title={`Hacer zoom a ${item.nombre} en el minimapa`}
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-zinc-900 line-clamp-1">
                        {item.nombre}
                      </span>
                      <span className="text-[11px] font-medium text-zinc-500">
                        {item.count} {item.count === 1 ? "reclamo" : "reclamos"}
                      </span>
                    </div>
                    {/* Porcentaje en texto plano sin recuadro */}
                    <span className="text-xs font-bold text-zinc-700">
                      {item.percentage}%
                    </span>
                  </button>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-zinc-400 border border-dashed border-gray-200 rounded-xl">
                  No hay datos de afectación disponibles.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Columna Derecha: Minimapa (12 columnas en Mapa de calor, 8 en Barrios/Listas) */}
        <div
          key={selectedZoneFilter === "MAPA_CALOR" ? "map-heat" : "map-regions"}
          className={`h-[420px] ${
            selectedZoneFilter === "MAPA_CALOR"
              ? "md:col-span-12 animate-map-expand"
              : "md:col-span-8 animate-map-contract"
          }`}
        >
          <MinimapInternal
            reports={reports}
            barriosGeoJson={barriosGeoJson}
            customRegions={customRegions}
            selectedZoneFilter={selectedZoneFilter}
            selectedRegionName={selectedRegionName}
          />
        </div>
      </div>
    </div>
  );
}
