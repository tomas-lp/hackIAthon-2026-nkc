"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polygon,
  Polyline,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { Report } from "@/types/report";
import { RegionPersonalizada } from "@/types/region";
import { buildHeatPoints } from "@/lib/heatmap";
import { HeatLayer } from "../mapa/HeatLayer";
import { isPointInPolygon } from "@/lib/geometry";

const CORRIENTES_CENTER: [number, number] = [-27.4692, -58.8306];
const INITIAL_ZOOM = 12;

interface RegionsMapInternalProps {
  reports: Report[];
  regiones: RegionPersonalizada[];
  isDrawing: boolean;
  draftPoints: [number, number][];
  onAddDraftPoint: (point: [number, number]) => void;
  onFinishDrawing: () => void;
  onCancelDrawing: () => void;
  selectedRegionId: string | null;
}

// --- Subcomponente: vuela al bounds de la región seleccionada desde el sidebar ---
function RegionFocuser({
  regiones,
  selectedRegionId,
}: {
  regiones: RegionPersonalizada[];
  selectedRegionId: string | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!selectedRegionId) return;
    const region = regiones.find((r) => r.id === selectedRegionId);
    if (!region || region.points.length < 3) return;
    const bounds = L.latLngBounds(region.points);
    map.flyToBounds(bounds, { padding: [60, 60], duration: 1.2 });
  }, [selectedRegionId, regiones, map]);

  return null;
}

// --- Subcomponente: dibuja el borrador y gestiona los eventos de dibujo ---
function DrawingOverlay({
  isDrawing,
  draftPoints,
  onAddPoint,
  onFinish,
}: {
  isDrawing: boolean;
  draftPoints: [number, number][];
  onAddPoint: (pt: [number, number]) => void;
  onFinish: () => void;
}) {
  const map = useMap();
  const [mousePos, setMousePos] = useState<[number, number] | null>(null);
  const [isSnapping, setIsSnapping] = useState(false);

  useEffect(() => {
    if (isDrawing) {
      map.getContainer().style.cursor = "crosshair";
    } else {
      map.getContainer().style.cursor = "";
      setMousePos(null);
      setIsSnapping(false);
    }
  }, [isDrawing, map]);

  useMapEvents({
    mousemove(e) {
      if (!isDrawing) return;
      setMousePos([e.latlng.lat, e.latlng.lng]);

      if (draftPoints.length > 2) {
        const firstPt = map.latLngToContainerPoint(draftPoints[0]);
        const currentPt = map.latLngToContainerPoint(e.latlng);
        const distance = firstPt.distanceTo(currentPt);
        const snap = distance < 20;
        setIsSnapping(snap);
        map.getContainer().style.cursor = snap ? "pointer" : "crosshair";
      }
    },
    click(e) {
      if (!isDrawing) return;

      if (draftPoints.length > 2) {
        const firstPt = map.latLngToContainerPoint(draftPoints[0]);
        const currentPt = map.latLngToContainerPoint(e.latlng);
        if (firstPt.distanceTo(currentPt) < 20) {
          onFinish();
          return;
        }
      }
      onAddPoint([e.latlng.lat, e.latlng.lng]);
    },
    contextmenu(e) {
      if (isDrawing) {
        e.originalEvent.preventDefault();
        if (draftPoints.length > 2) onFinish();
      }
    },
  });

  if (!isDrawing) return null;

  // Solo dibujamos Polyline de segmentos (no Polygon para evitar el cierre visual prematuro)
  // Cuando hay >= 3 puntos y está en snap, mostramos la línea de cierre en punteado
  const segments: [number, number][][] = [];
  for (let i = 0; i < draftPoints.length - 1; i++) {
    segments.push([draftPoints[i], draftPoints[i + 1]]);
  }

  // Línea dinámica hacia el cursor
  const activeLine: [number, number][] =
    draftPoints.length > 0 && mousePos
      ? [draftPoints[draftPoints.length - 1], mousePos]
      : [];

  // Línea de cierre (snap preview) hacia el primer punto
  const closingLine: [number, number][] =
    isSnapping && draftPoints.length > 2 && mousePos
      ? [mousePos, draftPoints[0]]
      : [];

  // Fill preview: solo cuando está en modo snap (a punto de cerrar)
  const fillPreview = isSnapping ? [...draftPoints] : [];

  return (
    <>
      {/* Fill de preview cuando está cerrando */}
      {fillPreview.length > 2 && (
        <Polygon
          positions={fillPreview}
          pathOptions={{
            color: "#3b82f6",
            fillColor: "#3b82f6",
            fillOpacity: 0.25,
            weight: 0,
            stroke: false,
          }}
        />
      )}

      {/* Segmentos ya trazados */}
      {segments.map((seg, i) => (
        <Polyline
          key={i}
          positions={seg}
          pathOptions={{ color: "#3b82f6", weight: 2.5 }}
        />
      ))}

      {/* Línea dinámica hacia el cursor */}
      {activeLine.length > 0 && (
        <Polyline
          positions={activeLine}
          pathOptions={{
            color: "#3b82f6",
            weight: 2,
            dashArray: "6, 6",
            opacity: 0.8,
          }}
        />
      )}

      {/* Línea de cierre preview (snap) */}
      {closingLine.length > 0 && (
        <Polyline
          positions={closingLine}
          pathOptions={{
            color: "#3b82f6",
            weight: 2,
            dashArray: "6, 6",
            opacity: 0.6,
          }}
        />
      )}
    </>
  );
}

