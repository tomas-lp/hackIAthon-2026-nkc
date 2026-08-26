"use client";

import { useMemo, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Polygon,
  Tooltip,
  CircleMarker,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Report } from "@/types/report";
import { BarriosFeatureCollection } from "@/services/barrioService";
import { RegionPersonalizada } from "@/types/region";
import { HeatLayer } from "@/components/map/HeatLayer";
import { buildHeatPoints, heatColor } from "@/lib/heatmap";
import { isPointInGeoJSONGeometry, isPointInPolygon } from "@/lib/geometry";
import { Target, Plus, Minus } from "lucide-react";

interface MinimapInternalProps {
  reports: Report[];
  barriosGeoJson: BarriosFeatureCollection | null;
  customRegions: RegionPersonalizada[];
  selectedZoneFilter: string; // "MAPA_CALOR" | "BARRIOS" | lista_id
  selectedRegionName?: string | null;
}

const CORRIENTES_CENTER: [number, number] = [-27.4692, -58.8306];

function CustomMapControls() {
  const map = useMap();

  const preventAll = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className="absolute top-3 right-3 z-[1000] flex flex-col items-center gap-2"
      onMouseDown={preventAll}
      onMouseUp={preventAll}
      onClick={preventAll}
      onDoubleClick={preventAll}
    >
      {/* Botón de Centrar la Ciudad */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          try {
            map.flyTo(CORRIENTES_CENTER, 13, { duration: 1 });
          } catch (err) {
            console.error("Zoom center error:", err);
          }
        }}
        className="w-8 h-8 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 transition cursor-pointer"
        title="Centrar en Corrientes Capital"
      >
        <Target className="w-4 h-4" />
      </button>

      {/* Botones de Zoom Redondos con íconos finos */}
      <div className="w-8 flex flex-col items-center bg-white border border-gray-200 rounded-full py-1 shadow-md">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            try {
              map.zoomIn();
            } catch (err) {
              console.error("Zoom in error:", err);
            }
          }}
          className="w-6 h-6 rounded-full flex items-center justify-center text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
          title="Acercar"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <div className="w-5 h-[1px] bg-gray-200 my-0.5" />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            try {
              map.zoomOut();
            } catch (err) {
              console.error("Zoom out error:", err);
            }
          }}
          className="w-6 h-6 rounded-full flex items-center justify-center text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
          title="Alejar"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function MapTooltipCleaner() {
  const map = useMap();

  useEffect(() => {
    const closeAll = () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.eachLayer((layer: any) => {
          if (layer && typeof layer.closeTooltip === "function") {
            layer.closeTooltip();
          }
        });
      } catch {
        // Ignorar
      }
    };

    map.on("mousedown", closeAll);
    map.on("dragstart", closeAll);
    map.on("movestart", closeAll);
    map.on("mouseup", closeAll);
    map.on("zoomstart", closeAll);

    return () => {
      map.off("mousedown", closeAll);
      map.off("dragstart", closeAll);
      map.off("movestart", closeAll);
      map.off("mouseup", closeAll);
      map.off("zoomstart", closeAll);
    };
  }, [map]);

  return null;
}

function MapSizeInvalidator() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    if (!container) return;

    let animFrameId: number;

    const observer = new ResizeObserver(() => {
      animFrameId = requestAnimationFrame(() => {
        try {
          map.invalidateSize({ animate: false });
        } catch {
          // Ignorar
        }
      });
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
      }
    };
  }, [map]);

  return null;
}

