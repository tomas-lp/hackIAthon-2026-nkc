"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { Report } from "@/types/report";
import { buildHeatPoints, HEATMAP_CONFIG } from "@/lib/heatmap";
import { HeatLayer } from "./HeatLayer";
import { MapController } from "./MapController";
import { Flame } from "lucide-react";

interface ReportMapInternalProps {
  reports: Report[];
  selectedReport: Report | null;
  onSelectReport: (report: Report | null) => void;
}

const CORRIENTES_CENTER: [number, number] = [-27.4692, -58.8306];
const INITIAL_ZOOM = 8;
const NEUTRAL_COLOR = "#3b82f6";

function ZoomTracker({ onZoomChange }: { onZoomChange: (z: number) => void }) {
  const map = useMapEvents({
    zoom: () => {
      onZoomChange(map.getZoom());
    },
    zoomend: () => {
      onZoomChange(map.getZoom());
    }
  });
  
  useEffect(() => {
    onZoomChange(map.getZoom());
  }, [map, onZoomChange]);
  
  return null;
}

function createNeutralIcon(isSelected: boolean, zoom: number) {
  // Ajuste lineal del tamaño del icono en función del nivel de zoom
  // Si zoom es bajo (lejos), icono pequeño. Si zoom alto (cerca), icono normal.
  const minSize = isSelected ? 12 : 8;
  const maxSize = isSelected ? 30 : 20;
  
  // zoom asume rango típico de 8 a 18
  let size = minSize + (maxSize - minSize) * ((zoom - 8) / 10);
  size = Math.max(minSize, Math.min(maxSize, size));
  
  const letter = "!";

  return L.divIcon({
    className: "custom-report-marker",
    html: `
      <div style="
        background-color: ${NEUTRAL_COLOR};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: ${isSelected ? 2 : 1.5}px solid #ffffff;
        box-shadow: ${isSelected ? "0 0 0 4px rgba(59,130,246,0.4), 0 4px 12px rgba(0,0,0,0.3)" : "0 2px 6px rgba(0,0,0,0.25)"};
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        font-weight: 700;
        font-size: ${Math.max(6, size * 0.6)}px;
        font-family: system-ui, sans-serif;
      ">
        ${letter}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

export default function ReportMapInternal({
  reports,
  selectedReport,
  onSelectReport,
}: ReportMapInternalProps) {
  const markerRefs = useRef<Record<string, L.Marker | null>>({});
  const [currentZoom, setCurrentZoom] = useState(INITIAL_ZOOM);

  const defaultIcon = useMemo(() => createNeutralIcon(false, currentZoom), [currentZoom]);
  const selectedIcon = useMemo(() => createNeutralIcon(true, currentZoom), [currentZoom]);

  const validReports = useMemo(
    () =>
      reports.filter(
        (report) =>
          Number.isFinite(report.latitud) && Number.isFinite(report.longitud)
      ),
    [reports]
  );

  const heatPoints = useMemo(
    () => buildHeatPoints(validReports),
    [validReports]
  );

  const heatGradientCss = useMemo(
    () =>
      Object.entries(HEATMAP_CONFIG.gradient)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([stop, color]) => `${color} ${Number(stop) * 100}%`)
        .join(", "),
    []
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
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        <ZoomTracker onZoomChange={setCurrentZoom} />
        <MapController selectedReport={selectedReport} reports={validReports} markerRefs={markerRefs} />

        <HeatLayer points={heatPoints} />

        {validReports.map((report) => {
          const isSelected = selectedReport?.id === report.id;
          return (
            <Marker
              key={report.id}
              ref={(marker) => {
                markerRefs.current[report.id] = marker;
              }}
              position={[report.latitud, report.longitud]}
              icon={isSelected ? selectedIcon : defaultIcon}
              eventHandlers={{
                click: () => onSelectReport(report),
              }}
            >
            </Marker>
          );
        })}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-1000 bg-white/90  backdrop-blur-md border border-zinc-200  rounded-lg px-3 py-2 text-[11px] flex flex-col gap-1">
        <span className="font-medium text-zinc-500 flex items-center gap-1">
          <Flame className="w-3 h-3 text-orange-500" /> Riesgo por intensidad:
        </span>
        <div
          className="h-2 w-40 rounded-full"
          style={{
            background: `linear-gradient(to right, ${heatGradientCss})`,
          }}
        />
        <div className="flex justify-between font-mono text-[10px] text-zinc-400">
          <span>Bajo</span>
          <span>Alto</span>
        </div>
      </div>
    </div>
  );
}
