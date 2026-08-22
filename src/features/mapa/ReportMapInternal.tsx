"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  GeoJSON,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { createClient } from "@/lib/supabase/client";
import { Report } from "@/types/report";
import { SafeZone } from "@/types/safeZone";
import { HealthCenter } from "@/types/healthCenter";
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
  healthCenters?: HealthCenter[];
  selectedHealthCenter?: HealthCenter | null;
  onSelectHealthCenter?: (center: HealthCenter | null) => void;
  onMapClick?: (lat: number, lng: number) => void;
  isCreatingSafeZone?: boolean;
  draftLocation?: { lat: number; lng: number } | null;
  draftCustomPin?: { lat: number; lng: number } | null;
  activeRouteCustomPin?: { lat: number; lng: number } | null;
  closingCustomPin?: { lat: number; lng: number } | null;
  activeRoute?: RouteResult | null;
  isClosingRoute?: boolean;
  isAdmin?: boolean;
  showEvacuationCenters?: boolean;
  showMedicalCenters?: boolean;
  showBarrios?: boolean;
}

const CORRIENTES_CENTER: [number, number] = [-27.4692, -58.8306];
const INITIAL_ZOOM = 13;
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
      // Prevent click from bubbling to Next.js <Link> elements outside the map
      e.originalEvent?.stopPropagation();
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

