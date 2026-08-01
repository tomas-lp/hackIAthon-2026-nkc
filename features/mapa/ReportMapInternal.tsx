"use client";

import { useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { Report } from "@/types/report";
import {
  RISK_CONFIG,
  TYPE_CONFIG,
  STATUS_CONFIG,
  formatDate,
} from "@/lib/utils";
import { HeatmapLayer, HeatmapPoint } from "./HeatmapLayer";
import { MapController } from "./MapController";
import { Layers, Flame, MapPin } from "lucide-react";

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
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [showMarkers, setShowMarkers] = useState<boolean>(true);

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
    <div className="relative w-full h-full min-h-[500px] font-sans">
      <MapContainer
        center={CORRIENTES_CENTER}
        zoom={INITIAL_ZOOM}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController selectedReport={selectedReport} />

        {showHeatmap && <HeatmapLayer points={heatmapPoints} />}

        {showMarkers &&
          reports.map((report) => {
            const isSelected = selectedReport?.id === report.id;
            const riskCfg = RISK_CONFIG[report.riesgo];
            const typeCfg = TYPE_CONFIG[report.tipo];
            const statusCfg = STATUS_CONFIG[report.estado];
            const isDismissed =
              report.estado === "DESESTIMADO_SIN_ALERTA" ||
              report.estado === "DESESTIMADO_IRRELEVANTE";

            return (
              <Marker
                key={report.id}
                position={[report.latitud, report.longitud]}
                icon={createRiskIcon(report.riesgo, isSelected, isDismissed)}
                eventHandlers={{
                  click: () => onSelectReport(report),
                }}
              >
                <Popup className="custom-leaflet-popup">
                  <div className="p-1.5 max-w-xs font-sans text-xs space-y-2">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b pb-1">
                      <span className="font-mono text-[10px] text-zinc-400 font-semibold">
                        {report.id}
                      </span>
                      {report.localidad && (
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">
                          📍 {report.localidad}
                        </span>
                      )}
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-1">
                      <span
                        className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${riskCfg.bg} ${riskCfg.text} ${riskCfg.border}`}
                      >
                        Riesgo {riskCfg.label}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                      >
                        {statusCfg.label}
                      </span>
                    </div>

                    {/* Problematic & Telegram Text */}
                    <div>
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs">
                        {typeCfg.label}
                      </div>
                      <div className="mt-1 p-1.5 bg-zinc-50 dark:bg-zinc-900 border rounded text-[11px] text-zinc-600 dark:text-zinc-300 italic">
                        &quot;{report.descripcion}&quot;
                      </div>
                    </div>

                    {/* Weather Alert Match Details */}
                    {report.grokPayload?.weatherAlertDetails && (
                      <div className="text-[10px] text-zinc-500 font-mono bg-blue-50 dark:bg-zinc-800 p-1.5 rounded border border-blue-100 dark:border-zinc-700">
                        ⚡ {report.grokPayload.weatherAlertDetails}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t">
                      <span>Telegram: {report.usuario}</span>
                      <span>{formatDate(report.fecha)}</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>

      {/* Floating Controls */}
      <div className="absolute top-3 right-3 z-[1000] bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-lg p-1.5 shadow-sm flex flex-col gap-1 text-xs">
        <button
          onClick={() => setShowHeatmap(!showHeatmap)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded transition-colors ${
            showHeatmap
              ? "bg-blue-600 text-white font-medium"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          }`}
          title="Alternar mapa de calor"
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Heatmap Lluvias</span>
        </button>

        <button
          onClick={() => setShowMarkers(!showMarkers)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded transition-colors ${
            showMarkers
              ? "bg-blue-600 text-white font-medium"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          }`}
          title="Alternar marcadores"
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Marcadores</span>
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-[11px] flex items-center gap-3">
        <span className="font-medium text-zinc-500 flex items-center gap-1">
          <Layers className="w-3 h-3 text-blue-500" /> Criticidad:
        </span>
        {Object.entries(RISK_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: cfg.color }}
            />
            <span className="text-zinc-700 dark:text-zinc-300 font-mono text-[10px]">
              {key}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
