"use client";

import { useEffect } from "react";
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

  useEffect(() => {
    if (!map) return;

    const heatPoints: Array<[number, number, number]> = points.map((p) => [
      p.lat,
      p.lng,
      p.intensity,
    ]);

    // @ts-expect-error L.heatLayer comes from leaflet.heat plugin
    const heatLayer = L.heatLayer(heatPoints, {
      radius: 28,
      blur: 18,
      maxZoom: 14,
      minOpacity: 0.35,
      gradient: {
        0.2: "#3b82f6", // BAJO (Azul)
        0.45: "#eab308", // MEDIO (Amarillo)
        0.7: "#f97316", // ALTO (Naranja)
        1.0: "#ef4444", // CRITICO (Rojo)
      },
    });

    heatLayer.addTo(map);

    return () => {
      if (map && heatLayer) {
        map.removeLayer(heatLayer);
      }
    };
  }, [map, points]);

  return null;
}
