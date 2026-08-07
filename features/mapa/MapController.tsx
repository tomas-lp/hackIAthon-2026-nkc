"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { Report } from "@/types/report";

interface MapControllerProps {
  selectedReport: Report | null;
}

function isValidLatLng(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng);
}

export function MapController({ selectedReport }: MapControllerProps) {
  const map = useMap();

  useEffect(() => {
    if (
      selectedReport &&
      isValidLatLng(selectedReport.latitud, selectedReport.longitud)
    ) {
      map.flyTo([selectedReport.latitud, selectedReport.longitud], 13, {
        duration: 1.2,
      });
    }
  }, [map, selectedReport]);

  return null;
}