function MapRegionBoundsController({
  selectedRegionName,
  barriosGeoJson,
  customRegions,
  selectedZoneFilter,
}: {
  selectedRegionName: string | null | undefined;
  barriosGeoJson: BarriosFeatureCollection | null;
  customRegions: RegionPersonalizada[];
  selectedZoneFilter: string;
}) {
  const map = useMap();

  useEffect(() => {
    if (!selectedRegionName || !map) return;

    try {
      if (selectedZoneFilter === "BARRIOS" && barriosGeoJson?.features) {
        const feature = barriosGeoJson.features.find(
          (f) => (f.properties.nombre || "Barrio") === selectedRegionName
        );
        if (feature && feature.geometry) {
          let coords: [number, number][] = [];
          if (feature.geometry.type === "Polygon") {
            coords = (feature.geometry.coordinates[0] || []).map(
              ([lng, lat]) => [lat, lng] as [number, number]
            );
          } else if (feature.geometry.type === "MultiPolygon") {
            coords = feature.geometry.coordinates.flatMap((poly) =>
              (poly[0] || []).map(
                ([lng, lat]) => [lat, lng] as [number, number]
              )
            );
          }

          const validCoords = coords.filter(
            (c) =>
              Array.isArray(c) &&
              c.length === 2 &&
              typeof c[0] === "number" &&
              !isNaN(c[0]) &&
              typeof c[1] === "number" &&
              !isNaN(c[1])
          );

          if (validCoords.length > 0) {
            const lats = validCoords.map((c) => c[0]);
            const lngs = validCoords.map((c) => c[1]);
            const minLat = Math.min(...lats);
            const maxLat = Math.max(...lats);
            const minLng = Math.min(...lngs);
            const maxLng = Math.max(...lngs);

            if (minLat !== maxLat && minLng !== maxLng) {
              map.fitBounds(
                [
                  [minLat, minLng],
                  [maxLat, maxLng],
                ],
                { padding: [35, 35], maxZoom: 15, animate: true }
              );
            } else {
              map.setView([minLat, minLng], 15, { animate: true });
            }
          }
        }
      } else if (customRegions && customRegions.length > 0) {
        const region = customRegions.find(
          (r) =>
            r.nombre === selectedRegionName && r.lista_id === selectedZoneFilter
        );
        if (
          region &&
          Array.isArray(region.points) &&
          region.points.length > 0
        ) {
          const validPoints = region.points.filter(
            (p) =>
              Array.isArray(p) &&
              p.length === 2 &&
              typeof p[0] === "number" &&
              !isNaN(p[0]) &&
              typeof p[1] === "number" &&
              !isNaN(p[1])
          );

          if (validPoints.length > 0) {
            const lats = validPoints.map((p) => p[0]);
            const lngs = validPoints.map((p) => p[1]);
            const minLat = Math.min(...lats);
            const maxLat = Math.max(...lats);
            const minLng = Math.min(...lngs);
            const maxLng = Math.max(...lngs);

            if (minLat !== maxLat && minLng !== maxLng) {
              map.fitBounds(
                [
                  [minLat, minLng],
                  [maxLat, maxLng],
                ],
                { padding: [35, 35], maxZoom: 15, animate: true }
              );
            } else {
              map.setView([minLat, minLng], 15, { animate: true });
            }
          }
        }
      }
    } catch (err) {
      console.error("Error in fitBounds controller:", err);
    }
  }, [
    selectedRegionName,
    barriosGeoJson,
    customRegions,
    selectedZoneFilter,
    map,
  ]);

  return null;
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  INUNDACION_URBANA: "Inundación urbana",
  LLUVIAS_FUERTES: "Lluvias fuertes",
  GRANIZO: "Granizo",
  ANEGAMIENTO_VIVIENDA: "Anegamiento en vivienda",
};

