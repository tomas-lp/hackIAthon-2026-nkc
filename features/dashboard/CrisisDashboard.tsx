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

interface CrisisDashboardProps {
  initialReports: Report[];
}

export function CrisisDashboard({ initialReports }: CrisisDashboardProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

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
        />
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
