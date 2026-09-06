"use client";

import { TileLayer } from "react-leaflet";
import { MAP_TILES } from "@/lib/constants";

interface MapTileLayersProps {
  isDark: boolean;
}

export function MapTileLayers({ isDark }: MapTileLayersProps) {
  if (!isDark) {
    return (
      <TileLayer
        key="ign-light"
        attribution={MAP_TILES.light.attribution}
        url={MAP_TILES.light.url}
        subdomains={MAP_TILES.light.subdomains}
        maxZoom={MAP_TILES.light.maxZoom}
      />
    );
  }

  return (
    <>
      {/* Capa base geométrica (calles, ríos, tierra) en azul luminoso legible */}
      <TileLayer
        key="carto-dark-base"
        attribution={MAP_TILES.dark.attribution}
        url={MAP_TILES.dark.url}
        subdomains={MAP_TILES.dark.subdomains}
        maxZoom={MAP_TILES.dark.maxZoom}
      />
      {/* Capa de etiquetas independiente: nombres de calles y avenidas en blanco puro */}
      <TileLayer
        key="carto-dark-labels"
        url={MAP_TILES.darkLabels.url}
        subdomains={MAP_TILES.darkLabels.subdomains}
        maxZoom={MAP_TILES.darkLabels.maxZoom}
        pane="shadowPane"
      />
    </>
  );
}
