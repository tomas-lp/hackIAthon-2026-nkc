"use client";

import { useEffect, useRef, MutableRefObject } from "react";
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

const FLY_DURATION = 0.5;
const POPUP_DELAY_MS = 550;
const CLUSTER_THRESHOLD_METERS = 300;

function buildCluster(selected: Report, allReports: Report[]): Report[] {
  const cluster = [selected];
  let unassigned = allReports.filter(
    (r) => r.id !== selected.id && isValidLatLng(r.latitud, r.longitud)
  );

  let changed = true;
  while (changed) {
    changed = false;
    const next: Report[] = [];
    for (const r of unassigned) {
      const belongs = cluster.some(
        (c) =>
          L.latLng(r.latitud, r.longitud).distanceTo(
            L.latLng(c.latitud, c.longitud)
          ) <= CLUSTER_THRESHOLD_METERS
      );
      if (belongs) {
        cluster.push(r);
        changed = true;
      } else {
        next.push(r);
      }
    }
    unassigned = next;
  }

  return cluster;
}

export function MapController({
  selectedReport,
  reports,
  markerRefs,
  selectedSafeZone,
}: MapControllerProps) {
  const map = useMap();
  const popupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reportsRef = useRef(reports);

  useEffect(() => {
    reportsRef.current = reports;
  });

  // Focus on selected report: cluster, fitBounds, open popup
  useEffect(() => {
    if (popupTimeoutRef.current) {
      clearTimeout(popupTimeoutRef.current);
      popupTimeoutRef.current = null;
    }

    if (
      !selectedReport ||
      !isValidLatLng(selectedReport.latitud, selectedReport.longitud)
    ) {
      return;
    }

    const cluster = buildCluster(selectedReport, reportsRef.current);
    const bounds = L.latLngBounds(cluster.map((r) => [r.latitud, r.longitud]));
    if (!bounds.isValid()) return;

    const targetMaxZoom = Math.max(map.getZoom(), 16);
    map.fitBounds(bounds, {
      padding: [50, 50],
      duration: FLY_DURATION,
      animate: true,
      maxZoom: targetMaxZoom,
    });

    popupTimeoutRef.current = setTimeout(() => {
      popupTimeoutRef.current = null;
      const marker = markerRefs.current[selectedReport.id];
      if (marker) marker.openPopup();
    }, POPUP_DELAY_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, selectedReport?.id]);

  // Focus on selected safe zone
  useEffect(() => {
    if (
      !selectedSafeZone ||
      !isValidLatLng(selectedSafeZone.latitud, selectedSafeZone.longitud)
    ) {
      return;
    }

    const bounds = L.latLngBounds([
      [selectedSafeZone.latitud, selectedSafeZone.longitud],
    ]);

    const targetMaxZoom = Math.max(map.getZoom(), 16);
    map.fitBounds(bounds, {
      padding: [50, 50],
      duration: FLY_DURATION,
      animate: true,
      maxZoom: targetMaxZoom,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, selectedSafeZone?.id]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
    };
  }, []);

  return null;
}
