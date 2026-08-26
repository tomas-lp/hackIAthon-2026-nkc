"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SafeZone, SafeZoneType } from "@/types/safeZone";
import { HealthCenter, HealthCenterType } from "@/types/healthCenter";
import { Report } from "@/types/report";
import {
  MarkerRow,
  MarkerCategory,
  SAFE_ZONE_TYPE_LABELS,
  HEALTH_CENTER_TYPE_LABELS,
} from "@/types/marker";
import { User } from "@supabase/supabase-js";
import { Sidebar } from "@/components/common/Sidebar";
import { AuthWidget, LoginModal } from "@/components/common/AuthWidget";
import { MarcadoresTableUI } from "./MarcadoresTableUI";
import { MarcadoresMap } from "./MarcadoresMap";
import { MarkerCreationModal, MarkerFormData } from "./MarkerCreationModal";
import { safeZoneService } from "@/services/safeZoneService";
import { healthCenterService } from "@/services/healthCenterService";
import { useReports } from "@/hooks/useReports";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { TooltipSign } from "@/components/ui/TooltipSign";
import { resolveLocationDetails, geocodeAddress } from "@/lib/geocode";
import { SafeZoneDetailSidebar } from "@/components/map/SafeZoneDetailSidebar";
import { SafeZoneModal } from "@/components/map/SafeZoneModal";
import { HealthCenterModal } from "@/components/map/HealthCenterModal";

import { BarriosFeatureCollection } from "@/services/barrioService";
import { RegionLista, RegionPersonalizada } from "@/types/region";

interface MarcadoresDashboardProps {
  initialSafeZones: SafeZone[];
  initialHealthCenters: HealthCenter[];
  initialReports: Report[];
  initialBarriosGeoJson?: BarriosFeatureCollection | null;
  initialRegionLists?: RegionLista[];
  initialCustomRegions?: RegionPersonalizada[];
  user: User | null;
}

