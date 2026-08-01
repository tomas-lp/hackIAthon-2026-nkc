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

type LeafletHeatLayer = L.Layer & {
  setLatLngs: (latlngs: Array<[number, number, number]>) => void;
  redraw: () => void;
};

export function HeatmapLayer({ points }: HeatmapLayerProps) {
  const map = useMap();
  const heatLayerRef = useRef<LeafletHeatLayer | null>(null);
  const pointsRef = useRef(points);

  useEffect(() => {
    pointsRef.current = points;

    if (!heatLayerRef.current) {
      return;
    }

    const heatPoints: Array<[number, number, number]> = pointsRef.current.map(
      (p) => [p.lat, p.lng, p.intensity]
    );

    try {
      heatLayerRef.current.setLatLngs(heatPoints);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (heatLayerRef.current as any)._reset();
      heatLayerRef.current.redraw();
    } catch (error) {
      console.warn("Heatmap update skipped", error);
    }
  }, [points]);

  useEffect(() => {
    if (!map) return;

    if (!heatLayerRef.current) {
      // @ts-expect-error L.heatLayer comes from leaflet.heat plugin
      const heatLayer = L.heatLayer([], {
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

      heatLayerRef.current = heatLayer as LeafletHeatLayer;
      heatLayerRef.current.addTo(map);
    }

    let animationFrameId: number | null = null;

    const updateHeatmap = () => {
      if (!map || !heatLayerRef.current) {
        return;
      }

      const heatPoints: Array<[number, number, number]> = pointsRef.current.map(
        (p) => [p.lat, p.lng, p.intensity]
      );

      try {
        heatLayerRef.current.setLatLngs(heatPoints);
        heatLayerRef.current._reset();
        heatLayerRef.current.redraw();
      } catch (error) {
        console.warn("Heatmap redraw skipped", error);
      }
    };

    const scheduleHeatmapUpdate = () => {
      if (animationFrameId !== null) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(() => {
        animationFrameId = null;
        updateHeatmap();
      });
    };

    const initializeHeatmap = () => {
      if (!map || !heatLayerRef.current) return;

      if (!map.hasLayer(heatLayerRef.current)) {
        heatLayerRef.current.addTo(map);
      }

      scheduleHeatmapUpdate();
    };

    map.whenReady(initializeHeatmap);
    map.on("move zoom drag resize viewreset", scheduleHeatmapUpdate);

    return () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }

      map.off("move zoom drag resize viewreset", scheduleHeatmapUpdate);
      if (heatLayerRef.current && map.hasLayer(heatLayerRef.current)) {
        map.removeLayer(heatLayerRef.current);
      }
      heatLayerRef.current = null;
    };
  }, [map]);

  return null;
}
