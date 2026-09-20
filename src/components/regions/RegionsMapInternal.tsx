"use client";

import { useMemo } from "react";
import { MapContainer, Polygon, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { formatTitleCase } from "@/lib/format";
import { Report } from "@/types/report";
import { RegionLista, RegionPersonalizada } from "@/types/region";
import { buildHeatPoints } from "@/lib/heatmap";
import { HeatLayer } from "@/components/map/HeatLayer";
import { isPointInGeoJSONGeometry } from "@/lib/geometry";
import { BarriosFeatureCollection } from "@/services/barrioService";
import { useDarkMode } from "@/hooks/useDarkMode";
import { MapTileLayers } from "@/components/map/MapTileLayers";
import {
  buildMapTooltipHtml,
  MAP_TOOLTIP_CLASSNAME,
  MapTooltipManager,
} from "@/components/map/MapTooltip";

const CORRIENTES_CENTER: [number, number] = [-27.4692, -58.8306];
const INITIAL_ZOOM = 12;

interface RegionsMapInternalProps {
  reports: Report[];
  regiones: RegionPersonalizada[];
  listas?: RegionLista[];
  barriosGeoJson?: BarriosFeatureCollection | null;
  activeHeaderTab?: string;
  isDrawing: boolean;
  draftPoints: [number, number][];
  onAddDraftPoint: (point: [number, number]) => void;
  onFinishDrawing: () => void;
  onCancelDrawing: () => void;
  selectedRegionId: string | null;
  hideHeatmap?: boolean;
  showAllBarrios?: boolean;
}

import {
  RegionFocuser,
  DrawingOverlay,
  DraftMarkers,
  RegionShape,
  DraftFitter,
  getListColor,
} from "@/components/map/PolygonDrawingOverlay";
import { MapSizeInvalidator } from "@/components/map/MapSizeInvalidator";

// --- Componente principal ---
export default function RegionsMapInternal(props: RegionsMapInternalProps) {
  const { isDark } = useDarkMode();
  const {
    reports,
    regiones,
    barriosGeoJson,
    activeHeaderTab,
    isDrawing,
    draftPoints,
    onAddDraftPoint,
    onFinishDrawing,
    onCancelDrawing,
    selectedRegionId,
  } = props;
  const validReports = useMemo(
    () =>
      reports.filter(
        (r) => Number.isFinite(r.latitud) && Number.isFinite(r.longitud)
      ),
    [reports]
  );

  const heatPoints = useMemo(
    () => buildHeatPoints(validReports),
    [validReports]
  );

  // Mapa de cantidad de reclamos por barrio
  const barrioReportsCountMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!barriosGeoJson?.features || validReports.length === 0) return map;

    for (const feature of barriosGeoJson.features) {
      const barrioId = feature.properties?.id;
      if (!barrioId || !feature.geometry) continue;

      let count = 0;
      for (const report of validReports) {
        if (
          isPointInGeoJSONGeometry(
            [report.latitud, report.longitud],
            feature.geometry
          )
        ) {
          count++;
        }
      }
      map.set(barrioId, count);
    }

    return map;
  }, [barriosGeoJson, validReports]);

  // showNamePopup está activo cuando isDrawing=false pero aún hay draftPoints
  const showingNamePopup = !isDrawing && draftPoints.length > 2;

  // Determinar si debemos mostrar la capa GeoJSON de barrios en el mapa
  const isSelectedBarrio = useMemo(() => {
    if (!selectedRegionId || !barriosGeoJson?.features) return false;
    return barriosGeoJson.features.some(
      (f) => f.properties?.id === selectedRegionId
    );
  }, [selectedRegionId, barriosGeoJson]);

  const showBarriosLayer =
    props.showAllBarrios || activeHeaderTab === "Barrios" || isSelectedBarrio;

  const reportsKey = useMemo(
    () =>
      validReports
        .map((r) => r.id)
        .sort()
        .join(","),
    [validReports]
  );

  return (
    <div className="relative w-full h-full min-h-125 font-sans">
      <MapContainer
        center={CORRIENTES_CENTER}
        zoom={INITIAL_ZOOM}
        scrollWheelZoom={true}
        zoomControl={false}
        className="w-full h-full z-0"
      >
        <MapTileLayers isDark={isDark} />

        <MapSizeInvalidator />
        <MapTooltipManager />

        {!props.hideHeatmap && <HeatLayer points={heatPoints} />}

        {/* Polígonos de barrios de la API PostGIS con resaltado y cantidad de reclamos */}
        {showBarriosLayer && barriosGeoJson && (
          <GeoJSON
            key={`barrios-layer-regiones-${isDark ? "dark" : "light"}-${reportsKey}`}
            data={barriosGeoJson as unknown as GeoJSON.GeoJsonObject}
            style={(feature) => {
              const isSelected = feature?.properties?.id === selectedRegionId;
              return {
                color: isSelected ? "#2563eb" : "#3b82f6",
                weight: isSelected ? 3 : 2,
                opacity: 0.9,
                fillColor: isSelected ? "#2563eb" : "#3b82f6",
                fillOpacity: isSelected ? 0.65 : 0.25,
              };
            }}
            onEachFeature={(feature, layer) => {
              const rawName = feature.properties?.nombre;
              if (rawName) {
                const nombre = formatTitleCase(rawName);
                const barrioId = feature.properties?.id;
                const count = barrioId
                  ? barrioReportsCountMap.get(barrioId) || 0
                  : 0;
                const countText =
                  count === 1
                    ? "1 reclamo en esta zona"
                    : count > 1
                      ? `${count} reclamos en esta zona`
                      : "Sin reclamos en esta zona";

                layer.bindTooltip(
                  buildMapTooltipHtml({
                    title: nombre,
                    subtitle: countText,
                    italic: count === 0,
                  }),
                  {
                    sticky: true,
                    direction: "top",
                    className: MAP_TOOLTIP_CLASSNAME,
                  }
                );
              }
            }}
          />
        )}

        {/* Regiones guardadas — visibles según lista activa en baby blue unificado */}
        {regiones.map((region) => (
          <RegionShape
            key={region.id}
            region={region}
            reports={validReports}
            color="#3b82f6"
            isSelected={selectedRegionId === region.id}
          />
        ))}

        {/* Borrador del polígono en construcción */}
        <DrawingOverlay
          isDrawing={isDrawing}
          draftPoints={draftPoints}
          onAddPoint={onAddDraftPoint}
          onFinish={onFinishDrawing}
          onCancel={onCancelDrawing}
        />

        {/* Marcadores de puntos del borrador */}
        <DraftMarkers isDrawing={isDrawing} draftPoints={draftPoints} />

        {/* Polígono del borrador visible durante el popup de nombre */}
        {showingNamePopup && (
          <Polygon
            positions={draftPoints}
            pathOptions={{
              color: "#3b82f6",
              fillColor: "#3b82f6",
              fillOpacity: 0.25,
              weight: 2,
              dashArray: "6 4",
            }}
          />
        )}

        {/* Fly-to al confirmar el polígono (cuando aparece el popup de nombre) */}
        <DraftFitter draftPoints={draftPoints} active={showingNamePopup} />

        {/* Fly-to al hacer click en una región o barrio del listado */}
        <RegionFocuser
          regiones={regiones}
          barriosGeoJson={barriosGeoJson}
          selectedRegionId={selectedRegionId}
        />
      </MapContainer>

      {/* Overlay de oscurecimiento mientras se dibuja */}
      {isDrawing && (
        <div className="absolute inset-0 bg-black/10 pointer-events-none z-[1000] transition-opacity duration-300">
          <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-[#161f36]/95 backdrop-blur-md px-6 py-3 rounded-full shadow-lg border border-gray-200 dark:border-[#2b395b] pointer-events-auto">
            <span className="font-semibold text-gray-800 dark:text-white text-sm">
              Dibuja el polígono a crear.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
