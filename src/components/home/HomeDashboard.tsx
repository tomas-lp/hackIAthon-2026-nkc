"use client";

import { useCallback, useEffect, useState } from "react";
import { useReports } from "@/hooks/useReports";
import { useUrlSelection } from "@/hooks/useUrlSelection";
import { Sidebar } from "@/components/common/Sidebar";
import { ReportMap } from "@/components/map/ReportMap";
import { ReportDetailSidebar } from "@/components/map/ReportDetailSidebar";
import { AuthWidget, LoginModal } from "@/components/common/AuthWidget";
import { BotQRWidget } from "@/components/common/BotQRWidget";
import { SafeZoneModal } from "@/components/map/SafeZoneModal";
import { HealthCenterModal } from "@/components/map/HealthCenterModal";
import { SafeZoneDetailSidebar } from "@/components/map/SafeZoneDetailSidebar";
import { CustomPointDetailSidebar } from "@/components/map/CustomPointDetailSidebar";
import { LayerControls } from "@/components/map/LayerControls";
import { TooltipSign } from "@/components/ui/TooltipSign";
import { NewListModal } from "@/components/ui/NewListModal";
import { DeleteListModal } from "@/components/ui/DeleteListModal";
import { RegionNamePopup } from "@/components/regions/RegionNamePopup";
import { Report } from "@/types/report";
import { SafeZone, SafeZoneType } from "@/types/safeZone";
import { RegionPersonalizada } from "@/types/region";
import { regionService } from "@/services/regionService";
import { ChevronRight } from "lucide-react";
import { User } from "@supabase/supabase-js";

import { useAuth } from "@/hooks/home/useAuth";
import { useAdminTabs } from "@/hooks/home/useAdminTabs";
import { useSafeZoneSelection } from "@/hooks/home/useSafeZoneSelection";
import { useHealthCenterSelection } from "@/hooks/home/useHealthCenterSelection";
import { useMapRouting } from "@/hooks/home/useMapRouting";
import { AdminTopBar } from "./_parts/AdminTopBar";
import { RouteBanner } from "./_parts/RouteBanner";
import { EditingBar } from "./_parts/EditingBar";

interface HomeDashboardProps {
  initialReports: Report[];
  user?: User | null;
}