export function MarcadoresDashboard({
  initialSafeZones,
  initialHealthCenters,
  initialReports,
  initialBarriosGeoJson,
  initialRegionLists,
  initialCustomRegions,
  user,
}: MarcadoresDashboardProps) {
  const router = useRouter();
  const [safeZones, setSafeZones] = useState<SafeZone[]>(initialSafeZones);
  const [healthCenters, setHealthCenters] =
    useState<HealthCenter[]>(initialHealthCenters);
  const barriosGeoJson = initialBarriosGeoJson || null;
  const regionLists = initialRegionLists || [];
  const customRegions = initialCustomRegions || [];

  const [activeAdminTab, setActiveAdminTab] = useState<string>("Marcadores");
  const [activeCategoryFilter, setActiveCategoryFilter] =
    useState<string>("TODOS");

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<MarkerRow | null>(null);
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditingSafeZone, setIsEditingSafeZone] = useState(false);
  const [isEditingHealthCenter, setIsEditingHealthCenter] = useState(false);
  const [creatingCategory, setCreatingCategory] =
    useState<MarkerCategory>("EVACUACION");
  const [draftLocation, setDraftLocation] = useState<{
    lat: number;
    lng: number;
    localidad?: string;
    departamento?: string;
    direccion?: string;
    fullAddress?: string;
  } | null>(null);
  const [showCreationModal, setShowCreationModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const {
    reports,
    filters,
    loading,
    error,
    selectedReport,
    setSelectedReport,
    updateFilter,
    resetFilters,
  } = useReports(initialReports);

  // Refrescar marcadores desde la base de datos
  const refreshData = useCallback(async () => {
    try {
      const [fetchedSafeZones, fetchedHealthCenters] = await Promise.all([
        safeZoneService.getSafeZones(),
        healthCenterService.getHealthCenters(),
      ]);
      setSafeZones(fetchedSafeZones);
      setHealthCenters(fetchedHealthCenters);
    } catch (err) {
      console.error("Error al refrescar marcadores:", err);
    }
  }, []);

  // Mapear SafeZones y HealthCenters a MarkerRow[] unificado
  const unifiedMarkers: MarkerRow[] = useMemo(() => {
    const szRows: MarkerRow[] = safeZones.map((sz) => ({
      id: sz.id,
      category: "EVACUACION",
      nombre: sz.nombre,
      subtipo:
        (sz.tipo && (sz.tipo as SafeZoneType) in SAFE_ZONE_TYPE_LABELS
          ? SAFE_ZONE_TYPE_LABELS[sz.tipo as SafeZoneType]
          : null) || "Refugio Municipal",
      rawTipo: sz.tipo || "REFUGIO_MUNICIPAL",
      localidad: sz.localidad || null,
      departamento: sz.departamento || null,
      direccion: sz.direccion || null,
      descripcion: sz.descripcion || null,
      capacidad_maxima: sz.capacidad_maxima ?? null,
      lat: sz.latitud,
      lon: sz.longitud,
      fecha: sz.created_at,
    }));

    const hcRows: MarkerRow[] = healthCenters
      .filter((hc) => hc.lat !== null && hc.lon !== null)
      .map((hc) => ({
        id: hc.id,
        category: "SALUD",
        nombre: hc.nombre,
        subtipo: HEALTH_CENTER_TYPE_LABELS[hc.tipo] || hc.tipo,
        rawTipo: hc.tipo,
        localidad: hc.localidad || null,
        departamento: hc.departamento || null,
        direccion: hc.direccion || null,
        descripcion: null,
        capacidad_maxima: null,
        lat: hc.lat!,
        lon: hc.lon!,
        fecha: hc.updated_at,
      }));

    return [...szRows, ...hcRows];
  }, [safeZones, healthCenters]);

  // Manejo de navegación en menú lateral
  const handleAdminTabChange = (tab: string) => {
    if (tab === "Mapa") {
      router.push("/");
    } else if (tab === "Regiones") {
      router.push("/regiones-personalizadas");
    } else {
      setActiveAdminTab(tab);
    }
  };

  // Iniciar flujo de creación
  const handleStartCreateMarker = () => {
    setIsMapVisible(true);
    setIsCreating(true);
    setSidebarCollapsed(true);
    setCreatingCategory(
      activeCategoryFilter === "SALUD" ? "SALUD" : "EVACUACION"
    );
    setSelectedMarker(null);
    setDraftLocation(null);
  };

  // Click en el mapa para capturar ubicación
  const handleMapClickToCreate = async (lat: number, lng: number) => {
    let loc = {
      direccion: `Lat ${lat.toFixed(4)}, Lon ${lng.toFixed(4)}`,
      localidad: "Corrientes",
      departamento: "Capital",
      fullAddress: "",
    };

    try {
      loc = await resolveLocationDetails(lat, lng);
    } catch {
      // Ignorar fallback
    }

    setDraftLocation({
      lat,
      lng,
      localidad: loc.localidad,
      departamento: loc.departamento,
      direccion: loc.direccion,
      fullAddress: loc.fullAddress,
    });
    setShowCreationModal(true);
  };

  // Guardar nuevo marcador
  const handleSaveMarker = async (data: MarkerFormData) => {
    if (!draftLocation) return;

    try {
      if (data.category === "EVACUACION") {
        await safeZoneService.createSafeZone({
          nombre: data.nombre,
          tipo: data.tipoEvacuacion,
          latitud: draftLocation.lat,
          longitud: draftLocation.lng,
          direccion: data.direccion || draftLocation.direccion || null,
          localidad: data.localidad || draftLocation.localidad || null,
          departamento: data.departamento || draftLocation.departamento || null,
          descripcion: data.descripcion || null,
          capacidad_maxima: data.capacidadMaxima
            ? parseInt(data.capacidadMaxima, 10)
            : null,
        });
      } else {
        await healthCenterService.createHealthCenter({
          nombre: data.nombre,
          tipo: data.tipoSalud,
          lat: draftLocation.lat,
          lon: draftLocation.lng,
          direccion: data.direccion || draftLocation.direccion || null,
          localidad: data.localidad || draftLocation.localidad || null,
          departamento: data.departamento || draftLocation.departamento || null,
        });
      }

      await refreshData();
      setShowCreationModal(false);
      setDraftLocation(null);
      setIsCreating(true);
    } catch (err) {
      console.error("Error al guardar marcador:", err);
      alert("Error al guardar el marcador.");
    }
  };

  // Eliminar marcadores (ids)
  const handleDeleteMarkers = async (ids: string[]) => {
    try {
      const safeZoneIds = safeZones
        .filter((sz) => ids.includes(sz.id))
        .map((sz) => sz.id);
      const healthCenterIds = healthCenters
        .filter((hc) => ids.includes(hc.id))
        .map((hc) => hc.id);

      await Promise.all([
        safeZoneIds.length > 0
          ? safeZoneService.deleteSafeZones(safeZoneIds)
          : Promise.resolve(),
        healthCenterIds.length > 0
          ? healthCenterService.deleteHealthCenters(healthCenterIds)
          : Promise.resolve(),
      ]);

      await refreshData();
    } catch (err) {
      console.error("Error al eliminar marcadores:", err);
      alert("Error al eliminar marcadores.");
    }
  };

  // Actualizar marcador (nombre, dirección, tipo, capacidad_maxima)
  // Si la dirección fue editada, se geocodifica automáticamente para reubicar el marcador en el mapa
  const handleUpdateMarker = async (
    id: string,
    data: {
      nombre: string;
      direccion: string;
      tipo?: string;
      capacidad_maxima?: number | null;
    }
  ) => {
    try {
      const isSafeZone = safeZones.some((sz) => sz.id === id);
      const existingMarker = isSafeZone
        ? safeZones.find((sz) => sz.id === id)
        : healthCenters.find((hc) => hc.id === id);

      const oldAddress = existingMarker?.direccion || "";
      const isAddressChanged =
        data.direccion && data.direccion.trim() !== oldAddress.trim();

      let newCoords: {
        lat: number;
        lon: number;
        localidad?: string;
        departamento?: string;
      } | null = null;

      if (isAddressChanged && data.direccion.trim()) {
        const geo = await geocodeAddress(data.direccion.trim());
        if (geo) {
          newCoords = {
            lat: geo.lat,
            lon: geo.lon,
            localidad: geo.localidad,
            departamento: geo.departamento,
          };
        }
      }

      if (isSafeZone) {
        await safeZoneService.updateSafeZone(id, {
          nombre: data.nombre,
          direccion: data.direccion,
          ...(newCoords
            ? {
                latitud: newCoords.lat,
                longitud: newCoords.lon,
                localidad: newCoords.localidad,
                departamento: newCoords.departamento,
              }
            : {}),
          ...(data.tipo ? { tipo: data.tipo as SafeZoneType } : {}),
          ...(data.capacidad_maxima !== undefined
            ? { capacidad_maxima: data.capacidad_maxima }
            : {}),
        });
      } else {
        await healthCenterService.updateHealthCenter(id, {
          nombre: data.nombre,
          direccion: data.direccion,
          ...(newCoords
            ? {
                lat: newCoords.lat,
                lon: newCoords.lon,
                localidad: newCoords.localidad,
                departamento: newCoords.departamento,
              }
            : {}),
          ...(data.tipo ? { tipo: data.tipo as HealthCenterType } : {}),
        });
      }
      await refreshData();
    } catch (err) {
      console.error("Error al actualizar marcador:", err);
      alert("Error al actualizar marcador.");
    }
  };

  // Seleccionar marcador y enfocar en mapa
  const handleSelectMarker = (marker: MarkerRow) => {
    setSelectedMarker(marker);
    setIsMapVisible(true);
    setSidebarCollapsed(true);
  };

  // Volver a la vista de tabla
  const handleBackToList = () => {
    setIsMapVisible(false);
    setSelectedMarker(null);
    setIsCreating(false);
    setDraftLocation(null);
    setSidebarCollapsed(false);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-zinc-100 font-sans">
      {/* Botón flotante para volver a la tabla si está en mapa enfocado */}
      {isMapVisible && (
        <div className="absolute left-6 top-6 z-[100]">
          <TooltipSign label="Volver a la lista de marcadores" position="right">
            <button
              onClick={handleBackToList}
              className="flex items-center justify-center h-11 w-11 rounded-2xl border border-gray-200 bg-white text-zinc-700 shadow-md hover:bg-gray-50 hover:text-zinc-900 transition-all active:scale-95 cursor-pointer"
              aria-label="Volver a la lista"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          </TooltipSign>
        </div>
      )}

      {/* Botón flotante para abrir sidebar si está colapsado */}
      {sidebarCollapsed && !isMapVisible && (
        <button
          onClick={() => setSidebarCollapsed(false)}
          className="absolute left-0 top-6 z-[100] flex items-center justify-center rounded-r-xl border border-l-0 border-gray-200 bg-white px-1.5 py-3 text-gray-400 shadow-md transition-colors hover:bg-gray-50 hover:text-gray-600 cursor-pointer"
          title="Mostrar panel"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* Menú lateral izquierdo (Sidebar de navegación) */}
      <div
        className="absolute left-0 top-0 z-[100] transition-transform duration-300 ease-in-out"
        style={{
          transform:
            sidebarCollapsed || isMapVisible
              ? "translateX(-110%)"
              : "translateX(0)",
        }}
      >
        <Sidebar
          reports={reports}
          filters={filters}
          loading={loading}
          error={error}
          selectedReport={selectedReport}
          onSelectReport={(r) => setSelectedReport(r)}
          onUpdateFilter={updateFilter}
          onResetFilters={resetFilters}
          isAdmin={true}
          activeAdminTab={activeAdminTab}
          onAdminTabChange={handleAdminTabChange}
          fullHeight={true}
          onCollapse={() => setSidebarCollapsed(true)}
        />
      </div>

      {/* Widget de Usuario cuando está en vista de mapa */}
      {isMapVisible && !isCreating && (
        <AuthWidget
          isAdmin={!!user}
          onLoginClick={() => setShowLoginModal(true)}
          onLogoutClick={async () => {
            const { logoutFromSession } = await import("@/app/auth/actions");
            await logoutFromSession();
            window.location.href = "/";
          }}
        />
      )}

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={() => setShowLoginModal(false)}
      />

      {/* Modal para crear nuevo marcador */}
      <MarkerCreationModal
        isOpen={showCreationModal}
        onClose={() => {
          setShowCreationModal(false);
          setDraftLocation(null);
          setIsCreating(true);
        }}
        onSave={handleSaveMarker}
        initialCategory={creatingCategory}
        initialLocation={draftLocation}
      />

      {/* Contenido Principal: Tabla de Marcadores o Mapa Limpio */}
      {!isMapVisible ? (
        <div
          className={`flex-1 flex flex-col h-full overflow-y-auto pt-16 pb-12 transition-all duration-300 ease-in-out ${
            sidebarCollapsed ? "pl-14 pr-6" : "pl-80 pr-6"
          }`}
        >
          <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-2 font-sans flex flex-col gap-5">
            {/* Encabezado Superior */}
            <div className="flex items-center justify-between gap-4 mb-1">
              <div>
                <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">
                  Marcadores
                </h1>
              </div>

              <AuthWidget
                isAdmin={!!user}
                onLoginClick={() => setShowLoginModal(true)}
                onLogoutClick={async () => {
                  const { logoutFromSession } =
                    await import("@/app/auth/actions");
                  await logoutFromSession();
                  window.location.href = "/";
                }}
              />
            </div>

            {/* Contenido: Tabla de Marcadores */}
            <MarcadoresTableUI
              markers={unifiedMarkers}
              activeCategoryFilter={activeCategoryFilter}
              onCategoryFilterChange={setActiveCategoryFilter}
              barriosGeoJson={barriosGeoJson}
              regionLists={regionLists}
              customRegions={customRegions}
              onSelectMarker={handleSelectMarker}
              onCreateMarker={handleStartCreateMarker}
              onDeleteMarkers={handleDeleteMarkers}
              onUpdateMarker={handleUpdateMarker}
              selectedMarkerId={selectedMarker?.id || null}
            />
          </div>
        </div>
      ) : (
        <section className="absolute inset-0 h-full w-full">
          <MarcadoresMap
            markers={
              activeCategoryFilter === "TODOS"
                ? unifiedMarkers
                : unifiedMarkers.filter(
                    (m) => m.category === activeCategoryFilter
                  )
            }
            selectedMarker={selectedMarker}
            onSelectMarker={setSelectedMarker}
            isCreating={isCreating}
            creatingCategory={creatingCategory}
            draftLocation={draftLocation}
            onMapClickToCreate={handleMapClickToCreate}
          />

          {/* Botones de acción durante el modo creación */}
          {isCreating && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] flex gap-3">
              <button
                onClick={() => {
                  setIsCreating(false);
                  setDraftLocation(null);
                  setIsMapVisible(false);
                  setSidebarCollapsed(false);
                }}
                className="flex items-center justify-center gap-2 rounded-full border border-red-200 bg-white px-6 py-2.5 text-sm font-bold text-red-600 shadow-xl transition-all duration-200 hover:bg-red-50 hover:scale-105 active:scale-95 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          )}
        </section>
      )}

      {/* Sidebar de detalle al seleccionar un marcador en el mapa */}
      {isMapVisible &&
        selectedMarker &&
        !isEditingSafeZone &&
        !isEditingHealthCenter && (
          <SafeZoneDetailSidebar
            safeZone={{
              id: selectedMarker.id,
              nombre: selectedMarker.nombre,
              tipo: selectedMarker.rawTipo,
              descripcion: selectedMarker.descripcion,
              localidad: selectedMarker.localidad,
              departamento: selectedMarker.departamento,
              direccion: selectedMarker.direccion,
              capacidad_maxima: selectedMarker.capacidad_maxima,
              latitud: selectedMarker.lat,
              longitud: selectedMarker.lon,
              created_at: selectedMarker.fecha,
            }}
            isOpen={true}
            onClose={() => setSelectedMarker(null)}
            categoryTitle={
              selectedMarker.category === "EVACUACION"
                ? "Centro de evacuación"
                : "Centro de salud"
            }
            typeText={
              selectedMarker.category === "SALUD"
                ? selectedMarker.rawTipo
                : undefined
            }
            onEdit={() => {
              if (selectedMarker.category === "EVACUACION") {
                setIsEditingSafeZone(true);
              } else {
                setIsEditingHealthCenter(true);
              }
            }}
            onDelete={async () => {
              await handleDeleteMarkers([selectedMarker.id]);
              setSelectedMarker(null);
            }}
          />
        )}

      {/* Modal para editar Centro de Evacuación */}
      {isEditingSafeZone && selectedMarker && (
        <SafeZoneModal
          isOpen={true}
          title="Editar Centro de Evacuación"
          initialData={{
            nombre: selectedMarker.nombre,
            tipo: selectedMarker.rawTipo as SafeZoneType,
            capacidad_maxima: selectedMarker.capacidad_maxima,
            direccion: selectedMarker.direccion,
            localidad: selectedMarker.localidad,
            departamento: selectedMarker.departamento,
            descripcion: selectedMarker.descripcion,
          }}
          onClose={() => setIsEditingSafeZone(false)}
          onSave={async (dto) => {
            await safeZoneService.updateSafeZone(selectedMarker.id, dto);
            await refreshData();
            setIsEditingSafeZone(false);
            setSelectedMarker((prev) =>
              prev
                ? {
                    ...prev,
                    nombre: dto.nombre,
                    rawTipo: dto.tipo || prev.rawTipo,
                    subtipo:
                      dto.tipo &&
                      (dto.tipo as SafeZoneType) in SAFE_ZONE_TYPE_LABELS
                        ? SAFE_ZONE_TYPE_LABELS[dto.tipo as SafeZoneType]
                        : prev.subtipo,
                    capacidad_maxima: dto.capacidad_maxima ?? null,
                    direccion: dto.direccion ?? null,
                    localidad: dto.localidad ?? null,
                    departamento: dto.departamento ?? null,
                    descripcion: dto.descripcion ?? null,
                  }
                : null
            );
          }}
        />
      )}

      {/* Modal para editar Centro de Salud */}
      {isEditingHealthCenter && selectedMarker && (
        <HealthCenterModal
          isOpen={true}
          title="Editar Centro de Salud"
          initialData={{
            nombre: selectedMarker.nombre,
            tipo: (selectedMarker.rawTipo as HealthCenterType) || "HOSPITAL",
          }}
          onClose={() => setIsEditingHealthCenter(false)}
          onSave={async (data) => {
            await healthCenterService.updateHealthCenter(
              selectedMarker.id,
              data
            );
            await refreshData();
            setIsEditingHealthCenter(false);
            setSelectedMarker((prev) =>
              prev
                ? {
                    ...prev,
                    nombre: data.nombre,
                    rawTipo: data.tipo,
                    subtipo: HEALTH_CENTER_TYPE_LABELS[data.tipo] || data.tipo,
                  }
                : null
            );
          }}
        />
      )}
    </div>
  );
}