function createHealthCenterIcon(zoom: number, isVisible: boolean = true) {
  const minSize = 12;
  const maxSize = 22;
  let size = minSize + (maxSize - minSize) * ((zoom - 8) / 10);
  size = Math.max(minSize, Math.min(maxSize, size));

  return L.divIcon({
    className: `custom-health-center-marker ${isVisible ? "is-visible" : "is-hidden"}`,
    html: `
      <div class="marker-inner transition-all duration-300 ease-out" style="
        background-color: #ef4444;
        width: ${size}px;
        height: ${size}px;
        border-radius: 4px;
        border: 1.5px solid #ffffff;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        opacity: ${isVisible ? 1 : 0};
        transform: scale(${isVisible ? 1 : 0.4});
        pointer-events: ${isVisible ? "auto" : "none"};
      ">
        <svg width="${size * 0.65}" height="${size * 0.65}" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
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

interface BarrioTooltipInfo {
  nombre: string;
  tipo: string;
  reportCount: number;
  x: number;
  y: number;
}

function BarriosLayer({ data }: { data: GeoJSON.FeatureCollection }) {
  const map = useMap();
  const isDragging = useRef(false);
  const isAnimating = useRef(false);
  const [tooltip, setTooltip] = useState<BarrioTooltipInfo | null>(null);

  useEffect(() => {
    const handleMoveStart = () => {
      isAnimating.current = true;
      setTooltip(null);
    };
    const handleMoveEnd = () => {
      isAnimating.current = false;
    };

    map.on("movestart", handleMoveStart);
    map.on("moveend", handleMoveEnd);

    return () => {
      map.off("movestart", handleMoveStart);
      map.off("moveend", handleMoveEnd);
    };
  }, [map]);

  useEffect(() => {
    const container = map.getContainer();
    let startX = 0;
    let startY = 0;

    const onPointerDown = (e: PointerEvent) => {
      startX = e.clientX;
      startY = e.clientY;
      isDragging.current = false;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!(e.buttons & 1)) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (dx * dx + dy * dy > 25) {
        isDragging.current = true;
        setTooltip(null);
      }
    };

    const onPointerUp = () => {
      isDragging.current = false;
    };

    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerup", onPointerUp);
    container.addEventListener("pointercancel", onPointerUp);

    return () => {
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerup", onPointerUp);
      container.removeEventListener("pointercancel", onPointerUp);
    };
  }, [map]);

  return (
    <>
      <GeoJSON
        key="barrios-layer"
        data={data}
        style={() => ({
          color: "#2563eb",
          weight: 1.5,
          opacity: 0.7,
          fillColor: "#3b82f6",
          fillOpacity: 0.08,
        })}
        onEachFeature={(feature, layer) => {
          const nombre = feature.properties?.nombre ?? "";
          const tipo = feature.properties?.tipo ?? "";
          const reportCount = feature.properties?.report_count ?? 0;

          (layer as L.Path).on({
            mouseover(e) {
              if (isDragging.current || isAnimating.current) return;
              (e.target as L.Path).setStyle({ fillOpacity: 0.3, weight: 2.5 });
              (e.target as L.Path).bringToFront();
              const containerRect = map.getContainer().getBoundingClientRect();
              const orig = e.originalEvent as MouseEvent;
              setTooltip({
                nombre,
                tipo,
                reportCount,
                x: orig.clientX - containerRect.left + 12,
                y: orig.clientY - containerRect.top - 10,
              });
            },
            mousemove(e) {
              if (isDragging.current || isAnimating.current) {
                setTooltip(null);
                return;
              }
              const containerRect = map.getContainer().getBoundingClientRect();
              const orig = e.originalEvent as MouseEvent;
              setTooltip((prev) =>
                prev
                  ? {
                      ...prev,
                      x: orig.clientX - containerRect.left + 12,
                      y: orig.clientY - containerRect.top - 10,
                    }
                  : null
              );
            },
            mouseout(e) {
              (e.target as L.Path).setStyle({ fillOpacity: 0.08, weight: 1.5 });
              setTooltip(null);
            },
            click(e) {
              e.originalEvent?.stopPropagation();
              if (isDragging.current || isAnimating.current) return;
              const target = e.target as L.Polygon;

              if (typeof target.getBounds !== "function") return;

              const bounds = target.getBounds();
              // Zoom justo para encuadrar el barrio con un poco de aire
              map.fitBounds(bounds, { padding: [80, 80], maxZoom: 15 });

              // Esperar a que termine la animación para proyectar el centroide
              map.once("moveend", () => {
                const center = bounds.getCenter();
                const containerPoint = map.latLngToContainerPoint(center);
                const containerRect = map
                  .getContainer()
                  .getBoundingClientRect();
                // Mostrar tooltip sólo si el centro del barrio sigue dentro del viewport
                if (
                  containerPoint.x > 0 &&
                  containerPoint.x < containerRect.width &&
                  containerPoint.y > 0 &&
                  containerPoint.y < containerRect.height
                ) {
                  setTooltip({
                    nombre,
                    tipo,
                    reportCount,
                    x: containerPoint.x + 12,
                    y: containerPoint.y - 10,
                  });
                  // Resaltar el polígono para dar feedback visual
                  (target as L.Path).setStyle({
                    fillOpacity: 0.3,
                    weight: 2.5,
                  });
                }
              });
            },
          });
        }}
      />
      {/* Tooltip React: posicionado absolutamente dentro del contenedor del mapa */}
      {tooltip && (
        <div
          style={{
            position: "absolute",
            left: tooltip.x,
            top: tooltip.y,
            zIndex: 9999,
            background: "white",
            border: "1px solid #ccc",
            borderRadius: 6,
            padding: "6px 10px",
            pointerEvents: "none",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            whiteSpace: "nowrap",
          }}
        >
          <strong style={{ fontSize: 13 }}>{tooltip.nombre}</strong>
          <br />
          <span style={{ fontSize: 11, color: "#666" }}>{tooltip.tipo}</span>
          {tooltip.reportCount > 0 ? (
            <>
              <br />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#e74c3c" }}>
                🚨 {tooltip.reportCount} reportes
              </span>
            </>
          ) : (
            <>
              <br />
              <span style={{ fontSize: 11, color: "#27ae60" }}>
                ✅ Sin reportes
              </span>
            </>
          )}
        </div>
      )}
    </>
  );
}

export default function ReportMapInternal({
  reports,
  selectedReport,
  onSelectReport,
  safeZones = [],
  selectedSafeZone,
  onSelectSafeZone,
  healthCenters = [],
  selectedHealthCenter,
  onSelectHealthCenter,
  onMapClick,
  isCreatingSafeZone,
  draftLocation,
  draftCustomPin,
  activeRouteCustomPin,
  closingCustomPin,
  activeRoute,
  isClosingRoute,
  isAdmin,
  showEvacuationCenters = true,
  showMedicalCenters = true,
  showBarrios = false,
}: ReportMapInternalProps) {
  const markerRefs = useRef<Record<string, L.Marker | null>>({});
  const szMarkerRefs = useRef<Record<string, L.Marker | null>>({});
  const hcMarkerRefs = useRef<Record<string, L.Marker | null>>({});
  const [currentZoom, setCurrentZoom] = useState(INITIAL_ZOOM);
  const [barriosGeoJson, setBarriosGeoJson] =
    useState<GeoJSON.FeatureCollection | null>(null);
  const supabase = createClient();

  // Carga los polígonos de barrios dinámicamente desde PostGIS
  useEffect(() => {
    if (!showBarrios) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBarriosGeoJson(null);
      return;
    }

    const fetchBarrios = async () => {
      const { data, error } = await supabase.rpc("get_barrios_geojson");
      if (error) {
        console.error("Error cargando barrios desde PostGIS:", error);
        return;
      }
      if (data) {
        setBarriosGeoJson(data as unknown as GeoJSON.FeatureCollection);
      }
    };

    fetchBarrios().catch((e) =>
      console.error("Error inesperado cargando barrios:", e)
    );
  }, [showBarrios, supabase]);

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
  const hcIconVisible = useMemo(
    () => createHealthCenterIcon(currentZoom, true),
    [currentZoom]
  );
  const hcIconHidden = useMemo(
    () => createHealthCenterIcon(currentZoom, false),
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

  useEffect(() => {
    Object.values(hcMarkerRefs.current).forEach((marker) => {
      const el =
        marker?.getElement() ??
        (marker as unknown as { _icon?: HTMLElement })?._icon;
      if (el) el.classList.remove("is-selected");
    });
    if (selectedHealthCenter?.id) {
      const selectedMarker = hcMarkerRefs.current[selectedHealthCenter.id];
      const el =
        selectedMarker?.getElement() ??
        (selectedMarker as unknown as { _icon?: HTMLElement })?._icon;
      if (el) el.classList.add("is-selected");
    }
  }, [selectedHealthCenter]);

  const validReports = useMemo(
    () =>
      reports.filter(
        (report) =>
          Number.isFinite(report.latitud) && Number.isFinite(report.longitud)
      ),
    [reports]
  );

  const validSafeZones = useMemo(
    () =>
      safeZones.filter(
        (sz) => Number.isFinite(sz.latitud) && Number.isFinite(sz.longitud)
      ),
    [safeZones]
  );

  const validHealthCenters = useMemo(
    () =>
      healthCenters.filter(
        (hc) =>
          hc.lat !== null &&
          hc.lon !== null &&
          Number.isFinite(hc.lat) &&
          Number.isFinite(hc.lon)
      ),
    [healthCenters]
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
    <div className="relative w-full h-full min-h-[500px] font-sans">
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

        {/* Capa de polígonos de barrios — solo en vista /barrios */}
        {showBarrios && barriosGeoJson && (
          <BarriosLayer data={barriosGeoJson} />
        )}

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
                click: (e) => {
                  e.originalEvent?.stopPropagation();
                  if (isSelected) {
                    onSelectReport(null);
                  } else {
                    onSelectReport(report);
                  }
                },
              }}
            ></Marker>
          );
        })}

        {showEvacuationCenters &&
          validSafeZones.map((sz) => {
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
                      ? onSelectSafeZone?.(sz)
                      : onSelectSafeZone?.(sz),
                }}
                zIndexOffset={1000}
              />
            );
          })}

        {showMedicalCenters &&
          validHealthCenters.map((hc) => {
            const isSelected = selectedHealthCenter?.id === hc.id;
            const isVisible = currentZoom >= 11 || isSelected;
            return (
              <Marker
                key={`hc-${hc.id}`}
                ref={(marker) => {
                  hcMarkerRefs.current[hc.id] = marker;
                }}
                position={[hc.lat!, hc.lon!]}
                icon={isVisible ? hcIconVisible : hcIconHidden}
                eventHandlers={{
                  click: () =>
                    isSelected
                      ? onSelectHealthCenter?.(null)
                      : onSelectHealthCenter?.(hc),
                }}
                zIndexOffset={isSelected ? 1100 : 1000}
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

        {!isAdmin && <LocateButton activeRoute={activeRoute} />}

        {/* Ruta segura activa — solo visible en modo usuario */}
        {activeRoute && (
          <SafeRoute route={activeRoute} isClosing={isClosingRoute} />
        )}
      </MapContainer>

      {/* Legend for User view */}
      {!isAdmin && (
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
      )}
    </div>
  );
}
