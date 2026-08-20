"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Polygon, Polyline, Tooltip, useMap, useMapEvents } from "react-leaflet";
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
}

// Subcomponente para manejar eventos y renderizar el borrador de dibujo
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

  // Configuramos el cursor
  useEffect(() => {
    if (isDrawing) {
      map.getContainer().style.cursor = "crosshair";
    } else {
      map.getContainer().style.cursor = "";
      setMousePos(null);
    }
  }, [isDrawing, map]);

  useMapEvents({
    mousemove(e) {
      if (isDrawing) {
        setMousePos([e.latlng.lat, e.latlng.lng]);
        
        // Comprobar snap to close (si hay mas de 2 puntos)
        if (draftPoints.length > 2) {
          const firstPt = map.latLngToContainerPoint(draftPoints[0]);
          const currentPt = map.latLngToContainerPoint(e.latlng);
          const distance = firstPt.distanceTo(currentPt);
          
          if (distance < 20) {
            map.getContainer().style.cursor = "pointer";
          } else {
            map.getContainer().style.cursor = "crosshair";
          }
        }
      }
    },
    click(e) {
      if (!isDrawing) return;

      // Verificamos si hizo click muy cerca del primer punto para cerrar el poligono
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
    // Click derecho o escape cancelaríamos si quisiéramos desde acá
    contextmenu(e) {
      if (isDrawing) {
        e.originalEvent.preventDefault();
        if (draftPoints.length > 2) onFinish();
      }
    }
  });

  if (!isDrawing) return null;

  // Mostramos el poligono que se va formando
  const displayPolygon = [...draftPoints];
  // Mostramos la linea punteada hacia el cursor
  let activeLine: [number, number][] = [];
  if (draftPoints.length > 0 && mousePos) {
    activeLine = [draftPoints[draftPoints.length - 1], mousePos];
  }

  return (
    <>
      {displayPolygon.length > 0 && (
        <Polygon 
          positions={displayPolygon} 
          pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.3, weight: 2 }} 
        />
      )}
      {activeLine.length > 0 && (
        <Polyline 
          positions={activeLine} 
          pathOptions={{ color: '#3b82f6', weight: 2, dashArray: '5, 5' }} 
        />
      )}
    </>
  );
}

// Subcomponente para renderizar una region guardada y calcular su hover
function RegionShape({ region, reports }: { region: RegionPersonalizada, reports: Report[] }) {
  const map = useMap();
  
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
      pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.2, weight: 2 }}
      eventHandlers={{
        mouseover: (e) => {
          const layer = e.target;
          layer.setStyle({ fillOpacity: 0.5, color: '#059669' });
        },
        mouseout: (e) => {
          const layer = e.target;
          layer.setStyle({ fillOpacity: 0.2, color: '#10b981' });
        }
      }}
    >
      <Tooltip sticky className="custom-tooltip font-sans text-sm rounded-xl border border-gray-200 shadow-xl px-3 py-2">
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

// Para ajustar el mapa al terminar de dibujar
function MapFitter({ draftPoints, finishedDrawing }: { draftPoints: [number, number][], finishedDrawing: boolean }) {
  const map = useMap();
  
  useEffect(() => {
    if (finishedDrawing && draftPoints.length > 2) {
      const bounds = L.latLngBounds(draftPoints);
      map.flyToBounds(bounds, { padding: [50, 50], duration: 1.5 });
    }
  }, [finishedDrawing, draftPoints, map]);

  return null;
}

export default function RegionsMapInternal({
  reports,
  regiones,
  isDrawing,
  draftPoints,
  onAddDraftPoint,
  onFinishDrawing,
  onCancelDrawing
}: RegionsMapInternalProps) {
  
  const validReports = useMemo(
    () => reports.filter((r) => Number.isFinite(r.latitud) && Number.isFinite(r.longitud)),
    [reports]
  );
  
  const heatPoints = useMemo(() => buildHeatPoints(validReports), [validReports]);

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
          attribution='&copy; OpenStreetMap'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        <HeatLayer points={heatPoints} />

        {/* Las regiones guardadas */}
        {!isDrawing && regiones.map(region => (
          <RegionShape key={region.id} region={region} reports={validReports} />
        ))}

        {/* Capa de dibujo (activa si isDrawing es true) */}
        <DrawingOverlay 
          isDrawing={isDrawing} 
          draftPoints={draftPoints} 
          onAddPoint={onAddDraftPoint}
          onFinish={onFinishDrawing}
        />

        {/* Ajuste de camara */}
        <MapFitter draftPoints={draftPoints} finishedDrawing={!isDrawing && draftPoints.length > 2} />

      </MapContainer>

      {/* Overlay de oscurecimiento si se está dibujando */}
      {isDrawing && (
        <div className="absolute inset-0 bg-black/10 pointer-events-none z-[1000] transition-opacity duration-300">
          <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-6 py-3 rounded-full shadow-lg border border-gray-200 pointer-events-auto">
            <span className="font-semibold text-gray-800 text-sm">
              Dibuja la región o polígono en el mapa (clickea para añadir puntos)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
