"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, Polygon, Tooltip } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Report } from "@/types/report";
import { BarriosFeatureCollection } from "@/services/barrioService";
import { RegionPersonalizada } from "@/types/region";
import { HeatLayer } from "@/components/map/HeatLayer";
import { buildHeatPoints, heatColor } from "@/lib/heatmap";
import { isPointInGeoJSONGeometry, isPointInPolygon } from "@/lib/geometry";

interface MinimapInternalProps {
  reports: Report[];
  barriosGeoJson: BarriosFeatureCollection | null;
  customRegions: RegionPersonalizada[];
  selectedZoneFilter: string; // "MAPA_CALOR" | "BARRIOS" | lista_id
}

const CORRIENTES_CENTER: [number, number] = [-27.4692, -58.8306];

export function MinimapInternal({
  reports,
  barriosGeoJson,
  customRegions,
  selectedZoneFilter,
}: MinimapInternalProps) {
  // Puntos del mapa de calor
  const heatPoints = useMemo(() => {
    return buildHeatPoints(reports);
  }, [reports]);

  // Polígonos de Barrios procesados con cantidad de reportes
  const barrioPolygons = useMemo(() => {
    if (!barriosGeoJson || !barriosGeoJson.features) return [];

    return barriosGeoJson.features.map((feature) => {
      const barrioName = feature.properties.nombre || "Barrio";
      // Contar reportes dentro de este barrio
      const reportCount = reports.filter((r) =>
        isPointInGeoJSONGeometry([r.latitud, r.longitud], feature.geometry)
      ).length;

      // Extraer coordenadas para Leaflet [lat, lng]
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

  // Maximo de reportes entre barrios para normalizar colores
  const maxBarrioReports = useMemo(() => {
    const counts = barrioPolygons.map((b) => b.reportCount);
    return Math.max(...counts, 1);
  }, [barrioPolygons]);

  // Polígonos de Regiones Personalizadas según lista seleccionada
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
      // Contar reportes dentro de la region personalizada
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
        scrollWheelZoom={true}
        className="w-full h-full z-0"
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />

        {/* 1. Capa Mapa de Calor */}
        {selectedZoneFilter === "MAPA_CALOR" && (
          <HeatLayer points={heatPoints} />
        )}

        {/* 2. Capa Polígonos de Barrios */}
        {selectedZoneFilter === "BARRIOS" &&
          barrioPolygons.map((barrio) => {
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
                  fillOpacity: barrio.reportCount > 0 ? 0.45 : 0.1,
                  color: color,
                  weight: barrio.reportCount > 0 ? 2 : 1,
                }}
              >
                <Tooltip sticky>
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
                  fillOpacity: 0.45,
                  color: color,
                  weight: 2,
                }}
              >
                <Tooltip sticky>
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
      </MapContainer>
    </div>
  );
}
