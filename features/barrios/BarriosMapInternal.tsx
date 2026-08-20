"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, Tooltip } from "react-leaflet";
import type { Feature, GeoJsonProperties } from "geojson";
import type { PathOptions } from "leaflet";
import "leaflet/dist/leaflet.css";

// Color por tipo de barrio
const TIPO_COLORS: Record<string, string> = {
  "BARRIOS POR ORDENANZA": "#3b82f6", // blue-500
  "ZONAS EN ORDENAMIENTO": "#f59e0b", // amber-500
  "BARRIOS PRIVADOS": "#8b5cf6", // violet-500
  "ASENTAMIENTOS Y VILLAS": "#ef4444", // red-500
};

const DEFAULT_COLOR = "#6b7280"; // gray-500

function getColor(tipo: string): string {
  return TIPO_COLORS[tipo?.trim().toUpperCase()] ?? DEFAULT_COLOR;
}

function styleFeature(feature: Feature | undefined): PathOptions {
  const tipo = (feature?.properties as GeoJsonProperties)?.tipo ?? "";
  const color = getColor(tipo);
  return {
    color,
    weight: 1.5,
    opacity: 0.85,
    fillColor: color,
    fillOpacity: 0.18,
  };
}

function onEachFeature(feature: Feature, layer: L.Layer) {
  const props = feature.properties as GeoJsonProperties;
  const nombre = props?.nombre ?? "Sin nombre";
  const tipo = props?.tipo ?? "";

  (layer as L.Path).on({
    mouseover(e) {
      const path = e.target as L.Path;
      path.setStyle({ fillOpacity: 0.45, weight: 2.5 });
      path.bringToFront();
    },
    mouseout(e) {
      const path = e.target as L.Path;
      path.setStyle({ fillOpacity: 0.18, weight: 1.5 });
    },
  });
}

interface GeoJsonData {
  type: string;
  features: Feature[];
}

export function BarriosMapInternal() {
  const [geojson, setGeojson] = useState<GeoJsonData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/data/barrios-corrientes.geojson")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setGeojson)
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center text-red-500 text-sm">
        Error cargando barrios: {error}
      </div>
    );
  }

  return (
    <MapContainer
      center={[-27.48, -58.83]}
      zoom={12}
      className="w-full h-full"
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {geojson && (
        <GeoJSON
          key="barrios"
          data={geojson as GeoJsonData & Parameters<typeof GeoJSON>[0]["data"]}
          style={styleFeature}
          onEachFeature={(feature, layer) => {
            onEachFeature(feature, layer);
            const props = feature.properties as GeoJsonProperties;
            const nombre = props?.nombre ?? "Sin nombre";
            const tipo = props?.tipo ?? "";
            (
              layer as L.Layer & {
                bindTooltip: (content: string, opts?: object) => void;
              }
            ).bindTooltip(
              `<strong>${nombre}</strong><br/><span style="font-size:11px;color:#666">${tipo}</span>`,
              { sticky: true, opacity: 0.95 }
            );
          }}
        />
      )}
    </MapContainer>
  );
}
