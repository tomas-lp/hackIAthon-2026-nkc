"use client";

import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { Report } from "@/types/report";
import { RISK_CONFIG } from "@/lib/utils";
import { HeatmapLayer, HeatmapPoint } from "./HeatmapLayer";
import { MapController } from "./MapController";
import { ReportPopup } from "./ReportPopup";
import { Layers } from "lucide-react";

interface ReportMapInternalProps {
  reports: Report[];
  selectedReport: Report | null;
  onSelectReport: (report: Report | null) => void;
}

const CORRIENTES_CENTER: [number, number] = [-27.4692, -58.8306];
const INITIAL_ZOOM = 8;

function createRiskIcon(
  riskKey: keyof typeof RISK_CONFIG,
  isSelected: boolean,
  isDismissed: boolean
) {
  const config = RISK_CONFIG[riskKey] || RISK_CONFIG.BAJO;
  const size = isSelected ? 30 : 22;
  const letter = riskKey[0];
  const opacity = isDismissed ? "0.5" : "1.0";

  return L.divIcon({
    className: "custom-report-marker",
    html: `
      <div style="
        background-color: ${isDismissed ? "#71717a" : config.color};
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
        opacity: ${opacity};
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
  const showHeatmap = true;
  const showMarkers = true;
  const markerRefs = useRef<Record<string, L.Marker | null>>({});

  useEffect(() => {
    if (selectedReport) {
      const marker = markerRefs.current[selectedReport.id];
      if (marker) {
        marker.openPopup();
      }
    }
  }, [selectedReport]);

  // Transform reports into heatmap intensity points (excluding dismissed from heatmap to focus intensity on active alerts!)
  const heatmapPoints: HeatmapPoint[] = useMemo(() => {
    return reports
      .filter(
        (r) =>
          r.estado !== "DESESTIMADO_SIN_ALERTA" &&
          r.estado !== "DESESTIMADO_IRRELEVANTE"
      )
      .map((r) => ({
        lat: r.latitud,
        lng: r.longitud,
        intensity: RISK_CONFIG[r.riesgo]?.weight || 0.25,
      }));
  }, [reports]);

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

        {showHeatmap && <HeatmapLayer points={heatmapPoints} />}

        {showMarkers &&
          reports.map((report) => {
            const isSelected = selectedReport?.id === report.id;
            const isDismissed =
              report.estado === "DESESTIMADO_SIN_ALERTA" ||
              report.estado === "DESESTIMADO_IRRELEVANTE";

            return (
              <Marker
                key={report.id}
                ref={(marker) => {
                  markerRefs.current[report.id] = marker;
                }}
                position={[report.latitud, report.longitud]}
                icon={createRiskIcon(report.riesgo, isSelected, isDismissed)}
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
      <div className="absolute bottom-4 left-4 z-1000 bg-white/90  backdrop-blur-md border border-zinc-200  rounded-lg px-3 py-2 text-[11px] flex items-center gap-3">
        <span className="font-medium text-zinc-500 flex items-center gap-1">
          <Layers className="w-3 h-3 text-blue-500" /> Criticidad:
        </span>
        {Object.entries(RISK_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: cfg.color }}
            />
            <span className="text-zinc-700  font-mono text-[10px]">{key}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
