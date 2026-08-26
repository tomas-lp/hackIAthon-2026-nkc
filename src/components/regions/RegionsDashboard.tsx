"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Report } from "@/types/report";
import { RegionLista, RegionPersonalizada } from "@/types/region";
import { User } from "@supabase/supabase-js";
import { AuthWidget, LoginModal } from "@/components/common/AuthWidget";
import { RegionsMap } from "./RegionsMap";
import { RegionNamePopup } from "./RegionNamePopup";
import { NewListModal } from "@/components/ui/NewListModal";
import { RegionsTableUI } from "./RegionsTableUI";
import { regionService } from "@/services/regionService";
import {
  barrioService,
  BarriosFeatureCollection,
} from "@/services/barrioService";
import { ArrowLeft } from "lucide-react";
import { TooltipSign } from "@/components/ui/TooltipSign";
import { useReports } from "@/hooks/useReports";

interface RegionsDashboardProps {
  initialReports: Report[];
  initialAllReports?: Report[];
  initialRegiones: RegionPersonalizada[];
  initialListas?: RegionLista[];
  initialBarriosGeoJson?: BarriosFeatureCollection | null;
  user: User | null;
}

export function RegionsDashboard({
  initialReports,
  initialAllReports = [],
  initialRegiones,
  initialListas = [],
  initialBarriosGeoJson = null,
  user,
}: RegionsDashboardProps) {
  const [regiones, setRegiones] =
    useState<RegionPersonalizada[]>(initialRegiones);
  const [allReports, setAllReports] = useState<Report[]>(
    initialAllReports.length > 0 ? initialAllReports : initialReports
  );
  const [listas, setListas] = useState<RegionLista[]>(initialListas);
  const [barriosGeoJson, setBarriosGeoJson] =
    useState<BarriosFeatureCollection | null>(initialBarriosGeoJson);
  const [activeHeaderTab, setActiveHeaderTab] = useState<string>("Barrios");

  const [isDrawing, setIsDrawing] = useState(false);
  const [draftPoints, setDraftPoints] = useState<[number, number][]>([]);
  const [showNamePopup, setShowNamePopup] = useState(false);
  const [showNewListModal, setShowNewListModal] = useState(false);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [isFocusedRegionView, setIsFocusedRegionView] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const { reports } = useReports(initialReports);

  // Cargar regiones, listas y barrios al montar
  const refreshData = useCallback(async () => {
    try {
      const [fetchedRegiones, fetchedListas, fetchedBarrios] =
        await Promise.all([
          regionService.getRegions(),
          regionService.getLists(),
          barrioService.getBarriosGeoJson(),
        ]);
      setRegiones(fetchedRegiones);
      setListas(fetchedListas);
      setBarriosGeoJson(fetchedBarrios);

      if (allReports.length === 0) {
        try {
          const res = await fetch("/api/reports?all=true");
          if (res.ok) {
            const data = await res.json();
            setAllReports(data);
          }
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.error("Error refreshing regions data:", err);
    }
  }, [allReports.length]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshData();
  }, [refreshData]);

  // Iniciar dibujo de región (desde el botón + de la tabla o mapa)
  const handleCreateRegion = () => {
    setIsDrawing(true);
    setDraftPoints([]);
    setShowNamePopup(false);
    setSelectedRegionId(null);
  };

  const handleAddDraftPoint = useCallback((pt: [number, number]) => {
    setDraftPoints((prev) => [...prev, pt]);
  }, []);

  const handleFinishDrawing = useCallback(() => {
    setDraftPoints((current) => {
      if (current.length > 2) {
        setIsDrawing(false);
        setShowNamePopup(true);
        return current;
      }
      alert("Una región debe tener al menos 3 puntos.");
      return current;
    });
  }, []);

  const handleCancelDrawing = useCallback(() => {
    setIsDrawing(false);
    setDraftPoints([]);
    setShowNamePopup(false);
  }, []);

  useEffect(() => {
    if (!isDrawing && !showNamePopup && draftPoints.length === 0) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        handleCancelDrawing();
      }
    }

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isDrawing, showNamePopup, draftPoints.length, handleCancelDrawing]);

  // Confirmar nombre y lista para la nueva región
  const handleConfirmName = async (name: string, listaId?: string) => {
    try {
      await regionService.createRegion(name, draftPoints, listaId);
      await refreshData();
    } catch (e) {
      console.error("Error guardando región:", e);
      alert("Error guardando la región");
    } finally {
      setIsDrawing(false);
      setDraftPoints([]);
      setShowNamePopup(false);
    }
  };

  // Borrar regiones (individual o masivo)
  const handleDeleteRegions = async (ids: string[]) => {
    try {
      await regionService.deleteRegions(ids);
      await refreshData();
    } catch (e) {
      console.error(e);
      alert("Error eliminando la(s) región(es)");
    }
  };

  // Actualizar región (nombre)
  const handleUpdateRegion = async (id: string, data: { nombre: string }) => {
    try {
      await regionService.updateRegion(id, data);
      await refreshData();
    } catch (e) {
      console.error("Error actualizando región:", e);
      alert("Error actualizando la región");
    }
  };

  // Crear nueva lista (desde Nueva+ del header)
  const handleCreateNewList = async (listName: string) => {
    const newList = await regionService.createList(listName);
    if (newList) {
      await refreshData();
      setActiveHeaderTab(newList.nombre);
    }
  };

  const handleSelectRegion = (id: string) => {
    setSelectedRegionId(id);
    setIsFocusedRegionView(true);
  };

  const handleBackToList = () => {
    setIsFocusedRegionView(false);
  };

  const isSelectedBarrio = useMemo(() => {
    if (!selectedRegionId || !barriosGeoJson?.features) return false;
    return barriosGeoJson.features.some(
      (f) => f.properties?.id === selectedRegionId
    );
  }, [selectedRegionId, barriosGeoJson]);

  // 1. Filtrado de polígonos en el mapa:
  const displayedMapRegiones = useMemo(() => {
    if (activeHeaderTab === "Barrios") {
      return [];
    }
    if (isFocusedRegionView && isSelectedBarrio) {
      return [];
    }
    if (activeHeaderTab === "Todo" || activeHeaderTab === "Mapa de calor") {
      return regiones;
    }

    return regiones.filter((r) => {
      const rListName = r.lista_nombre || "Lista 1";
      return rListName === activeHeaderTab || r.lista_id === activeHeaderTab;
    });
  }, [regiones, activeHeaderTab, isFocusedRegionView, isSelectedBarrio]);

  // Modo mapa activo si se está dibujando, se muestra el popup de nombrar zona o el tab es Mapa o se clickeó una región/barrio
  const isMapVisible = isFocusedRegionView || isDrawing || showNamePopup;

  return (
    <div className="relative h-screen w-full overflow-hidden bg-zinc-100 font-sans">
      {/* Botón Volver a la lista de regiones (arriba a la izquierda en vista de mapa enfocada) */}
      {isFocusedRegionView && (
        <div className="absolute top-6 left-6 z-[100]">
          <TooltipSign label="Volver a la lista de regiones" position="right">
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

      {/* Widget de Usuario cuando está en vista de mapa */}
      {isMapVisible && !isDrawing && !showNamePopup && (
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

      {/* Modal para crear nueva Lista desde Nueva+ */}
      <NewListModal
        isOpen={showNewListModal}
        onClose={() => setShowNewListModal(false)}
        onSave={handleCreateNewList}
      />

      {/* Contenido Principal: Tabla de Regiones o Mapa Limpio Enfocado */}
      {!isMapVisible ? (
        <div
          className={`flex-1 flex flex-col h-full overflow-y-auto pt-16 pb-12 transition-all duration-300 ease-in-out ${"px-6"}`}
        >
          <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-2 font-sans flex flex-col gap-5">
            {/* Encabezado Superior */}
            <div className="flex items-center justify-between gap-4 mb-1">
              <div>
                <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">
                  Regiones
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

            {/* Contenido: Tabla de Regiones */}
            <RegionsTableUI
              regiones={regiones}
              listas={listas}
              reports={reports}
              allReports={allReports}
              barriosGeoJson={barriosGeoJson}
              activeListFilter={activeHeaderTab}
              onListFilterChange={(listName) => setActiveHeaderTab(listName)}
              onSelectRegion={handleSelectRegion}
              onCreateRegion={handleCreateRegion}
              onDeleteRegions={handleDeleteRegions}
              onUpdateRegion={handleUpdateRegion}
              selectedRegionId={selectedRegionId}
              onOpenNewListModal={() => setShowNewListModal(true)}
            />
          </div>
        </div>
      ) : (
        <section className="absolute inset-0 h-full w-full">
          <RegionsMap
            reports={reports}
            regiones={displayedMapRegiones}
            barriosGeoJson={barriosGeoJson}
            activeHeaderTab={activeHeaderTab}
            isDrawing={isDrawing}
            draftPoints={draftPoints}
            onAddDraftPoint={handleAddDraftPoint}
            onFinishDrawing={handleFinishDrawing}
            onCancelDrawing={handleCancelDrawing}
            selectedRegionId={selectedRegionId}
            hideHeatmap={isFocusedRegionView}
            showAllBarrios={
              activeHeaderTab === "Barrios" ||
              (isFocusedRegionView && isSelectedBarrio)
            }
            listas={listas}
          />
        </section>
      )}

      {/* Popup al completar un polígono (Modificado según Foto 2) */}
      {showNamePopup && (
        <RegionNamePopup
          listas={listas}
          selectedListId={listas.find((l) => l.nombre === activeHeaderTab)?.id}
          onConfirm={handleConfirmName}
          onCancel={handleCancelDrawing}
        />
      )}

      {/* Botones de acción durante el dibujo */}
      {isDrawing && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] flex gap-3">
          <button
            onClick={handleCancelDrawing}
            className="flex items-center justify-center gap-2 rounded-full border border-red-200 bg-white px-6 py-3 text-sm font-bold text-red-600 shadow-xl transition-all duration-200 hover:bg-red-50 hover:scale-105 active:scale-95 cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
