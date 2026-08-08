"use client";

import { useState } from "react";
import { useReports } from "@/hooks/useReports";
import { useSafeZones } from "@/hooks/useSafeZones";
import { Sidebar } from "@/features/dashboard/Sidebar";
import { ReportMap } from "@/features/mapa/ReportMap";
import { ReportDetailSidebar } from "@/features/mapa/ReportDetailSidebar";
import { AuthWidget, LoginModal } from "@/features/dashboard/AuthWidget";
import { SafeZoneModal } from "@/features/mapa/SafeZoneModal";
import { SafeZoneDetailSidebar } from "@/features/mapa/SafeZoneDetailSidebar";
import { Report } from "@/types/report";
import { SafeZone } from "@/types/safeZone";
import { safeZoneService } from "@/services/safeZoneService";
import { ChevronRight } from "lucide-react";

interface CrisisDashboardProps {
  initialReports: Report[];
}

export function CrisisDashboard({ initialReports }: CrisisDashboardProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Zonas Seguras state
  const { safeZones, refresh: refreshSafeZones } = useSafeZones();
  const [isCreatingSafeZone, setIsCreatingSafeZone] = useState(false);
  const [isEditingSafeZones, setIsEditingSafeZones] = useState(false);
  const [draftLocation, setDraftLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [selectedSafeZone, setSelectedSafeZone] = useState<SafeZone | null>(
    null
  );
  const [isEditingSingleSafeZone, setIsEditingSingleSafeZone] = useState(false);
  const [showSafeZoneModal, setShowSafeZoneModal] = useState(false);

  const {
    reports,
    loading,
    error,
    filters,
    selectedReport,
    setSelectedReport,
    updateFilter,
    resetFilters,
  } = useReports(initialReports);

  const hideMainUI = isCreatingSafeZone || isEditingSafeZones;

  const handleMapClick = (lat: number, lng: number) => {
    if (isCreatingSafeZone) {
      setDraftLocation({ lat, lng });
    }
  };

  const handleSaveSafeZone = async (dto: {
    nombre: string;
    descripcion: string;
  }) => {
    if (isEditingSingleSafeZone && selectedSafeZone) {
      await safeZoneService.updateSafeZone(selectedSafeZone.id, dto);
      setIsEditingSingleSafeZone(false);
    } else if (draftLocation) {
      await safeZoneService.createSafeZone({
        ...dto,
        latitud: draftLocation.lat,
        longitud: draftLocation.lng,
      });
      setDraftLocation(null);
      setIsCreatingSafeZone(false);
      setShowSafeZoneModal(false);
    }
    refreshSafeZones();
  };

  const handleDeleteSafeZone = async () => {
    if (!selectedSafeZone) return;
    await safeZoneService.deleteSafeZone(selectedSafeZone.id);
    setSelectedSafeZone(null);
    refreshSafeZones();
  };

  return (
    <>
      {!hideMainUI && (
        <div
          className="absolute left-0 top-0 z-[100] transition-transform duration-300 ease-in-out"
          style={{
            transform: sidebarCollapsed ? "translateX(-110%)" : "translateX(0)",
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
              setSelectedSafeZone(null);
            }}
            onUpdateFilter={updateFilter}
            onResetFilters={resetFilters}
            isAdmin={isAdmin}
            safeZones={safeZones}
            selectedSafeZone={selectedSafeZone}
            onSelectSafeZone={(zone) => {
              setSelectedSafeZone(zone);
              setSelectedReport(null);
              setIsEditingSafeZones(false);
              setIsCreatingSafeZone(false);
              setDraftLocation(null);
            }}
            onCreateSafeZone={() => {
              setIsCreatingSafeZone(true);
              setSelectedReport(null);
              setSelectedSafeZone(null);
            }}
            onCollapse={() => setSidebarCollapsed(true)}
          />
        </div>
      )}

      {/* Tongue tab — always rendered, slides in/out smoothly */}
      {!hideMainUI && (
        <button
          id="sidebar-expand-btn"
          onClick={() => setSidebarCollapsed(false)}
          title="Mostrar panel"
          className="absolute left-0 top-6 z-[100] flex items-center justify-center rounded-r-xl border border-l-0 border-gray-300 bg-gray-200/90 px-1.5 py-3 text-gray-600 backdrop-blur-sm shadow-md hover:bg-gray-300 hover:text-gray-800 cursor-pointer"
          style={{
            transform: sidebarCollapsed ? "translateX(0)" : "translateX(-100%)",
            transition: sidebarCollapsed
              ? "transform 200ms ease-out 350ms" /* slide in AFTER sidebar finishes hiding */
              : "transform 200ms ease-in" /* slide out immediately when sidebar opens */,
          }}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      <section className="absolute inset-0 h-full w-full">
        <ReportMap
          reports={reports}
          selectedReport={selectedReport}
          onSelectReport={(report) => {
            setSelectedReport(report);
            setSelectedSafeZone(null);
          }}
          safeZones={safeZones}
          selectedSafeZone={selectedSafeZone}
          onSelectSafeZone={(zone) => {
            setSelectedSafeZone(zone);
            setSelectedReport(null);
          }}
          onMapClick={handleMapClick}
          isCreatingSafeZone={isCreatingSafeZone}
          draftLocation={draftLocation}
        />
      </section>

      {!hideMainUI && (
        <AuthWidget
          isAdmin={isAdmin}
          onLoginClick={() => setShowLoginModal(true)}
          onLogoutClick={() => setIsAdmin(false)}
        />
      )}

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={() => {
          setIsAdmin(true);
          setShowLoginModal(false);
        }}
      />

      {!hideMainUI && selectedReport && (
        <ReportDetailSidebar
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          isAdmin={isAdmin}
        />
      )}

      {hideMainUI && !showSafeZoneModal && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] flex gap-3">
          <button
            onClick={() => {
              setIsCreatingSafeZone(false);
              setIsEditingSafeZones(false);
              setDraftLocation(null);
              setSelectedSafeZone(null);
              setShowSafeZoneModal(false);
            }}
            className="rounded-full bg-red-50 border border-red-100 px-6 py-3 text-sm font-bold text-red-600 shadow-xl transition-colors hover:bg-red-100 hover:text-red-700"
          >
            Cancelar
          </button>
          {isCreatingSafeZone && (
            <button
              onClick={() => {
                if (draftLocation) setShowSafeZoneModal(true);
              }}
              disabled={!draftLocation}
              className="rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-xl transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600"
            >
              Confirmar
            </button>
          )}
        </div>
      )}

      {showSafeZoneModal && draftLocation && (
        <SafeZoneModal
          isOpen={true}
          onClose={() => setShowSafeZoneModal(false)}
          onSave={handleSaveSafeZone}
        />
      )}

      {isEditingSingleSafeZone && selectedSafeZone && (
        <SafeZoneModal
          isOpen={true}
          title="Editar Zona Segura"
          initialData={{
            nombre: selectedSafeZone.nombre,
            descripcion: selectedSafeZone.descripcion,
          }}
          onClose={() => setIsEditingSingleSafeZone(false)}
          onSave={handleSaveSafeZone}
        />
      )}

      {selectedSafeZone && !isEditingSingleSafeZone && (
        <SafeZoneDetailSidebar
          safeZone={selectedSafeZone}
          onClose={() => setSelectedSafeZone(null)}
          onEdit={isAdmin ? () => setIsEditingSingleSafeZone(true) : undefined}
          onDelete={isAdmin ? handleDeleteSafeZone : undefined}
        />
      )}
    </>
  );
}
