"use client";

import { useEffect, MutableRefObject } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { Report } from "@/types/report";
import { SafeZone } from "@/types/safeZone";

interface MapControllerProps {
  selectedReport: Report | null;
  reports: Report[];
  markerRefs: MutableRefObject<Record<string, L.Marker | null>>;
  selectedSafeZone?: SafeZone | null;
}

function isValidLatLng(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng);
}

export function MapController({
  selectedReport,
  reports,
  markerRefs,
  selectedSafeZone,
}: MapControllerProps) {
  const map = useMap();

  useEffect(() => {
    if (
      selectedReport &&
      isValidLatLng(selectedReport.latitud, selectedReport.longitud)
    ) {
      const thresholdMeters = 300;

      const cluster = [selectedReport];
      let unassigned = reports.filter(
        (r) =>
          r.id !== selectedReport.id && isValidLatLng(r.latitud, r.longitud)
      );

      let changed = true;
      while (changed) {
        changed = false;
        const newUnassigned = [];
        for (const r of unassigned) {
          let belongsToCluster = false;
          for (const c of cluster) {
            const dist = L.latLng(r.latitud, r.longitud).distanceTo(
              L.latLng(c.latitud, c.longitud)
            );
            if (dist <= thresholdMeters) {
              belongsToCluster = true;
              break;
            }
          }
          if (belongsToCluster) {
            cluster.push(r);
            changed = true;
          } else {
            newUnassigned.push(r);
          }
        }
        unassigned = newUnassigned;
      }

      const bounds = L.latLngBounds(
        cluster.map((r) => [r.latitud, r.longitud])
      );

      if (bounds.isValid()) {
        const currentZoom = map.getZoom();
        const targetMaxZoom = Math.max(currentZoom, 16);

        // Usamos fitBounds en lugar de flyToBounds para que sea una transición directa y rápida,
        // evitando el "zoom out" pronunciado que desincroniza el mapa de calor y rompe la UI.
        map.fitBounds(bounds, {
          padding: [50, 50],
          duration: 0.5,
          animate: true,
          maxZoom: targetMaxZoom,
        });

        // Retrasamos la apertura del popup para que la animación termine limpia sin interrupciones de UI.
        setTimeout(() => {
          const marker = markerRefs.current[selectedReport.id];
          if (marker) {
            marker.openPopup();
          }
        }, 550);
      }
    } else if (
      selectedSafeZone &&
      isValidLatLng(selectedSafeZone.latitud, selectedSafeZone.longitud)
    ) {
      const currentZoom = map.getZoom();
      const targetZoom = Math.max(currentZoom, 16);
      map.flyTo(
        [selectedSafeZone.latitud, selectedSafeZone.longitud],
        targetZoom,
        {
          duration: 0.5,
        }
      );
    }
  }, [map, selectedReport, reports, markerRefs, selectedSafeZone]);

  return null;
}
