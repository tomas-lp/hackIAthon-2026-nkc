"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TileLayer, useMap } from "react-leaflet";
import { MAP_TILES } from "@/lib/constants";

interface MapTileLayersProps {
  isDark: boolean;
  // Vista satelital elegida por el usuario (toggle "Vista satelital" en
  // LayerControls). Alterna entre el mapa por defecto y ESRI satelital,
  // en ambos modos (claro y oscuro).
  satellite?: boolean;
}

// Orden de fallback automático (ambos modos):
// 0 = CARTO (por defecto) -> 1 = ESRI callejero -> 2 = ESRI satelital.
type BaseLevel = "carto" | "esriStreet" | "esriSatellite";

// Cuántos tiles tienen que fallar en la ventana de tiempo para declarar
// caída la capa actual y pasar a la siguiente.
const TILE_ERROR_THRESHOLD = 6;
const TILE_ERROR_WINDOW_MS = 10_000;

// Pane propio para el satelital: `.leaflet-tile-pane` lleva el filtro azul
// del modo oscuro (diseñado para CARTO dark) y teñiría las fotos aéreas.
// Este pane no tiene filtro, así el satélite se ve igual en ambos modos.
function SatellitePane() {
  const map = useMap();

  useEffect(() => {
    if (!map.getPane("satellitePane")) {
      const pane = map.createPane("satellitePane");
      pane.style.zIndex = "200";
    }
    let labelsPane = map.getPane("satelliteLabelsPane");
    if (!labelsPane) {
      labelsPane = map.createPane("satelliteLabelsPane");
    }
    labelsPane.style.zIndex = "500";
    labelsPane.style.pointerEvents = "none";
    labelsPane.style.filter = "brightness(2.2) contrast(1.5)";
  }, [map]);

  return null;
}

export function MapTileLayers({
  isDark,
  satellite = false,
}: MapTileLayersProps) {
  const [baseLevel, setBaseLevel] = useState<BaseLevel>("carto");
  const errorStamps = useRef<number[]>([]);

  // Al desactivar satelital se vuelve al nivel por defecto (CARTO con fallback).
  useEffect(() => {
    if (!satellite) {
      errorStamps.current = [];
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBaseLevel("carto");
    }
  }, [satellite]);

  const handleTileError = useCallback(() => {
    const now = Date.now();
    errorStamps.current = errorStamps.current.filter(
      (t) => now - t < TILE_ERROR_WINDOW_MS
    );
    errorStamps.current.push(now);
    if (errorStamps.current.length >= TILE_ERROR_THRESHOLD) {
      errorStamps.current = [];
      setBaseLevel((prev) => {
        if (prev === "carto") return "esriStreet";
        if (prev === "esriStreet") return "esriSatellite";
        return prev;
      });
    }
  }, []);

  const handleLoad = useCallback(() => {
    // La capa cargó completa: está viva, se limpia el contador de errores.
    errorStamps.current = [];
  }, []);

  // Satelital manual: ESRI World Imagery directo (igual que
  // ide.corrientes.gob.ar), sin pasar por el proxy. Vale en ambos modos.
  // Encima va la capa transparente de etiquetas CARTO (calles, barrios,
  // ciudades) para lograr vista híbrida con textos.
  if (satellite) {
    return (
      <>
        <SatellitePane />
        <TileLayer
          key="esri-satellite-manual"
          pane="satellitePane"
          attribution={MAP_TILES.esriSatellite.attribution}
          url={MAP_TILES.esriSatellite.url}
          maxZoom={MAP_TILES.esriSatellite.maxZoom}
          maxNativeZoom={MAP_TILES.esriSatellite.maxNativeZoom}
        />
        <TileLayer
          key="esri-satellite-manual-labels"
          className="satellite-labels-layer"
          attribution={MAP_TILES.dark.attribution}
          url={MAP_TILES.darkLabels.url}
          subdomains={MAP_TILES.darkLabels.subdomains}
          maxZoom={22}
          maxNativeZoom={MAP_TILES.darkLabels.maxZoom}
          pane="satelliteLabelsPane"
        />
      </>
    );
  }

  if (baseLevel === "esriStreet") {
    return (
      <TileLayer
        key="esri-street-fallback"
        attribution={MAP_TILES.esriStreet.attribution}
        url={MAP_TILES.esriStreet.url}
        maxZoom={MAP_TILES.esriStreet.maxZoom}
        eventHandlers={{ tileerror: handleTileError, load: handleLoad }}
      />
    );
  }

  if (baseLevel === "esriSatellite") {
    return (
      <>
        <SatellitePane />
        <TileLayer
          key="esri-satellite-fallback"
          pane="satellitePane"
          attribution={MAP_TILES.esriSatellite.attribution}
          url={MAP_TILES.esriSatellite.url}
          maxZoom={MAP_TILES.esriSatellite.maxZoom}
          maxNativeZoom={MAP_TILES.esriSatellite.maxNativeZoom}
        />
        <TileLayer
          key="esri-satellite-fallback-labels"
          className="satellite-labels-layer"
          attribution={MAP_TILES.dark.attribution}
          url={MAP_TILES.darkLabels.url}
          subdomains={MAP_TILES.darkLabels.subdomains}
          maxZoom={22}
          maxNativeZoom={MAP_TILES.darkLabels.maxZoom}
          pane="satelliteLabelsPane"
        />
      </>
    );
  }

  // Base por defecto: CARTO con el mismo detalle de calles en ambos modos
  // (versión clara u oscura según el tema) + capa de etiquetas independiente.
  const base = isDark ? MAP_TILES.dark : MAP_TILES.cartoLight;
  const labels = isDark ? MAP_TILES.darkLabels : MAP_TILES.cartoLightLabels;

  return (
    <>
      {/* Capa base geométrica (calles, ríos, tierra) */}
      <TileLayer
        key={isDark ? "carto-dark-base" : "carto-light-base"}
        attribution={base.attribution}
        url={base.url}
        subdomains={base.subdomains}
        maxZoom={base.maxZoom}
        eventHandlers={{ tileerror: handleTileError, load: handleLoad }}
      />
      {/* Capa de etiquetas independiente: nombres de calles y avenidas */}
      <TileLayer
        key={isDark ? "carto-dark-labels" : "carto-light-labels"}
        url={labels.url}
        subdomains={labels.subdomains}
        maxZoom={labels.maxZoom}
        pane="shadowPane"
      />
    </>
  );
}
