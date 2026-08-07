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

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | null = null;

    ensureGlobalLeaflet();
    void import("leaflet.heat").then(() => {
      if (cancelled) return;

      patchSimpleheat();

      const existing = layerRef.current;
      if (existing) {
        existing.setLatLngs(points);
        return;
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

      // Adjust the opacity of the canvas element directly to make colors slightly more transparent
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

      cleanup = () => {
        map.off("zoomend", onZoomEnd);
      };
    });

    return () => {
      cancelled = true;
      if (cleanup) cleanup();
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, points]);

  return null;
}
