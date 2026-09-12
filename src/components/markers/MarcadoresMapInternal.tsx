"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  Marker,
  Tooltip,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MarkerRow } from "@/types/marker";
import {
  createSafeZoneIcon,
  createHealthCenterIcon,
  createDraftMarkerIcon,
} from "@/lib/markerIcons";
import { ShieldCheck, PlusSquare, Users } from "lucide-react";
import { MapSizeInvalidator } from "@/components/map/MapSizeInvalidator";
import { useDarkMode } from "@/hooks/useDarkMode";
import { MapTileLayers } from "@/components/map/MapTileLayers";

interface MarcadoresMapInternalProps {
  markers: MarkerRow[];
  selectedMarker: MarkerRow | null;
  onSelectMarker: (marker: MarkerRow | null) => void;
  isCreating: boolean;
  creatingCategory: "EVACUACION" | "SALUD";
  draftLocation: { lat: number; lng: number } | null;
  onMapClickToCreate: (lat: number, lng: number) => void;
  className?: string;
}

const CORRIENTES_CENTER: [number, number] = [-27.4692, -58.8306];
const INITIAL_ZOOM = 13;

// Subcomponente para enfocar y centrar en el marcador seleccionado
function MarkerFocuser({
  selectedMarker,
}: {
  selectedMarker: MarkerRow | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedMarker && selectedMarker.lat && selectedMarker.lon) {
      map.flyTo([selectedMarker.lat, selectedMarker.lon], 16, {
        duration: 1.2,
      });
    }
  }, [selectedMarker, map]);

  return null;
}

// Subcomponente para capturar clics en el mapa durante el modo creación
function MapClickHandler({
  isCreating,
  onMapClick,
}: {
  isCreating: boolean;
  onMapClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (isCreating) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });

  return null;
}

// Subcomponente para sincronizar el nivel de zoom y redibujar iconos escalados
function ZoomWatcher({ onZoomChange }: { onZoomChange: (z: number) => void }) {
  const map = useMapEvents({
    zoomend() {
      onZoomChange(map.getZoom());
    },
  });
  return null;
}

export default function MarcadoresMapInternal({
  markers,
  selectedMarker,
  onSelectMarker,
  isCreating,
  creatingCategory,
  draftLocation,
  onMapClickToCreate,
  className = "w-full h-full",
}: MarcadoresMapInternalProps) {
  const [currentZoom, setCurrentZoom] = useState<number>(INITIAL_ZOOM);
  const { isDark } = useDarkMode();

  // Asegurar que Leaflet tenga los paths de imágenes base
  useEffect(() => {
    delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
      ._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
      iconUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
      shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    });
  }, []);

  const safeZoneIcon = createSafeZoneIcon(currentZoom);
  const healthCenterIcon = createHealthCenterIcon(currentZoom, true);
  const draftIcon = createDraftMarkerIcon(currentZoom, creatingCategory);

  return (
    <div
      className={`relative ${className} ${isCreating ? "cursor-crosshair" : ""}`}
    >
      {/* Banner superior flotante cuando está en modo creación */}
      {isCreating && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/95 dark:bg-[#161f36]/95 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-gray-200 dark:border-[#2b395b] flex items-center gap-2 animate-in fade-in slide-in-from-top-3 duration-200 pointer-events-none">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
          </span>
          <span className="text-xs font-semibold text-zinc-800 dark:text-white">
            Haz clic en el mapa para colocar el marcador
          </span>
        </div>
      )}

      {/* Referencias en la esquina inferior izquierda (igual que en Home) */}
      <div className="absolute bottom-4 left-4 z-[999] hidden sm:flex items-center gap-3 bg-white/90 dark:bg-[#161f36]/90 backdrop-blur-md rounded-full px-3.5 py-1.5 border border-gray-200 dark:border-[#2b395b] shadow-sm text-xs font-medium text-zinc-700 dark:text-slate-200">
        <span className="font-semibold text-zinc-900 dark:text-white">
          Referencias
        </span>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[8px]">
            ✓
          </div>
          <span>Centros de evacuación</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-blue-600 flex items-center justify-center text-white text-[9px] font-bold">
            +
          </div>
          <span>Centros de at. médica</span>
        </div>
      </div>

      <MapContainer
        center={CORRIENTES_CENTER}
        zoom={INITIAL_ZOOM}
        scrollWheelZoom={true}
        zoomControl={false}
        className="w-full h-full z-0"
      >
        <MapTileLayers isDark={isDark} />

        <MapSizeInvalidator />
        <ZoomWatcher onZoomChange={setCurrentZoom} />
        <MarkerFocuser selectedMarker={selectedMarker} />
        <MapClickHandler
          isCreating={isCreating}
          onMapClick={onMapClickToCreate}
        />

        {/* Marcadores guardados */}
        {markers.map((marker) => {
          if (!marker.lat || !marker.lon) return null;
          const isSelected = selectedMarker?.id === marker.id;
          const icon =
            marker.category === "EVACUACION" ? safeZoneIcon : healthCenterIcon;

          return (
            <Marker
              key={marker.id}
              position={[marker.lat, marker.lon]}
              icon={icon}
              zIndexOffset={isSelected ? 1000 : 500}
              eventHandlers={{
                click: () => onSelectMarker(marker),
              }}
            >
              <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                <div className="text-xs font-semibold flex items-center gap-1.5 py-0.5">
                  {marker.category === "EVACUACION" ? (
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <PlusSquare className="h-3.5 w-3.5 text-red-600" />
                  )}
                  <span>{marker.nombre}</span>
                </div>
              </Tooltip>

              <Popup className="custom-marker-popup">
                <div className="p-1 min-w-[200px] text-xs">
                  <div className="flex items-center gap-1.5 mb-1.5 font-bold text-zinc-900 dark:text-white border-b border-gray-100 dark:border-[#2b395b] pb-1">
                    {marker.category === "EVACUACION" ? (
                      <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <PlusSquare className="h-4 w-4 text-red-600 dark:text-red-400" />
                    )}
                    <span>{marker.nombre}</span>
                  </div>

                  <div className="flex flex-col gap-1 text-zinc-600 dark:text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 dark:text-slate-400">
                        Tipo:
                      </span>
                      <span className="font-semibold text-zinc-800 dark:text-white">
                        {marker.subtipo}
                      </span>
                    </div>

                    {marker.direccion && (
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400 dark:text-slate-400">
                          Dirección:
                        </span>
                        <span className="text-zinc-700 dark:text-slate-200 text-right truncate max-w-[140px]">
                          {marker.direccion}
                        </span>
                      </div>
                    )}

                    {marker.localidad && (
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400 dark:text-slate-400">
                          Localidad:
                        </span>
                        <span className="text-zinc-700 dark:text-slate-200">
                          {marker.localidad}
                        </span>
                      </div>
                    )}

                    {marker.capacidad_maxima !== null &&
                      marker.capacidad_maxima !== undefined && (
                        <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 font-semibold mt-1 pt-1 border-t border-gray-100 dark:border-[#2b395b]">
                          <span className="flex items-center gap-1 text-zinc-500 dark:text-slate-400 font-normal">
                            <Users className="h-3.5 w-3.5" />
                            Capacidad:
                          </span>
                          <span>{marker.capacidad_maxima} personas</span>
                        </div>
                      )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Draft marker al hacer clic */}
        {draftLocation && (
          <Marker
            position={[draftLocation.lat, draftLocation.lng]}
            icon={draftIcon}
            zIndexOffset={2000}
          />
        )}
      </MapContainer>
    </div>
  );
}
