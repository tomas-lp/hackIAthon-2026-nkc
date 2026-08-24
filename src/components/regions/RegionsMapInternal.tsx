"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, Polygon, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { formatTitleCase } from "@/lib/format";
import { Report } from "@/types/report";
import { RegionLista, RegionPersonalizada } from "@/types/region";
import { buildHeatPoints } from "@/lib/heatmap";
import { HeatLayer } from "@/components/map/HeatLayer";
import { isPointInGeoJSONGeometry } from "@/lib/geometry";
import { BarriosFeatureCollection } from "@/services/barrioService";

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

// --- Componente principal ---
export default function RegionsMapInternal(props: RegionsMapInternalProps) {
  const {
    reports,
    regiones,
    barriosGeoJson,
    activeHeaderTab,
    isDrawing,
    draftPoints,
    onAddDraftPoint,
    onFinishDrawing,
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

  return (
    <div className="relative w-full h-full min-h-125 font-sans">
      <MapContainer
        center={CORRIENTES_CENTER}
        zoom={INITIAL_ZOOM}
        scrollWheelZoom={true}
        zoomControl={false}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {!props.hideHeatmap && <HeatLayer points={heatPoints} />}

        {/* Polígonos de barrios de la API PostGIS con resaltado y cantidad de reclamos */}
        {showBarriosLayer && barriosGeoJson && (
          <GeoJSON
            key="barrios-layer-regiones"
            data={barriosGeoJson as unknown as GeoJSON.GeoJsonObject}
            style={(feature) => {
              const isSelected = feature?.properties?.id === selectedRegionId;
              return {
                color: isSelected ? "#1d4ed8" : "#2563eb",
                weight: isSelected ? 3.5 : 1.5,
                opacity: isSelected ? 0.95 : 0.7,
                fillColor: isSelected ? "#2563eb" : "#3b82f6",
                fillOpacity: isSelected ? 0.35 : 0.12,
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
                    : `${count} reclamos en esta zona`;

                const htmlContent = `
                  <div class="flex flex-col gap-0.5 font-sans p-0.5">
                    <span class="font-bold text-sm text-zinc-900 leading-tight">${nombre}</span>
                    <span class="text-xs font-medium text-zinc-600 leading-tight">${countText}</span>
                  </div>
                `;

                layer.bindTooltip(htmlContent, {
                  sticky: true,
                  className:
                    "custom-tooltip font-sans rounded-xl border border-gray-200 bg-white/95 backdrop-blur-xs shadow-xl px-3 py-2 text-zinc-800",
                });
              }
            }}
          />
        )}

        {/* Regiones guardadas — visibles según lista activa en colores por lista */}
        {regiones.map((region) => (
          <RegionShape
            key={region.id}
            region={region}
            reports={validReports}
            color={getListColor(
              region.lista_id || region.lista_nombre,
              props.listas
            )}
            isSelected={selectedRegionId === region.id}
          />
        ))}

        {/* Borrador del polígono en construcción */}
        <DrawingOverlay
          isDrawing={isDrawing}
          draftPoints={draftPoints}
          onAddPoint={onAddDraftPoint}
          onFinish={onFinishDrawing}
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
          <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-6 py-3 rounded-full shadow-lg border border-gray-200 pointer-events-auto">
            <span className="font-semibold text-gray-800 text-sm">
              Dibuja la región · clickeá para añadir puntos · doble click al
              primer punto para cerrar
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
