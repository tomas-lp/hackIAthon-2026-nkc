"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Polygon, Polyline, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { Trash2 } from "lucide-react";
import { MapTooltip, MapTooltipTitle, MapTooltipSub } from "./MapTooltip";

import { Report } from "@/types/report";
import { RegionLista, RegionPersonalizada } from "@/types/region";
import { extractGeoJSONPoints, isPointInPolygon } from "@/lib/geometry";
import { BarriosFeatureCollection } from "@/services/barrioService";

export const LIST_COLOR_PALETTE = [
  "#3b82f6", // Unified baby blue
];

export function getListColor(
  _listIdOrName?: string | null,
  _listas?: RegionLista[]
): string {
  return "#3b82f6";
}

export function RegionFocuser({
  regiones,
  barriosGeoJson,
  selectedRegionId,
}: {
  regiones: RegionPersonalizada[];
  barriosGeoJson?: BarriosFeatureCollection | null;
  selectedRegionId: string | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!selectedRegionId) return;

    const region = regiones.find((r) => r.id === selectedRegionId);
    if (region && region.points.length >= 3) {
      const bounds = L.latLngBounds(region.points);
      map.flyToBounds(bounds, { padding: [60, 60], duration: 0.5 });
      return;
    }

    if (barriosGeoJson?.features) {
      const barrioFeature = barriosGeoJson.features.find(
        (f) => f.properties?.id === selectedRegionId
      );
      if (barrioFeature?.geometry) {
        const points = extractGeoJSONPoints(barrioFeature.geometry);
        if (points.length > 0) {
          const bounds = L.latLngBounds(points);
          map.flyToBounds(bounds, { padding: [60, 60], duration: 0.5 });
        }
      }
    }
  }, [selectedRegionId, regiones, barriosGeoJson, map]);

  return null;
}

export function DrawingOverlay({
  isDrawing,
  draftPoints,
  onAddPoint,
  onFinish,
  onCancel,
}: {
  isDrawing: boolean;
  draftPoints: [number, number][];
  onAddPoint: (pt: [number, number]) => void;
  onFinish: () => void;
  onCancel?: () => void;
}) {
  const map = useMap();
  const [mousePos, setMousePos] = useState<[number, number] | null>(null);
  const [isSnapping, setIsSnapping] = useState(false);

  useEffect(() => {
    if (!isDrawing) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onCancel?.();
      }
    }

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isDrawing, onCancel]);

  useEffect(() => {
    if (isDrawing) {
      map.getContainer().style.cursor = "crosshair";
    } else {
      map.getContainer().style.cursor = "";
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const segments: [number, number][][] = [];
  for (let i = 0; i < draftPoints.length - 1; i++) {
    segments.push([draftPoints[i], draftPoints[i + 1]]);
  }

  const activeLine: [number, number][] =
    draftPoints.length > 0 && mousePos
      ? [draftPoints[draftPoints.length - 1], mousePos]
      : [];

  const closingLine: [number, number][] =
    isSnapping && draftPoints.length > 2 && mousePos
      ? [mousePos, draftPoints[0]]
      : [];

  const fillPreview = isSnapping ? [...draftPoints] : [];

  return (
    <>
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

      {segments.map((seg, i) => (
        <Polyline
          key={i}
          positions={seg}
          pathOptions={{ color: "#3b82f6", weight: 2.5 }}
        />
      ))}

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

export function DraftMarkers({
  isDrawing,
  draftPoints,
}: {
  isDrawing: boolean;
  draftPoints: [number, number][];
}) {
  if (!isDrawing || draftPoints.length === 0) return null;

  return (
    <>
      <Polygon
        positions={draftPoints}
        pathOptions={{
          color: "#3b82f6",
          fillColor: "#3b82f6",
          fillOpacity: 0.15,
          weight: 2,
          dashArray: "4, 4",
        }}
      />

      {draftPoints.map((pt, idx) => (
        <Polyline
          key={`vertex-${idx}`}
          positions={[pt, pt]}
          pathOptions={{
            color: idx === 0 ? "#10b981" : "#3b82f6",
            weight: idx === 0 ? 10 : 8,
          }}
        />
      ))}
    </>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (typeof window !== "undefined" && L && (L as any).Tooltip) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const TooltipProto = (L as any).Tooltip.prototype;
  if (TooltipProto && !TooltipProto._patchedSourceCheck) {
    TooltipProto._patchedSourceCheck = true;
    const origOpen = TooltipProto._open;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TooltipProto._open = function (e: any) {
      if (!this._source && (e?.layer || e?.target)) {
        this._source = e.layer || e.target;
      }
      if (this._source && origOpen) {
        origOpen.call(this, e);
      }
    };
  }
}

export function RegionShape({
  region,
  reports,
  color = "#3b82f6",
  isSelected = false,
  isEditingRegions = false,
  onDeleteRegion,
}: {
  region: RegionPersonalizada;
  reports: Report[];
  color?: string;
  isSelected?: boolean;
  isEditingRegions?: boolean;
  onDeleteRegion?: (regionId: string) => void;
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
        color: color,
        fillColor: color,
        fillOpacity: isSelected ? 0.65 : 0.45,
        weight: isSelected ? 3 : 2,
      }}
      eventHandlers={{
        mouseover: (e) => {
          e.target.setStyle({ fillOpacity: isSelected ? 0.75 : 0.6 });
        },
        mouseout: (e) => {
          e.target.setStyle({ fillOpacity: isSelected ? 0.65 : 0.45 });
        },
      }}
    >
      <MapTooltip variant="polygon">
        <div className="flex flex-col gap-1">
          <MapTooltipTitle>{region.nombre}</MapTooltipTitle>
          <MapTooltipSub>
            {isEditingRegions
              ? "Clickeá para opciones"
              : `${pointsCount} reclamos activos en esta zona`}
          </MapTooltipSub>
        </div>
      </MapTooltip>

      {isEditingRegions && onDeleteRegion && (
        <Popup className="custom-popup rounded-2xl p-1 shadow-xl">
          <div className="flex flex-col items-center gap-2 p-2 pt-2.5 min-w-[130px]">
            <span className="text-xs font-bold text-zinc-900 dark:text-white pr-3">
              {region.nombre}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteRegion(region.id);
              }}
              className="flex items-center justify-center gap-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white px-3.5 py-1.5 text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer w-full"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Eliminar
            </button>
          </div>
        </Popup>
      )}
    </Polygon>
  );
}

export function DraftFitter({
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
      map.fitBounds(bounds, { padding: [80, 80] });
    }
    if (!active) {
      fittedRef.current = false;
    }
  }, [active, draftPoints, map]);

  return null;
}
