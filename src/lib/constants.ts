import { ReportType } from "@/types/report";

export const TYPE_CONFIG: Record<ReportType, { label: string }> = {
  INUNDACION_URBANA: { label: "Calle Inundada / Anegamiento" },
  LLUVIAS_FUERTES: { label: "Lluvias Torrenciales" },
  GRANIZO: { label: "Caída de Granizo" },
  ANEGAMIENTO_VIVIENDA: { label: "Agua en Vivienda" },
};

export const CARTO_API_KEY =
  process.env.NEXT_PUBLIC_CARTO_API_KEY ||
  "cb1_2yht_1_88109e9c8e4e19591b10da3e";

export const MAP_TILES = {
  light: {
    url: "/api/tile/{z}/{x}/{-y}.png",
    attribution:
      '&copy; <a href="https://www.ign.gob.ar/">Instituto Geográfico Nacional</a> (IGN)',
    subdomains: "abc",
    maxZoom: 19,
  },
  dark: {
    url: `https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png?key=${CARTO_API_KEY}`,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 20,
  },
  darkLabels: {
    url: `https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png?key=${CARTO_API_KEY}`,
    subdomains: "abcd",
    maxZoom: 20,
  },
  // Base por defecto en modo claro: mismo proveedor y nivel de detalle
  // de calles que el modo oscuro (CARTO + OSM), en versión clara.
  cartoLight: {
    url: `https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png?key=${CARTO_API_KEY}`,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 20,
  },
  cartoLightLabels: {
    url: `https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png?key=${CARTO_API_KEY}`,
    subdomains: "abcd",
    maxZoom: 20,
  },
  // Fallback automático (modo claro): IGN -> ESRI callejero -> ESRI satelital.
  // Mismo endpoint público y gratuito que usa ide.corrientes.gob.ar
  // (Argenmap), sin API key. Solo requiere atribución.
  esriStreet: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    attribution:
      '&copy; <a href="https://www.esri.com/">Esri</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  esriSatellite: {
    url: "https://server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      'Imágenes satelitales &copy; <a href="https://www.esri.com/">Esri</a> — Source: Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
  },
};
