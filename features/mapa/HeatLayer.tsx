"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";

import { HeatPoint, HEATMAP_CONFIG, heatmapRadiusAt } from "@/lib/heatmap";

interface HeatLayerProps {
  points: HeatPoint[];
}

function ensureGlobalLeaflet(): void {
  const global = window as unknown as { L?: unknown };
  if (!global.L) {
    (global as { L: typeof L }).L = L;
  }
}

function patchSimpleheat(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const global = window as any;
  if (global.simpleheat && !global.simpleheat.prototype._isPatched) {
    global.simpleheat.prototype._isPatched = true;

    global.simpleheat.prototype.radius = function (t: number, i: number) {
      i = i || 15;
      const a = (this._circle = document.createElement("canvas"));
      const s = a.getContext("2d");
      const e = (this._r = t + i);

      // Calculate a safe offset dynamically based on the radius and blur
      // to ensure the solid source circle is always drawn completely off-screen.
      const offset = t * 2 + i + 20;

      a.width = a.height = 2 * e;
      if (s) {
        s.shadowOffsetX = s.shadowOffsetY = offset;
        s.shadowBlur = i;
        s.shadowColor = "black";
        s.beginPath();
        s.arc(e - offset, e - offset, t, 0, 2 * Math.PI, true);
        s.closePath();
        s.fill();
      }
      return this;
    };
  }
}

export function HeatLayer({ points }: HeatLayerProps) {
  const map = useMap();
  const layerRef = useRef<L.HeatLayer | null>(null);
  const importPromiseRef = useRef<Promise<void> | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // First render: import leaflet.heat once and create the layer
  useEffect(() => {
    let cancelled = false;

    ensureGlobalLeaflet();
    importPromiseRef.current = import("leaflet.heat").then(() => {
      if (cancelled || layerRef.current) return;

      patchSimpleheat();

      // Patch leaflet.heat to prevent "Cannot read properties of null (reading 'getSize')"
      // which happens when a redraw is queued via requestAnimFrame but the layer is removed
      // before it executes.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const HeatLayerProto = (L as any).HeatLayer?.prototype;
      if (HeatLayerProto && !HeatLayerProto._onRemovePatched) {
        HeatLayerProto._onRemovePatched = true;
        const originalOnRemove = HeatLayerProto.onRemove;
        HeatLayerProto.onRemove = function (m: L.Map) {
          if (this._frame) {
            L.Util.cancelAnimFrame(this._frame);
            this._frame = null;
          }
          return originalOnRemove.call(this, m);
        };
      }

      const { maxZoom, minOpacity, gradient } = HEATMAP_CONFIG;
      const initial = heatmapRadiusAt(map.getZoom(), map.getCenter().lat);
      const layer = L.heatLayer(points, {
        radius: initial.radius,
        blur: initial.blur,
        maxZoom,
        minOpacity,
        gradient,
      });

      layerRef.current = layer;
      layer.addTo(map);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const canvas = (layer as any)._canvas as HTMLCanvasElement | undefined;
      if (canvas) {
        canvas.style.opacity = "0.8";
      }

      const onZoomEnd = () => {
        const size = heatmapRadiusAt(map.getZoom(), map.getCenter().lat);
        layer.setOptions({ radius: size.radius, blur: size.blur });
      };
      map.on("zoomend", onZoomEnd);

      cleanupRef.current = () => {
        map.off("zoomend", onZoomEnd);
      };
    });

    return () => {
      cancelled = true;
      if (cleanupRef.current) cleanupRef.current();
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // Subsequent updates: just push new points into the existing layer
  useEffect(() => {
    if (layerRef.current) {
      layerRef.current.setLatLngs(points);
      return;
    }

    // Layer not created yet (import still in-flight) — update points once it resolves
    if (importPromiseRef.current) {
      importPromiseRef.current.then(() => {
        if (layerRef.current) {
          layerRef.current.setLatLngs(points);
        }
      });
    }
  }, [points]);

  return null;
}