export function HomeDashboard({
  initialReports,
  user: initialUser,
}: HomeDashboardProps) {
  const { isAdmin } = useAuth(initialUser);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showEvacuationCenters, setShowEvacuationCentersState] =
    useState<boolean>(true);
  const [showMedicalCenters, setShowMedicalCentersState] =
    useState<boolean>(true);

  useEffect(() => {
    const savedEvac = localStorage.getItem("layer_evacuation_centers");
    if (savedEvac !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowEvacuationCentersState(savedEvac === "true");
    }
    const savedMed = localStorage.getItem("layer_medical_centers");
    if (savedMed !== null) {
      setShowMedicalCentersState(savedMed === "true");
    }
  }, []);

  const setShowEvacuationCenters = (
    val: boolean | ((prev: boolean) => boolean)
  ) => {
    setShowEvacuationCentersState((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      if (typeof window !== "undefined") {
        localStorage.setItem("layer_evacuation_centers", String(next));
      }
      return next;
    });
  };

  const setShowMedicalCenters = (
    val: boolean | ((prev: boolean) => boolean)
  ) => {
    setShowMedicalCentersState((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      if (typeof window !== "undefined") {
        localStorage.setItem("layer_medical_centers", String(next));
      }
      return next;
    });
  };

  const {
    listas,
    listTabs,
    activeListTab,
    setActiveListTab,
    isAddListModalOpen,
    setIsAddListModalOpen,
    handleAddList,
    refreshLists,
  } = useAdminTabs();

  const [regiones, setRegiones] = useState<RegionPersonalizada[]>([]);
  const [isEditingRegions, setIsEditingRegions] = useState(false);
  const [isDrawingRegions, setIsDrawingRegions] = useState(false);
  const [draftRegionPoints, setDraftRegionPoints] = useState<
    [number, number][]
  >([]);
  const [newlyAddedDraftZones, setNewlyAddedDraftZones] = useState<
    RegionPersonalizada[]
  >([]);
  const [showRegionNamePopup, setShowRegionNamePopup] = useState(false);

  const refreshRegiones = useCallback(async () => {
    try {
      const fetched = await regionService.getRegions();
      setRegiones(fetched);
    } catch (err) {
      console.error("Error cargando regiones:", err);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshRegiones();
  }, [refreshRegiones]);

  const showEditButton =
    isAdmin &&
    activeListTab !== "Mapa de calor" &&
    activeListTab !== "Todo" &&
    activeListTab !== "Barrios";

  const handleStartEditingRegions = () => {
    setIsEditingRegions(true);
    setIsDrawingRegions(true);
    setDraftRegionPoints([]);
    setNewlyAddedDraftZones([]);
    setShowRegionNamePopup(false);
    setSidebarCollapsed(true);
  };

  const handleAddDraftRegionPoint = useCallback((pt: [number, number]) => {
    setDraftRegionPoints((prev) => [...prev, pt]);
  }, []);

  const handleFinishDrawingRegion = useCallback(() => {
    setDraftRegionPoints((current) => {
      if (current.length > 2) {
        setIsDrawingRegions(false);
        setShowRegionNamePopup(true);
        return current;
      }
      alert("Una región debe tener al menos 3 puntos.");
      return current;
    });
  }, []);

  const handleCancelDrawingRegion = () => {
    setIsDrawingRegions(true);
    setDraftRegionPoints([]);
    setShowRegionNamePopup(false);
  };

  const handleConfirmRegionName = async (name: string, listaId?: string) => {
    const targetList = listas.find((l) => l.nombre === activeListTab);
    const newDraft: RegionPersonalizada = {
      id: `temp-${Date.now()}-${Math.random()}`,
      user_id: initialUser?.id || "temp-user",
      nombre: name,
      points: draftRegionPoints,
      lista_id: listaId || targetList?.id,
      lista_nombre: activeListTab,
      created_at: new Date().toISOString(),
    };
    setNewlyAddedDraftZones((prev) => [...prev, newDraft]);
    setDraftRegionPoints([]);
    setShowRegionNamePopup(false);
    setIsDrawingRegions(true);
  };

  const [isDeleteListModalOpen, setIsDeleteListModalOpen] = useState(false);

  const handleConfirmEditingRegions = async () => {
    try {
      if (newlyAddedDraftZones.length > 0) {
        for (const zone of newlyAddedDraftZones) {
          await regionService.createRegion(
            zone.nombre,
            zone.points,
            zone.lista_id || undefined
          );
        }
        await refreshRegiones();
      }
    } catch (err) {
      console.error("Error guardando regiones:", err);
      alert("Error guardando las zonas creadas.");
    } finally {
      setIsEditingRegions(false);
      setIsDrawingRegions(false);
      setDraftRegionPoints([]);
      setNewlyAddedDraftZones([]);
      setShowRegionNamePopup(false);
      setSidebarCollapsed(false);
    }
  };

  const handleCancelEditingRegions = () => {
    setIsEditingRegions(false);
    setIsDrawingRegions(false);
    setDraftRegionPoints([]);
    setNewlyAddedDraftZones([]);
    setShowRegionNamePopup(false);
    setSidebarCollapsed(false);
  };

  useEffect(() => {
    if (!isEditingRegions) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (showRegionNamePopup) {
          e.preventDefault();
          e.stopPropagation();
          setShowRegionNamePopup(false);
          setDraftRegionPoints([]);
          setIsDrawingRegions(true);
          return;
        }
        if (draftRegionPoints.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          setDraftRegionPoints([]);
          setIsDrawingRegions(true);
          return;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isEditingRegions, showRegionNamePopup, draftRegionPoints]);

  const handleDeleteSingleRegion = useCallback(
    async (regionId: string) => {
      if (regionId.startsWith("temp-")) {
        setNewlyAddedDraftZones((prev) =>
          prev.filter((z) => z.id !== regionId)
        );
        return;
      }
      try {
        await regionService.deleteRegion(regionId);
        await refreshRegiones();
      } catch (err) {
        console.error("Error eliminando región:", err);
        alert("Error al eliminar la zona.");
      }
    },
    [refreshRegiones]
  );

  const handleConfirmDeleteList = async () => {
    const targetList = listas.find((l) => l.nombre === activeListTab);
    if (!targetList) return;

    try {
      const remainingLists = listas.filter((l) => l.id !== targetList.id);
      await regionService.deleteList(targetList.id);
      await refreshLists();
      await refreshRegiones();
      if (remainingLists.length > 0) {
        setActiveListTab(remainingLists[0].nombre);
      } else {
        setActiveListTab("Mapa de calor");
      }
      setSidebarCollapsed(false);
    } catch (err) {
      console.error("Error eliminando lista:", err);
      alert("Error al eliminar la lista personalizada.");
    }
  };

  const { initialReportId, syncUrl } = useUrlSelection();

  const {
    reports,
    loading,
    error,
    filters,
    selectedReport,
    setSelectedReport,
    updateFilter,
    resetFilters,
  } = useReports(initialReports, initialReportId);

  const safeZoneSel = useSafeZoneSelection();
  const healthSel = useHealthCenterSelection();

  const mapRouting = useMapRouting({
    reports,
    safeZones: safeZoneSel.safeZones,
    selectedSafeZone: safeZoneSel.selectedSafeZone,
    setSelectedSafeZone: safeZoneSel.setSelectedSafeZone,
  });

  const hideMainUI =
    safeZoneSel.isCreatingSafeZone || safeZoneSel.isEditingSafeZones;

  useEffect(() => {
    syncUrl(
      selectedReport?.id ?? null,
      safeZoneSel.selectedSafeZone?.id ?? null
    );
  }, [selectedReport?.id, safeZoneSel.selectedSafeZone?.id, syncUrl]);

  const handleMapClick = (lat: number, lng: number) => {
    if (safeZoneSel.isCreatingSafeZone) {
      safeZoneSel.setDraftLocation({ lat, lng });
    } else if (!isAdmin) {
      mapRouting.openDraftPin({ lat, lng });
      setSelectedReport(null);
      safeZoneSel.setSelectedSafeZone(null);
      healthSel.setSelectedHealthCenter(null);
    }
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-zinc-950 font-sans">
      <div
        className="absolute left-0 top-0 z-[100] transition-transform duration-300 ease-in-out"
        style={{
          transform:
            sidebarCollapsed || hideMainUI
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
          onSelectReport={(report) => {
            setSelectedReport(report);
            safeZoneSel.setSelectedSafeZone(null);
            healthSel.setSelectedHealthCenter(null);
          }}
          onUpdateFilter={updateFilter}
          onResetFilters={resetFilters}
          isAdmin={isAdmin}
          safeZones={safeZoneSel.safeZones}
          selectedSafeZone={safeZoneSel.selectedSafeZone}
          onSelectSafeZone={(zone) => {
            setShowEvacuationCenters(true);
            safeZoneSel.setSelectedSafeZone(zone);
            setSelectedReport(null);
            healthSel.setSelectedHealthCenter(null);
            safeZoneSel.setIsEditingSafeZones(false);
            safeZoneSel.setIsCreatingSafeZone(false);
            safeZoneSel.setDraftLocation(null);
          }}
          onCreateSafeZone={() => safeZoneSel.setIsCreatingSafeZone(true)}
          healthCenters={healthSel.healthCenters}
          selectedHealthCenter={healthSel.selectedHealthCenter}
          onSelectHealthCenter={(center) => {
            setShowMedicalCenters(true);
            healthSel.setSelectedHealthCenter(center);
            setSelectedReport(null);
            safeZoneSel.setSelectedSafeZone(null);
            safeZoneSel.setIsEditingSafeZones(false);
            safeZoneSel.setIsCreatingSafeZone(false);
            safeZoneSel.setDraftLocation(null);
          }}
          onCollapse={() => setSidebarCollapsed(true)}
          onNavigateToNearest={
            !isAdmin
              ? () => mapRouting.startRouting(null, "nearest")
              : undefined
          }
          isNavigatingNearest={
            mapRouting.routingState.status === "loading" &&
            mapRouting.navigatingTargetId === "nearest"
          }
          onNavigateToNearestHealthCenter={() =>
            mapRouting.startRouting(null, "nearest-hc", healthSel.healthZones)
          }
          isNavigatingNearestHealthCenter={
            mapRouting.routingState.status === "loading" &&
            mapRouting.navigatingTargetId === "nearest-hc"
          }
        />
      </div>

      <TooltipSign label="Mostrar panel" position="right" delayMs={500}>
        <button
          id="sidebar-expand-btn"
          onClick={() => setSidebarCollapsed(false)}
          className="absolute left-0 top-6 z-[100] flex items-center justify-center rounded-r-xl border border-l-0 border-gray-200 bg-white px-1.5 py-3 text-gray-400 shadow-md transition-colors hover:bg-gray-50 hover:text-gray-600 cursor-pointer"
          style={{
            transform:
              sidebarCollapsed && !hideMainUI
                ? "translateX(0)"
                : "translateX(-100%)",
            transition:
              sidebarCollapsed && !hideMainUI
                ? "transform 200ms ease-out 350ms"
                : "transform 200ms ease-in",
          }}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </TooltipSign>

      {isAdmin && (
        <AdminTopBar
          tabs={listTabs}
          activeTab={activeListTab}
          onTabChange={setActiveListTab}
          onAddList={() => setIsAddListModalOpen(true)}
          isHidden={hideMainUI}
          showEditButton={showEditButton}
          isEditingRegions={isEditingRegions}
          onStartEditing={handleStartEditingRegions}
          onCancelEditing={handleCancelEditingRegions}
          onConfirmEditing={handleConfirmEditingRegions}
          onDeleteList={() => setIsDeleteListModalOpen(true)}
        />
      )}

      {isEditingRegions && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[500] bg-white/90 backdrop-blur-md px-6 py-2.5 rounded-full shadow-lg border border-gray-200 pointer-events-auto">
          <span className="font-semibold text-gray-800 text-xs sm:text-sm">
            Dibuja la región · clickeá para añadir puntos · doble click al
            primer punto para cerrar · presiona Esc para cancelar
          </span>
        </div>
      )}

      <section className="absolute inset-0 h-full w-full">
        <ReportMap
          reports={reports}
          selectedReport={selectedReport}
          onSelectReport={(report) => {
            setSelectedReport(report);
            safeZoneSel.setSelectedSafeZone(null);
            healthSel.setSelectedHealthCenter(null);
            if (mapRouting.draftCustomPin)
              mapRouting.handleCloseDraftCustomPin();
          }}
          safeZones={safeZoneSel.safeZones}
          selectedSafeZone={safeZoneSel.selectedSafeZone}
          onSelectSafeZone={(zone) => {
            safeZoneSel.setSelectedSafeZone(zone);
            setSelectedReport(null);
            healthSel.setSelectedHealthCenter(null);
            if (mapRouting.draftCustomPin)
              mapRouting.handleCloseDraftCustomPin();
          }}
          healthCenters={healthSel.healthCenters}
          selectedHealthCenter={healthSel.selectedHealthCenter}
          onSelectHealthCenter={(center) => {
            healthSel.setSelectedHealthCenter(center);
            setSelectedReport(null);
            safeZoneSel.setSelectedSafeZone(null);
            if (mapRouting.draftCustomPin)
              mapRouting.handleCloseDraftCustomPin();
          }}
          onMapClick={handleMapClick}
          isCreatingSafeZone={safeZoneSel.isCreatingSafeZone}
          draftLocation={safeZoneSel.draftLocation}
          draftCustomPin={!isAdmin ? mapRouting.draftCustomPin : null}
          activeRouteCustomPin={
            !isAdmin ? mapRouting.activeRouteCustomPin : null
          }
          closingCustomPin={!isAdmin ? mapRouting.closingCustomPin : null}
          activeRoute={!isAdmin ? mapRouting.displayRoute : null}
          isClosingRoute={mapRouting.isClosingRoute}
          isAdmin={isAdmin}
          showEvacuationCenters={showEvacuationCenters}
          showMedicalCenters={showMedicalCenters}
          showBarrios={isAdmin ? activeListTab === "Barrios" : false}
          regiones={regiones}
          newlyAddedDraftZones={newlyAddedDraftZones}
          activeHeaderTab={activeListTab}
          isDrawing={isDrawingRegions}
          draftPoints={draftRegionPoints}
          onAddDraftPoint={handleAddDraftRegionPoint}
          onFinishDrawing={handleFinishDrawingRegion}
          onCancelDrawing={handleCancelDrawingRegion}
          showNamePopup={showRegionNamePopup}
          isEditingRegions={isEditingRegions}
          onDeleteRegion={handleDeleteSingleRegion}
        />
      </section>

      {(!isAdmin || activeListTab === "Mapa de calor") && (
        <LayerControls
          showEvacuationCenters={showEvacuationCenters}
          setShowEvacuationCenters={setShowEvacuationCenters}
          showMedicalCenters={showMedicalCenters}
          setShowMedicalCenters={setShowMedicalCenters}
          onCreateEvacuationCenter={
            isAdmin ? () => safeZoneSel.setIsCreatingSafeZone(true) : undefined
          }
          onCreateMedicalCenter={
            isAdmin ? () => safeZoneSel.setIsCreatingSafeZone(true) : undefined
          }
          isHidden={hideMainUI}
        />
      )}

      <RouteBanner
        isAdmin={isAdmin}
        displayRoute={mapRouting.displayRoute}
        isClosingRoute={mapRouting.isClosingRoute}
        onCancel={mapRouting.handleCancelRoute}
        routingState={mapRouting.routingState}
        onClearError={mapRouting.clearRoute}
      />

      <AuthWidget
        isAdmin={isAdmin}
        onLoginClick={() => setShowLoginModal(true)}
        onLogoutClick={async () => {
          const { logoutFromSession } = await import("@/app/auth/actions");
          await logoutFromSession();
          window.location.reload();
        }}
        isHidden={hideMainUI}
      />

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={() => setShowLoginModal(false)}
      />

      {!isAdmin && <BotQRWidget isHidden={hideMainUI} />}

      <ReportDetailSidebar
        report={selectedReport}
        isOpen={!!selectedReport && !hideMainUI}
        onClose={() => setSelectedReport(null)}
        isAdmin={isAdmin}
      />

      {!isAdmin && (
        <CustomPointDetailSidebar
          customPoint={mapRouting.draftCustomPin}
          isOpen={
            !!mapRouting.draftCustomPin &&
            !mapRouting.isClosingDraftCustomPin &&
            !hideMainUI
          }
          onClose={mapRouting.handleCloseDraftCustomPin}
          onNavigate={mapRouting.handleNavigateToCustomPoint}
          isNavigating={
            mapRouting.routingState.status === "loading" &&
            mapRouting.navigatingTargetId === "custom-point"
          }
        />
      )}

      <EditingBar
        isCreatingSafeZone={safeZoneSel.isCreatingSafeZone}
        draftLocation={safeZoneSel.draftLocation}
        showSafeZoneModal={safeZoneSel.showSafeZoneModal}
        hideMainUI={hideMainUI}
        onCancel={() => {
          safeZoneSel.setIsCreatingSafeZone(false);
          safeZoneSel.setIsEditingSafeZones(false);
          safeZoneSel.setDraftLocation(null);
          safeZoneSel.setShowSafeZoneModal(false);
        }}
        onConfirm={() => {
          if (safeZoneSel.draftLocation) safeZoneSel.setShowSafeZoneModal(true);
        }}
      />

      {safeZoneSel.showSafeZoneModal && safeZoneSel.draftLocation && (
        <SafeZoneModal
          isOpen={true}
          onClose={() => safeZoneSel.setShowSafeZoneModal(false)}
          onSave={safeZoneSel.handleSaveSafeZone}
        />
      )}

      {safeZoneSel.isEditingSingleSafeZone && safeZoneSel.selectedSafeZone && (
        <SafeZoneModal
          isOpen={true}
          title="Editar Centro de Evacuación"
          initialData={{
            nombre: safeZoneSel.selectedSafeZone.nombre,
            tipo: safeZoneSel.selectedSafeZone.tipo as SafeZoneType,
            capacidad_maxima: safeZoneSel.selectedSafeZone.capacidad_maxima,
            direccion: safeZoneSel.selectedSafeZone.direccion,
            localidad: safeZoneSel.selectedSafeZone.localidad,
            departamento: safeZoneSel.selectedSafeZone.departamento,
            descripcion: safeZoneSel.selectedSafeZone.descripcion,
          }}
          onClose={() => safeZoneSel.setIsEditingSingleSafeZone(false)}
          onSave={safeZoneSel.handleSaveSafeZone}
        />
      )}

      <SafeZoneDetailSidebar
        safeZone={safeZoneSel.selectedSafeZone}
        isOpen={
          !!safeZoneSel.selectedSafeZone &&
          !hideMainUI &&
          !safeZoneSel.isEditingSingleSafeZone
        }
        onClose={() => safeZoneSel.setSelectedSafeZone(null)}
        onEdit={
          isAdmin
            ? () => safeZoneSel.setIsEditingSingleSafeZone(true)
            : undefined
        }
        onDelete={isAdmin ? safeZoneSel.handleDeleteSafeZone : undefined}
        onNavigate={
          !isAdmin
            ? () => {
                if (safeZoneSel.selectedSafeZone) {
                  mapRouting.startRouting(
                    safeZoneSel.selectedSafeZone,
                    safeZoneSel.selectedSafeZone.id
                  );
                }
              }
            : undefined
        }
        isNavigating={
          mapRouting.routingState.status === "loading" &&
          mapRouting.navigatingTargetId === safeZoneSel.selectedSafeZone?.id
        }
      />

      {healthSel.isEditingSingleHealthCenter &&
        healthSel.selectedHealthCenter && (
          <HealthCenterModal
            isOpen={true}
            title="Editar Centro de Salud"
            initialData={{
              nombre: healthSel.selectedHealthCenter.nombre,
              tipo: healthSel.selectedHealthCenter.tipo,
            }}
            onClose={() => healthSel.setIsEditingSingleHealthCenter(false)}
            onSave={healthSel.handleSaveHealthCenter}
          />
        )}

      <SafeZoneDetailSidebar
        safeZone={
          healthSel.selectedHealthCenter &&
          healthSel.selectedHealthCenter.lat !== null &&
          healthSel.selectedHealthCenter.lon !== null
            ? {
                id: `hc-${healthSel.selectedHealthCenter.id}`,
                nombre: healthSel.selectedHealthCenter.nombre,
                descripcion: "",
                latitud: healthSel.selectedHealthCenter.lat!,
                longitud: healthSel.selectedHealthCenter.lon!,
                created_at: healthSel.selectedHealthCenter.updated_at,
              }
            : null
        }
        categoryTitle="Centro de salud"
        typeText={healthSel.selectedHealthCenter?.tipo}
        buttonColor="blue"
        isOpen={
          !!healthSel.selectedHealthCenter &&
          !hideMainUI &&
          !healthSel.isEditingSingleHealthCenter
        }
        onClose={() => healthSel.setSelectedHealthCenter(null)}
        onEdit={
          isAdmin
            ? () => healthSel.setIsEditingSingleHealthCenter(true)
            : undefined
        }
        onDelete={isAdmin ? healthSel.handleDeleteHealthCenter : undefined}
        onNavigate={
          !isAdmin &&
          healthSel.selectedHealthCenter &&
          healthSel.selectedHealthCenter.lat !== null &&
          healthSel.selectedHealthCenter.lon !== null
            ? () => {
                const hc = healthSel.selectedHealthCenter;
                if (!hc) return;
                const hcZone: SafeZone & {
                  isHealthCenter?: boolean;
                  tipo?: string;
                } = {
                  id: `hc-${hc.id}`,
                  nombre: hc.nombre,
                  descripcion: `${hc.tipo} · ${hc.direccion || hc.localidad || "Corrientes"}`,
                  latitud: hc.lat!,
                  longitud: hc.lon!,
                  created_at: hc.updated_at,
                  isHealthCenter: true,
                  tipo: hc.tipo,
                };
                mapRouting.startRouting(hcZone, hc.id);
              }
            : undefined
        }
        isNavigating={
          mapRouting.routingState.status === "loading" &&
          mapRouting.navigatingTargetId === healthSel.selectedHealthCenter?.id
        }
      />

      {showRegionNamePopup && (
        <RegionNamePopup
          listas={listas}
          selectedListId={listas.find((l) => l.nombre === activeListTab)?.id}
          onConfirm={handleConfirmRegionName}
          onCancel={handleCancelDrawingRegion}
        />
      )}

      <NewListModal
        isOpen={isAddListModalOpen}
        onClose={() => setIsAddListModalOpen(false)}
        onConfirm={handleAddList}
      />

      <DeleteListModal
        isOpen={isDeleteListModalOpen}
        listName={activeListTab}
        onClose={() => setIsDeleteListModalOpen(false)}
        onConfirm={handleConfirmDeleteList}
      />
    </main>
  );
}
