"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";

import { HeatPoint, HEATMAP_CONFIG } from "@/lib/heatmap";

interface HeatLayerProps {
  points: HeatPoint[];
}

function ensureGlobalLeaflet(): void {
  const global = window as unknown as { L?: unknown };
  if (!global.L) {
    (global as { L: typeof L }).L = L;
  }
}

export function HeatLayer({ points }: HeatLayerProps) {
  const map = useMap();
  const layerRef = useRef<L.HeatLayer | null>(null);

  useEffect(() => {
    let cancelled = false;

    ensureGlobalLeaflet();
    void import("leaflet.heat").then(() => {
      if (cancelled) return;

      const existing = layerRef.current;
      if (existing) {
        existing.setLatLngs(points);
        return;
      }

      const { radius, blur, maxZoom, minOpacity, gradient } = HEATMAP_CONFIG;
      const layer = L.heatLayer(points, {
        radius,
        blur,
        maxZoom,
        minOpacity,
        gradient,
      });

      layerRef.current = layer;
      layer.addTo(map);
    });

    return () => {
      cancelled = true;
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, points]);

  return null;
}
