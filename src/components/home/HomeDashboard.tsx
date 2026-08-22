"use client";

import { useEffect, useState } from "react";
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
import { NewListModal } from "@/components/ui/NewListModal";
import { Report } from "@/types/report";
import { SafeZone } from "@/types/safeZone";
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
  const [showEvacuationCenters, setShowEvacuationCenters] = useState(true);
  const [showMedicalCenters, setShowMedicalCenters] = useState(true);

  const {
    listTabs,
    activeListTab,
    setActiveListTab,
    isAddListModalOpen,
    setIsAddListModalOpen,
    handleAddList,
  } = useAdminTabs();

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
    <>
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

      <button
        id="sidebar-expand-btn"
        onClick={() => setSidebarCollapsed(false)}
        title="Mostrar panel"
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

      {isAdmin && (
        <AdminTopBar
          tabs={listTabs}
          activeTab={activeListTab}
          onTabChange={setActiveListTab}
          onAddList={() => setIsAddListModalOpen(true)}
          isHidden={hideMainUI}
        />
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
        />
      </section>

      {isAdmin && (
        <LayerControls
          showEvacuationCenters={showEvacuationCenters}
          setShowEvacuationCenters={setShowEvacuationCenters}
          showMedicalCenters={showMedicalCenters}
          setShowMedicalCenters={setShowMedicalCenters}
          onCreateEvacuationCenter={() =>
            safeZoneSel.setIsCreatingSafeZone(true)
          }
          onCreateMedicalCenter={() => safeZoneSel.setIsCreatingSafeZone(true)}
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

      <NewListModal
        isOpen={isAddListModalOpen}
        onClose={() => setIsAddListModalOpen(false)}
        onConfirm={handleAddList}
      />
    </>
  );
}
