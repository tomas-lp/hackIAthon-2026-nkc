"use client";

import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { Report } from "@/types/report";
import { ZONE_CONFIG } from "@/lib/utils";
import { ZoneLayer } from "./ZoneLayer";
import { MapController } from "./MapController";
import { ReportPopup } from "./ReportPopup";
import { useZones } from "@/hooks/useZones";
import { Layers } from "lucide-react";

interface ReportMapInternalProps {
  reports: Report[];
  selectedReport: Report | null;
  onSelectReport: (report: Report | null) => void;
}

const CORRIENTES_CENTER: [number, number] = [-27.4692, -58.8306];
const INITIAL_ZOOM = 8;
const NEUTRAL_COLOR = "#3b82f6";

function createNeutralIcon(isSelected: boolean) {
  const size = isSelected ? 30 : 20;
  const letter = "!";

  return L.divIcon({
    className: "custom-report-marker",
    html: `
      <div style="
        background-color: ${NEUTRAL_COLOR};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: 2px solid #ffffff;
        box-shadow: ${isSelected ? "0 0 0 4px rgba(59,130,246,0.4), 0 4px 12px rgba(0,0,0,0.3)" : "0 2px 6px rgba(0,0,0,0.25)"};
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        font-weight: 700;
        font-size: ${isSelected ? "12px" : "10px"};
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

  const reportsKey = useMemo(
    () => reports.map((r) => r.id).join(","),
    [reports]
  );
  const { zones } = useZones(reportsKey);

  useEffect(() => {
    if (selectedReport) {
      const marker = markerRefs.current[selectedReport.id];
      if (marker) {
        marker.openPopup();
      }
    }
  }, [selectedReport]);

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

        <MapController selectedReport={selectedReport} />

        <ZoneLayer zones={zones} />

        {reports.map((report) => {
          const isSelected = selectedReport?.id === report.id;
          return (
            <Marker
              key={report.id}
              ref={(marker) => {
                markerRefs.current[report.id] = marker;
              }}
              position={[report.latitud, report.longitud]}
              icon={createNeutralIcon(isSelected)}
              eventHandlers={{
                click: () => onSelectReport(report),
              }}
            >
              <Popup className="custom-leaflet-popup">
                <ReportPopup report={report} />
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-1000 bg-white/90  backdrop-blur-md border border-zinc-200  rounded-lg px-3 py-2 text-[11px] flex flex-col gap-1">
        <span className="font-medium text-zinc-500 flex items-center gap-1">
          <Layers className="w-3 h-3 text-blue-500" /> Riesgo por zona:
        </span>
        <div className="flex flex-wrap items-center gap-3">
          {Object.entries(ZONE_CONFIG).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: cfg.color }}
              />
              <span className="text-zinc-700  font-mono text-[10px]">
                {key} {cfg.rango}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
