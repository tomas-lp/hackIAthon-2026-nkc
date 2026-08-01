"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { Report } from "@/types/report";

interface MapControllerProps {
  selectedReport: Report | null;
}

export function MapController({ selectedReport }: MapControllerProps) {
  const map = useMap();

  useEffect(() => {
    if (selectedReport) {
      map.flyTo([selectedReport.latitud, selectedReport.longitud], 13, {
        duration: 1.2,
      });
    }
  }, [map, selectedReport]);

  return null;
}