// Marcadores imperativos para los puntos del borrador.
// Usamos L.circleMarker (SVG nativo de Leaflet): perfectamente centrado,
// sin animaciones CSS, sin estilos DOM que pisar, y se borran al terminar.
function DraftMarkers({
  isDrawing,
  draftPoints,
}: {
  isDrawing: boolean;
  draftPoints: [number, number][];
}) {
  const map = useMap();
  const markersRef = useRef<L.CircleMarker[]>([]);

  useEffect(() => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (!isDrawing) return;

    draftPoints.forEach((pt) => {
      const circle = L.circleMarker(pt, {
        radius: 6,
        color: "#3b82f6",
        weight: 2.5,
        fillColor: "#ffffff",
        fillOpacity: 1,
        interactive: false,
      }).addTo(map);
      markersRef.current.push(circle);
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
    };
  }, [draftPoints, isDrawing, map]);

  return null;
}

// --- Subcomponente: región guardada con hover stats ---
function RegionShape({
  region,
  reports,
}: {
  region: RegionPersonalizada;
  reports: Report[];
}) {
  const pointsCount = useMemo(() => {
    let count = 0;
    for (const r of reports) {
      if (isPointInPolygon([r.latitud, r.longitud], region.points)) {
        count++;
      }
    }
    return count;
  }, [region.points, reports]);

  return (
    <Polygon
      positions={region.points}
      pathOptions={{
        color: "#10b981",
        fillColor: "#10b981",
        fillOpacity: 0.2,
        weight: 2,
      }}
      eventHandlers={{
        mouseover: (e) => {
          e.target.setStyle({ fillOpacity: 0.5, color: "#059669" });
        },
        mouseout: (e) => {
          e.target.setStyle({ fillOpacity: 0.2, color: "#10b981" });
        },
      }}
    >
      <Tooltip
        sticky
        className="custom-tooltip font-sans text-sm rounded-xl border border-gray-200 shadow-xl px-3 py-2"
      >
        <div className="flex flex-col gap-1">
          <span className="font-bold text-gray-800">{region.nombre}</span>
          <span className="text-zinc-600 text-xs">
            {pointsCount} reclamos activos en esta zona
          </span>
        </div>
      </Tooltip>
    </Polygon>
  );
}

// --- Subcomponente: fly-to al bounds del borrador cuando se confirma ---
function DraftFitter({
  draftPoints,
  active,
}: {
  draftPoints: [number, number][];
  active: boolean;
}) {
  const map = useMap();
  const fittedRef = useRef(false);

  useEffect(() => {
    if (active && draftPoints.length > 2 && !fittedRef.current) {
      fittedRef.current = true;
      const bounds = L.latLngBounds(draftPoints);
      // fitBounds es instantáneo, sin animación de vuelo que lagee el popup
      map.fitBounds(bounds, { padding: [80, 80] });
    }
    if (!active) {
      fittedRef.current = false;
    }
  }, [active, draftPoints, map]);

  return null;
}

// --- Componente principal ---
export default function RegionsMapInternal({
  reports,
  regiones,
  isDrawing,
  draftPoints,
  onAddDraftPoint,
  onFinishDrawing,
  onCancelDrawing,
  selectedRegionId,
}: RegionsMapInternalProps) {
  const validReports = useMemo(
    () =>
      reports.filter(
        (r) => Number.isFinite(r.latitud) && Number.isFinite(r.longitud)
      ),
    [reports]
  );

  const heatPoints = useMemo(() => buildHeatPoints(validReports), [validReports]);

  // showNamePopup está activo cuando isDrawing=false pero aún hay draftPoints
  const showingNamePopup = !isDrawing && draftPoints.length > 2;

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

        <HeatLayer points={heatPoints} />

        {/* Regiones guardadas — siempre visibles (incluso durante el popup de nombre) */}
        {regiones.map((region) => (
          <RegionShape key={region.id} region={region} reports={validReports} />
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

        {/* Fly-to al hacer click en una región del sidebar */}
        <RegionFocuser regiones={regiones} selectedRegionId={selectedRegionId} />
      </MapContainer>

      {/* Overlay de oscurecimiento mientras se dibuja */}
      {isDrawing && (
        <div className="absolute inset-0 bg-black/10 pointer-events-none z-[1000] transition-opacity duration-300">
          <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-6 py-3 rounded-full shadow-lg border border-gray-200 pointer-events-auto">
            <span className="font-semibold text-gray-800 text-sm">
              Dibuja la región · clickeá para añadir puntos · doble click al primer punto para cerrar
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