function formatReportType(tipo: string): string {
  if (!tipo) return "Reclamo";
  if (REPORT_TYPE_LABELS[tipo]) return REPORT_TYPE_LABELS[tipo];
  const formatted = tipo.replace(/_/g, " ").toLowerCase();
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function MinimapInternal({
  reports,
  barriosGeoJson,
  customRegions,
  selectedZoneFilter,
  selectedRegionName,
}: MinimapInternalProps) {
  // Puntos del mapa de calor
  const heatPoints = useMemo(() => {
    return buildHeatPoints(reports, { ignoreAgeMultiplier: true });
  }, [reports]);

  // Polígonos de Barrios procesados con cantidad de reportes
  const barrioPolygons = useMemo(() => {
    if (!barriosGeoJson || !barriosGeoJson.features) return [];

    return barriosGeoJson.features.map((feature) => {
      const barrioName = feature.properties.nombre || "Barrio";
      const reportCount = reports.filter((r) =>
        isPointInGeoJSONGeometry([r.latitud, r.longitud], feature.geometry)
      ).length;

      let positions: [number, number][][] = [];
      if (feature.geometry.type === "Polygon") {
        const ring = feature.geometry.coordinates[0] || [];
        positions = [ring.map(([lng, lat]) => [lat, lng])];
      } else if (feature.geometry.type === "MultiPolygon") {
        positions = feature.geometry.coordinates.map((poly) =>
          (poly[0] || []).map(([lng, lat]) => [lat, lng])
        );
      }

      return {
        id: feature.properties.id || barrioName,
        nombre: barrioName,
        reportCount,
        positions,
      };
    });
  }, [barriosGeoJson, reports]);

  const maxBarrioReports = useMemo(() => {
    const counts = barrioPolygons.map((b) => b.reportCount);
    return Math.max(...counts, 1);
  }, [barrioPolygons]);

  const filteredCustomRegions = useMemo(() => {
    if (
      selectedZoneFilter === "MAPA_CALOR" ||
      selectedZoneFilter === "BARRIOS"
    ) {
      return [];
    }
    return customRegions.filter((r) => r.lista_id === selectedZoneFilter);
  }, [customRegions, selectedZoneFilter]);

  const customRegionPolygons = useMemo(() => {
    return filteredCustomRegions.map((region) => {
      const reportCount = reports.filter((r) =>
        isPointInPolygon([r.latitud, r.longitud], region.points)
      ).length;

      return {
        id: region.id,
        nombre: region.nombre,
        reportCount,
        positions: region.points,
      };
    });
  }, [filteredCustomRegions, reports]);

  const maxCustomReports = useMemo(() => {
    const counts = customRegionPolygons.map((c) => c.reportCount);
    return Math.max(...counts, 1);
  }, [customRegionPolygons]);

  return (
    <div className="w-full h-full min-h-[350px] rounded-2xl overflow-hidden border border-gray-200 shadow-2xs relative">
      <MapContainer
        center={CORRIENTES_CENTER}
        zoom={13}
        zoomControl={false}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
        attributionControl={false}
      >
        <TileLayer url="/api/tile/{z}/{x}/{-y}.png" maxZoom={19} />

        {/* Controladores de mapa */}
        <CustomMapControls />
        <MapTooltipCleaner />
        <MapSizeInvalidator />
        <MapRegionBoundsController
          selectedRegionName={selectedRegionName}
          barriosGeoJson={barriosGeoJson}
          customRegions={customRegions}
          selectedZoneFilter={selectedZoneFilter}
        />

        {/* 1. Capa Mapa de Calor */}
        {selectedZoneFilter === "MAPA_CALOR" && (
          <HeatLayer points={heatPoints} />
        )}

        {/* 2. Capa Polígonos de Barrios */}
        {selectedZoneFilter === "BARRIOS" &&
          barrioPolygons.map((barrio) => {
            const isSelected = barrio.nombre === selectedRegionName;
            const color =
              barrio.reportCount > 0
                ? heatColor(barrio.reportCount, maxBarrioReports)
                : "#6b7280";

            return (
              <Polygon
                key={barrio.id}
                positions={barrio.positions}
                pathOptions={{
                  fillColor: color,
                  fillOpacity: isSelected
                    ? 0.65
                    : barrio.reportCount > 0
                      ? 0.45
                      : 0.1,
                  color: isSelected ? "#2563eb" : color,
                  weight: isSelected ? 3 : barrio.reportCount > 0 ? 2 : 1,
                }}
                eventHandlers={{
                  mousedown: (e) => {
                    try {
                      e.target.closeTooltip();
                    } catch {
                      // Ignorar
                    }
                  },
                }}
              >
                <Tooltip opacity={0.95}>
                  <div className="text-xs font-sans p-0.5">
                    <p className="font-bold text-zinc-900">{barrio.nombre}</p>
                    <p className="text-zinc-600">
                      Reclamos:{" "}
                      <span className="font-semibold">
                        {barrio.reportCount}
                      </span>
                    </p>
                  </div>
                </Tooltip>
              </Polygon>
            );
          })}

        {/* 3. Capa Polígonos de Regiones Personalizadas */}
        {selectedZoneFilter !== "MAPA_CALOR" &&
          selectedZoneFilter !== "BARRIOS" &&
          customRegionPolygons.map((region) => {
            const isSelected = region.nombre === selectedRegionName;
            const color =
              region.reportCount > 0
                ? heatColor(region.reportCount, maxCustomReports)
                : "#3b82f6";

            return (
              <Polygon
                key={region.id}
                positions={region.positions}
                pathOptions={{
                  fillColor: color,
                  fillOpacity: isSelected ? 0.65 : 0.45,
                  color: isSelected ? "#2563eb" : color,
                  weight: isSelected ? 3 : 2,
                }}
                eventHandlers={{
                  mousedown: (e) => {
                    try {
                      e.target.closeTooltip();
                    } catch {
                      // Ignorar
                    }
                  },
                }}
              >
                <Tooltip opacity={0.95}>
                  <div className="text-xs font-sans p-0.5">
                    <p className="font-bold text-zinc-900">{region.nombre}</p>
                    <p className="text-zinc-600">
                      Reclamos:{" "}
                      <span className="font-semibold">
                        {region.reportCount}
                      </span>
                    </p>
                  </div>
                </Tooltip>
              </Polygon>
            );
          })}

        {/* 4. Marcadores de Reclamos en Amarillo para el Periodo Seleccionado */}
        {reports
          .filter(
            (r) =>
              r &&
              typeof r.latitud === "number" &&
              !isNaN(r.latitud) &&
              typeof r.longitud === "number" &&
              !isNaN(r.longitud)
          )
          .map((r) => (
            <CircleMarker
              key={`report-marker-${r.id}`}
              center={[r.latitud, r.longitud]}
              radius={5}
              pathOptions={{
                fillColor: "#eab308",
                color: "#ffffff",
                weight: 1.5,
                fillOpacity: 0.95,
              }}
              eventHandlers={{
                mousedown: (e) => {
                  try {
                    e.target.closeTooltip();
                  } catch {
                    // Ignorar
                  }
                },
              }}
            >
              <Tooltip opacity={0.95}>
                <div className="text-xs font-sans p-0.5">
                  <p className="font-bold text-zinc-900">
                    {formatReportType(r.tipo)}
                  </p>
                  {r.descripcion && (
                    <p className="text-zinc-600 text-[11px] font-medium line-clamp-1">
                      {r.descripcion}
                    </p>
                  )}
                  <p className="text-zinc-500 text-[10px]">
                    {new Date(r.fecha).toLocaleDateString("es-AR")}
                  </p>
                </div>
              </Tooltip>
            </CircleMarker>
          ))}
      </MapContainer>

      {/* Leyenda Flotante de Colores de Afectación abajo en el minimapa */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur-xs border border-gray-200 rounded-xl px-3 py-2 shadow-md flex items-center gap-1.5 text-[11px] font-medium text-zinc-700">
        <span className="text-[11px] text-zinc-700 font-bold">Afectación:</span>
        <div className="flex items-center gap-1 ml-0.5">
          <span className="text-[10px] text-zinc-400">Baja</span>
          <div className="w-14 h-2 rounded-full bg-gradient-to-r from-[#3b82f6] via-[#eab308] to-[#ef4444]" />
          <span className="text-[10px] text-zinc-400">Alta</span>
        </div>
      </div>
    </div>
  );
}
