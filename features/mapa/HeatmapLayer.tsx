"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

export interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
}

interface HeatmapLayerProps {
  points: HeatmapPoint[];
}

export function HeatmapLayer({ points }: HeatmapLayerProps) {
  const map = useMap();
  const heatLayerRef = useRef<L.Layer | null>(null);

  useEffect(() => {
    if (!map) return;

    const heatPoints: Array<[number, number, number]> = points.map((p) => [
      p.lat,
      p.lng,
      p.intensity,
    ]);

    // @ts-expect-error L.heatLayer comes from leaflet.heat plugin
    const heatLayer = L.heatLayer(heatPoints, {
      radius: 45,
      blur: 22,
      maxZoom: 10,
      minOpacity: 0.2,
      gradient: {
        0.25: "#3b82f6", // BAJO (Azul)
        0.55: "#eab308", // MEDIO (Amarillo)
        0.85: "#f97316", // ALTO (Naranja)
        1.0: "#ef4444", // CRITICO (Rojo)
      },
    });

    heatLayerRef.current = heatLayer;

    const redrawHeatmap = () => {
      if (
        !map ||
        !heatLayerRef.current ||
        !map.hasLayer(heatLayerRef.current)
      ) {
        return;
      }

      try {
        heatLayerRef.current.setLatLngs(heatPoints);
        heatLayerRef.current.redraw();
      } catch (error) {
        console.warn("Heatmap redraw skipped", error);
      }
    };

    const initializeHeatmap = () => {
      if (!map || !heatLayerRef.current) return;

      if (!map.hasLayer(heatLayerRef.current)) {
        heatLayerRef.current.addTo(map);
      }

      requestAnimationFrame(() => {
        redrawHeatmap();
      });
    };

    map.whenReady(initializeHeatmap);
    map.on("move zoom viewreset", redrawHeatmap);

    return () => {
      map.off("move zoom viewreset", redrawHeatmap);
      if (heatLayerRef.current && map.hasLayer(heatLayerRef.current)) {
        map.removeLayer(heatLayerRef.current);
      }
      heatLayerRef.current = null;
    };
  }, [map, points]);

  return null;
}
