"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { Report } from "@/types/report";
import { SafeZone } from "@/types/safeZone";
import { buildHeatPoints, HEATMAP_CONFIG } from "@/lib/heatmap";
import { HeatLayer } from "./HeatLayer";
import { MapController } from "./MapController";
import { LocateButton } from "./LocateButton";
import { SafeRoute } from "./SafeRoute";
import { Flame } from "lucide-react";
import { RouteResult } from "@/lib/routing";

interface ReportMapInternalProps {
  reports: Report[];
  selectedReport: Report | null;
  onSelectReport: (report: Report | null) => void;
  safeZones?: SafeZone[];
  selectedSafeZone?: SafeZone | null;
  onSelectSafeZone?: (zone: SafeZone | null) => void;
  onMapClick?: (lat: number, lng: number) => void;
  isCreatingSafeZone?: boolean;
  draftLocation?: { lat: number; lng: number } | null;
  /** Ruta activa a renderizar sobre el mapa (sólo en modo usuario) */
  activeRoute?: RouteResult | null;
  isClosingRoute?: boolean;
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
    },
  });

  useEffect(() => {
    onZoomChange(map.getZoom());
  }, [map, onZoomChange]);

  return null;
}

function MapEventsHandler({
  onClick,
}: {
  onClick?: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click: (e) => {
      onClick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function createNeutralIcon(zoom: number, isNew: boolean = false) {
  // Siempre creamos el icono base con el tamaño normal para no romper el layout de Leaflet
  const minSize = 8;
  const maxSize = 20;

  // zoom asume rango típico de 8 a 18
  let size = minSize + (maxSize - minSize) * ((zoom - 8) / 10);
  size = Math.max(minSize, Math.min(maxSize, size));

  const letter = "!";

  return L.divIcon({
    className: `custom-report-marker`,
    html: `
      <div class="marker-inner ${isNew ? "animate-spawn" : ""}" style="
        background-color: ${NEUTRAL_COLOR};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: 1.5px solid #ffffff;
        box-shadow: 0 2px 6px rgba(0,0,0,0.25);
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

function createSafeZoneIcon(zoom: number, isDraft: boolean = false) {
  const minSize = 18;
  const maxSize = 36;
  let size = minSize + (maxSize - minSize) * ((zoom - 8) / 10);
  size = Math.max(minSize, Math.min(maxSize, size));

  const bgColor = isDraft ? "#6ee7b7" : "#10b981"; // emerald-300 vs emerald-500

  return L.divIcon({
    className: `custom-safe-zone-marker`,
    html: `
      <div class="marker-inner" style="display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); width: ${size}px; height: ${size * 1.15}px;">
        <svg width="100%" height="100%" viewBox="0 0 24 24" fill="${bgColor}" stroke="#ffffff" stroke-width="0.75">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke-linejoin="round" stroke-linecap="round"/>
          <path d="M9 12.5l2.5 2.5 4.5-5.5" fill="none" stroke="#ffffff" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    `,
    iconSize: [size, size * 1.15],
    iconAnchor: [size / 2, (size * 1.15) / 2],
    popupAnchor: [0, -(size * 1.15) / 2],
  });
}

interface ReportMapInternalProps {
  reports: Report[];
  selectedReport: Report | null;
  onSelectReport: (report: Report | null) => void;
  safeZones?: SafeZone[];
  selectedSafeZone?: SafeZone | null;
  onSelectSafeZone?: (zone: SafeZone | null) => void;
  onMapClick?: (lat: number, lng: number) => void;
  isCreatingSafeZone?: boolean;
  draftLocation?: { lat: number; lng: number } | null;
  draftCustomPin?: { lat: number; lng: number } | null;
  activeRouteCustomPin?: { lat: number; lng: number } | null;
  closingCustomPin?: { lat: number; lng: number } | null;
  activeRoute?: RouteResult | null;
  isClosingRoute?: boolean;
}

function createCustomPinIcon(
  zoom: number,
  animMode: "spawn" | "exit" | "idle" = "spawn"
) {
  const minSize = 24;
  const maxSize = 42;
  let size = minSize + (maxSize - minSize) * ((zoom - 8) / 10);
  size = Math.max(minSize, Math.min(maxSize, size));

  const animClass =
    animMode === "exit"
      ? "custom-pin-exit"
      : animMode === "spawn"
        ? "custom-pin-spawn"
        : "";

  return L.divIcon({
    className: `custom-pin-marker-wrapper`,
    html: `
      <div class="${animClass}" style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: ${size}px;
        height: ${size * 1.15}px;
        filter: drop-shadow(0 4px 8px rgba(0,0,0,0.35));
        transform-origin: bottom center;
      ">
        <svg width="100%" height="100%" viewBox="0 0 24 28" fill="#3b82f6" stroke="#ffffff" stroke-width="1.2">
          <path d="M12 2C6.48 2 2 6.48 2 12c0 6.5 10 14 10 14s10-7.5 10-14c0-5.52-4.48-10-10-10z" stroke-linejoin="round" stroke-linecap="round"/>
          <circle cx="12" cy="11" r="3.8" fill="#ffffff" stroke="none"/>
        </svg>
      </div>
    `,
    iconSize: [size, size * 1.15],
    iconAnchor: [size / 2, size * 1.15],
    popupAnchor: [0, -size * 1.15],
  });
}

export default function ReportMapInternal({
  reports,
  selectedReport,
  onSelectReport,
  safeZones = [],
  selectedSafeZone,
  onSelectSafeZone,
  onMapClick,
  isCreatingSafeZone,
  draftLocation,
  draftCustomPin,
  activeRouteCustomPin,
  closingCustomPin,
  activeRoute,
  isClosingRoute,
}: ReportMapInternalProps) {
  const markerRefs = useRef<Record<string, L.Marker | null>>({});
  const szMarkerRefs = useRef<Record<string, L.Marker | null>>({});
  const [currentZoom, setCurrentZoom] = useState(INITIAL_ZOOM);

  useEffect(() => {
    const STYLE_ID = "custom-pin-animations";
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      @keyframes custom-pin-spawn-anim {
        0%   { transform: scale(0) translateY(-25px); opacity: 0; }
        60%  { transform: scale(1.25) translateY(4px); opacity: 1; }
        80%  { transform: scale(0.9) translateY(-2px); opacity: 1; }
        100% { transform: scale(1) translateY(0); opacity: 1; }
      }
      @keyframes custom-pin-exit-anim {
        0%   { transform: scale(1) translateY(0); opacity: 1; }
        35%  { transform: scale(1.2) translateY(-10px); opacity: 1; }
        100% { transform: scale(0) translateY(12px); opacity: 0; }
      }
      .custom-pin-spawn {
        animation: custom-pin-spawn-anim 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
      }
      .custom-pin-exit {
        animation: custom-pin-exit-anim 0.3s ease-in-out forwards;
      }
    `;
    document.head.appendChild(style);
  }, []);

  const defaultIcon = useMemo(
    () => createNeutralIcon(currentZoom),
    [currentZoom]
  );
  const newDefaultIcon = useMemo(
    () => createNeutralIcon(currentZoom, true),
    [currentZoom]
  );

  const defaultSzIcon = useMemo(
    () => createSafeZoneIcon(currentZoom),
    [currentZoom]
  );
  const draftSzIcon = useMemo(
    () => createSafeZoneIcon(currentZoom, true),
    [currentZoom]
  );
  const draftCustomPinIcon = useMemo(
    () => createCustomPinIcon(currentZoom, "spawn"),
    [currentZoom]
  );
  const activeRouteCustomPinIcon = useMemo(
    () => createCustomPinIcon(currentZoom, "idle"),
    [currentZoom]
  );
  const closingCustomPinIcon = useMemo(
    () => createCustomPinIcon(currentZoom, "exit"),
    [currentZoom]
  );

  // Directly mutate DOM classes to allow CSS transitions without recreating L.divIcon
  useEffect(() => {
    Object.values(markerRefs.current).forEach((marker) => {
      const el =
        marker?.getElement() ??
        (marker as unknown as { _icon?: HTMLElement })?._icon;
      if (el) el.classList.remove("is-selected");
    });
    if (selectedReport?.id) {
      const selectedMarker = markerRefs.current[selectedReport.id];
      const el =
        selectedMarker?.getElement() ??
        (selectedMarker as unknown as { _icon?: HTMLElement })?._icon;
      if (el) el.classList.add("is-selected");
    }
  }, [selectedReport]);

  useEffect(() => {
    Object.values(szMarkerRefs.current).forEach((marker) => {
      const el =
        marker?.getElement() ??
        (marker as unknown as { _icon?: HTMLElement })?._icon;
      if (el) el.classList.remove("is-selected");
    });
    if (selectedSafeZone?.id) {
      const selectedMarker = szMarkerRefs.current[selectedSafeZone.id];
      const el =
        selectedMarker?.getElement() ??
        (selectedMarker as unknown as { _icon?: HTMLElement })?._icon;
      if (el) el.classList.add("is-selected");
    }
  }, [selectedSafeZone]);

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

  // eslint-disable-next-line react-hooks/purity
  const nowTimestamp = useMemo(() => Date.now(), []);

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
        <MapEventsHandler onClick={onMapClick} />
        <MapController
          selectedReport={selectedReport}
          reports={validReports}
          markerRefs={markerRefs}
          selectedSafeZone={selectedSafeZone}
        />

        <HeatLayer points={heatPoints} />

        {validReports.map((report) => {
          const isSelected = selectedReport?.id === report.id;
          const isNew = nowTimestamp - new Date(report.fecha).getTime() < 10000;
          return (
            <Marker
              key={report.id}
              ref={(marker) => {
                markerRefs.current[report.id] = marker;
              }}
              position={[report.latitud, report.longitud]}
              icon={isNew ? newDefaultIcon : defaultIcon}
              eventHandlers={{
                click: () =>
                  isSelected ? onSelectReport(null) : onSelectReport(report),
              }}
            ></Marker>
          );
        })}

        {safeZones.map((sz) => {
          const isSelected = selectedSafeZone?.id === sz.id;
          return (
            <Marker
              key={sz.id}
              ref={(marker) => {
                szMarkerRefs.current[sz.id] = marker;
              }}
              position={[sz.latitud, sz.longitud]}
              icon={defaultSzIcon}
              eventHandlers={{
                click: () =>
                  isSelected
                    ? onSelectSafeZone?.(sz) // toggle off handled by parent
                    : onSelectSafeZone?.(sz),
              }}
              zIndexOffset={1000} // Ensure safe zones render on top of reports
            />
          );
        })}

        {isCreatingSafeZone && draftLocation && (
          <Marker
            position={[draftLocation.lat, draftLocation.lng]}
            icon={draftSzIcon}
            zIndexOffset={1001}
          />
        )}

        {activeRouteCustomPin && (
          <Marker
            key={`active-pin-${activeRouteCustomPin.lat}-${activeRouteCustomPin.lng}`}
            position={[activeRouteCustomPin.lat, activeRouteCustomPin.lng]}
            icon={activeRouteCustomPinIcon}
            zIndexOffset={1002}
          />
        )}

        {draftCustomPin && (
          <Marker
            key={`draft-pin-${draftCustomPin.lat}-${draftCustomPin.lng}`}
            position={[draftCustomPin.lat, draftCustomPin.lng]}
            icon={draftCustomPinIcon}
            zIndexOffset={1003}
          />
        )}

        {closingCustomPin && (
          <Marker
            key={`closing-pin-${closingCustomPin.lat}-${closingCustomPin.lng}`}
            position={[closingCustomPin.lat, closingCustomPin.lng]}
            icon={closingCustomPinIcon}
            zIndexOffset={1001}
          />
        )}

        <LocateButton activeRoute={activeRoute} />

        {/* Ruta segura activa — solo visible en modo usuario */}
        {activeRoute && (
          <SafeRoute route={activeRoute} isClosing={isClosingRoute} />
        )}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-1000 bg-white/50 backdrop-blur-xs border border-gray-200 rounded-xl px-4 py-3 text-xs flex flex-col gap-1.5">
        <span className="font-medium text-zinc-600 flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-orange-500" /> Riesgo por intensidad:
        </span>
        <div
          className="h-3 w-52 rounded-full mt-1"
          style={{
            background: `linear-gradient(to right, ${heatGradientCss})`,
          }}
        />
        <div className="flex justify-between font-mono text-[11px] text-zinc-400">
          <span>Bajo</span>
          <span>Alto</span>
        </div>
      </div>
    </div>
  );
}
