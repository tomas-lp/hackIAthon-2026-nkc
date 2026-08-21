"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouting } from "@/hooks/useRouting";
import { useReports } from "@/hooks/useReports";
import { useSafeZones } from "@/hooks/useSafeZones";
import { useHealthCenters } from "@/hooks/useHealthCenters";
import { useUrlSelection } from "@/hooks/useUrlSelection";
import { Sidebar } from "@/features/dashboard/Sidebar";
import { ReportMap } from "@/features/mapa/ReportMap";
import { ReportDetailSidebar } from "@/features/mapa/ReportDetailSidebar";
import { AuthWidget, LoginModal } from "@/features/dashboard/AuthWidget";
import { BotQRWidget } from "@/features/dashboard/BotQRWidget";
import { SafeZoneModal } from "@/features/mapa/SafeZoneModal";
import { HealthCenterModal } from "@/features/mapa/HealthCenterModal";
import { SafeZoneDetailSidebar } from "@/features/mapa/SafeZoneDetailSidebar";
import { CustomPointDetailSidebar } from "@/features/mapa/CustomPointDetailSidebar";
import { LayerControls } from "@/features/mapa/LayerControls";
import { LiquidGlassSegmentedBar } from "@/features/dashboard/LiquidGlassSegmentedBar";
import { Report } from "@/types/report";
import { SafeZone } from "@/types/safeZone";
import { HealthCenter, HealthCenterType } from "@/types/healthCenter";
import { safeZoneService } from "@/services/safeZoneService";
import { healthCenterService } from "@/services/healthCenterService";
import { buildHeatPoints } from "@/lib/heatmap";
import { RouteResult } from "@/lib/routing";
import { createClient } from "@/utils/supabase/client";
import { ChevronRight, X, AlertTriangle } from "lucide-react";
import { User } from "@supabase/supabase-js";

interface CrisisDashboardProps {
  initialReports: Report[];
  user?: User | null;
  showBarrios?: boolean;
}

export function CrisisDashboard({
  initialReports,
  user: initialUser,
  showBarrios = false,
}: CrisisDashboardProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(
    initialUser ?? null
  );
  const [prevInitialUser, setPrevInitialUser] = useState(initialUser);

  if (initialUser !== prevInitialUser) {
    setPrevInitialUser(initialUser);
    setCurrentUser(initialUser ?? null);
  }

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUser(user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = !!currentUser;
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Layer Toggles for Admin
  const [showEvacuationCenters, setShowEvacuationCenters] = useState(true);
  const [showMedicalCenters, setShowMedicalCenters] = useState(true);
  const [activeListTab, setActiveListTab] = useState(
    showBarrios ? "Barrios" : "Todo"
  );

  const { initialReportId, initialSafeZoneId, syncUrl } = useUrlSelection();

  // Zonas Seguras state
  const { safeZones, refresh: refreshSafeZones } = useSafeZones();

  // Centros de Salud state
  const { healthCenters, refresh: refreshHealthCenters } = useHealthCenters();
  const [isEditingSingleHealthCenter, setIsEditingSingleHealthCenter] =
    useState(false);
  const [selectedHealthCenterId, setSelectedHealthCenterId] = useState<
    string | null
  >(null);
  const selectedHealthCenter = useMemo(
    () => healthCenters.find((hc) => hc.id === selectedHealthCenterId) ?? null,
    [healthCenters, selectedHealthCenterId]
  );
  const setSelectedHealthCenter = useCallback((hc: HealthCenter | null) => {
    setSelectedHealthCenterId(hc?.id ?? null);
  }, []);

  const handleSaveHealthCenter = async (data: {
    nombre: string;
    tipo: HealthCenterType;
  }) => {
    if (selectedHealthCenter) {
      await healthCenterService.updateHealthCenter(
        selectedHealthCenter.id,
        data
      );
      setIsEditingSingleHealthCenter(false);
      refreshHealthCenters();
    }
  };

  const handleDeleteHealthCenter = async () => {
    if (!selectedHealthCenter) return;
    await healthCenterService.deleteHealthCenter(selectedHealthCenter.id);
    setSelectedHealthCenter(null);
    refreshHealthCenters();
  };

  const healthZones = useMemo(
    () =>
      healthCenters
        .filter((hc) => hc.lat !== null && hc.lon !== null)
        .map((hc) => ({
          id: `hc-${hc.id}`,
          nombre: hc.nombre,
          descripcion: `${hc.tipo} · ${
            hc.direccion || hc.localidad || "Corrientes"
          }`,
          latitud: hc.lat!,
          longitud: hc.lon!,
          created_at: hc.updated_at,
          isHealthCenter: true,
          tipo: hc.tipo,
        })),
    [healthCenters]
  );
  const [isCreatingSafeZone, setIsCreatingSafeZone] = useState(false);
  const [isEditingSafeZones, setIsEditingSafeZones] = useState(false);
  const [draftLocation, setDraftLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [selectedSafeZoneId, setSelectedSafeZoneId] = useState<string | null>(
    null
  );
  const selectedSafeZone = useMemo(
    () => safeZones.find((z) => z.id === selectedSafeZoneId) ?? null,
    [safeZones, selectedSafeZoneId]
  );
  const setSelectedSafeZone = useCallback((zone: SafeZone | null) => {
    setSelectedSafeZoneId(zone?.id ?? null);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (initialSafeZoneId) setSelectedSafeZoneId(initialSafeZoneId);
  }, [initialSafeZoneId]);
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
  } = useReports(initialReports, initialReportId);

  // Mapa de calor: reutilizamos la misma lógica que ReportMapInternal
  const heatPoints = useMemo(() => buildHeatPoints(reports), [reports]);

  // Hook de rutas seguras
  const { routingState, startRouting, clearRoute } = useRouting(
    safeZones,
    heatPoints
  );

  const [navigatingTargetId, setNavigatingTargetId] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (routingState.status !== "loading") {
      queueMicrotask(() => {
        setNavigatingTargetId(null);
      });
    }
  }, [routingState.status]);

  const [draftCustomPin, setDraftCustomPin] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [activeRouteCustomPin, setActiveRouteCustomPin] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [closingCustomPin, setClosingCustomPin] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [isClosingDraftCustomPin, setIsClosingDraftCustomPin] = useState(false);

  const [displayRoute, setDisplayRoute] = useState<RouteResult | null>(null);
  const [isClosingRoute, setIsClosingRoute] = useState(false);

  const prevActiveRouteRef = useRef<RouteResult | null>(null);

  useEffect(() => {
    if (
      routingState.activeRoute &&
      routingState.activeRoute !== prevActiveRouteRef.current
    ) {
      prevActiveRouteRef.current = routingState.activeRoute;
      queueMicrotask(() => {
        setDisplayRoute(routingState.activeRoute);
        setIsClosingRoute(false);

        const isNewRouteCustom =
          routingState.activeRoute?.zone?.id === "custom-point";

        if (isNewRouteCustom && draftCustomPin) {
          const newTargetPin = {
            lat: draftCustomPin.lat,
            lng: draftCustomPin.lng,
          };
          if (activeRouteCustomPin) {
            const oldPin = activeRouteCustomPin;
            setClosingCustomPin(oldPin);
            setTimeout(() => {
              setClosingCustomPin((curr) => (curr === oldPin ? null : curr));
            }, 300);
          }
          setActiveRouteCustomPin(newTargetPin);
          setDraftCustomPin(null);
          setIsClosingDraftCustomPin(false);
        } else if (!isNewRouteCustom) {
          if (activeRouteCustomPin) {
            const oldPin = activeRouteCustomPin;
            setClosingCustomPin(oldPin);
            setActiveRouteCustomPin(null);
            setTimeout(() => {
              setClosingCustomPin((curr) => (curr === oldPin ? null : curr));
            }, 300);
          }
          if (draftCustomPin) {
            setDraftCustomPin(null);
            setIsClosingDraftCustomPin(false);
          }
        }

        if (selectedSafeZone) {
          setSelectedSafeZone(null);
        }
      });
    } else if (!routingState.activeRoute) {
      prevActiveRouteRef.current = null;
    }
  }, [
    routingState.activeRoute,
    draftCustomPin,
    activeRouteCustomPin,
    selectedSafeZone,
    setSelectedSafeZone,
  ]);

  const handleCancelRoute = () => {
    setIsClosingRoute(true);
    if (activeRouteCustomPin) {
      setClosingCustomPin(activeRouteCustomPin);
      setActiveRouteCustomPin(null);
    }
    setTimeout(() => {
      clearRoute();
      setDisplayRoute(null);
      setIsClosingRoute(false);
      setClosingCustomPin(null);
    }, 300);
  };

  const handleCloseDraftCustomPin = () => {
    setIsClosingDraftCustomPin(true);
    if (draftCustomPin) {
      const pinToClose = draftCustomPin;
      setDraftCustomPin(null);
      setClosingCustomPin(pinToClose);
      setTimeout(() => {
        setIsClosingDraftCustomPin(false);
        setClosingCustomPin((curr) => (curr === pinToClose ? null : curr));
      }, 300);
    } else {
      setIsClosingDraftCustomPin(false);
    }
  };

  const handleNavigateToCustomPoint = (point: {
    lat: number;
    lng: number;
    address: string;
  }) => {
    const customZone: SafeZone = {
      id: "custom-point",
      nombre: point.address || "Ubicación seleccionada",
      descripcion: "",
      latitud: point.lat,
      longitud: point.lng,
      created_at: new Date().toISOString(),
    };

    setNavigatingTargetId("custom-point");
    startRouting(customZone);
  };

  const hideMainUI = isCreatingSafeZone || isEditingSafeZones;

  useEffect(() => {
    syncUrl(selectedReport?.id ?? null, selectedSafeZone?.id ?? null);
  }, [selectedReport?.id, selectedSafeZone?.id, syncUrl]);

  const handleMapClick = (lat: number, lng: number) => {
    if (isCreatingSafeZone) {
      setDraftLocation({ lat, lng });
    } else if (!isAdmin) {
      setDraftCustomPin({ lat, lng });
      setIsClosingDraftCustomPin(false);
      setSelectedReport(null);
      setSelectedSafeZone(null);
      setSelectedHealthCenter(null);
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
      setSelectedReport(null);
      setSelectedSafeZone(null);
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
      {/* Main Sidebar - always mounted for transitions */}
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
            setSelectedSafeZone(null);
            setSelectedHealthCenter(null);
          }}
          onUpdateFilter={updateFilter}
          onResetFilters={resetFilters}
          isAdmin={isAdmin}
          safeZones={safeZones}
          selectedSafeZone={selectedSafeZone}
          onSelectSafeZone={(zone) => {
            setSelectedSafeZone(zone);
            setSelectedReport(null);
            setSelectedHealthCenter(null);
            setIsEditingSafeZones(false);
            setIsCreatingSafeZone(false);
            setDraftLocation(null);
          }}
          onCreateSafeZone={() => {
            setIsCreatingSafeZone(true);
          }}
          healthCenters={healthCenters}
          selectedHealthCenter={selectedHealthCenter}
          onSelectHealthCenter={(center) => {
            setSelectedHealthCenter(center);
            setSelectedReport(null);
            setSelectedSafeZone(null);
            setIsEditingSafeZones(false);
            setIsCreatingSafeZone(false);
            setDraftLocation(null);
          }}
          onCollapse={() => setSidebarCollapsed(true)}
          // Props de navegación (sólo usadas en modo usuario, nunca en admin)
          onNavigateToNearest={
            !isAdmin
              ? () => {
                  setNavigatingTargetId("nearest");
                  startRouting(null);
                }
              : undefined
          }
          isNavigatingNearest={
            routingState.status === "loading" &&
            navigatingTargetId === "nearest"
          }
          onNavigateToNearestHealthCenter={() => {
            setNavigatingTargetId("nearest-hc");
            startRouting(null, healthZones);
          }}
          isNavigatingNearestHealthCenter={
            routingState.status === "loading" &&
            navigatingTargetId === "nearest-hc"
          }
        />
      </div>
      {/* Tongue tab — always rendered, slides in/out smoothly */}
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
              ? "transform 200ms ease-out 350ms" /* slide in AFTER sidebar finishes hiding */
              : "transform 200ms ease-in" /* slide out immediately when sidebar opens or UI hidden */,
        }}
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {isAdmin && (
        <LiquidGlassSegmentedBar
          tabs={["Todo", "Barrios", "Mi lista 1"]}
          activeTab={activeListTab}
          onTabChange={(tab) => {
            setActiveListTab(tab);
            if (tab === "Barrios") {
              window.history.pushState(
                null,
                "",
                `/barrios${window.location.search}`
              );
            } else {
              window.history.pushState(null, "", `/${window.location.search}`);
            }
          }}
          onAddList={() => {
            const listName = prompt("Nombre de la nueva lista:");
            if (listName) {
              setActiveListTab(listName);
              window.history.pushState(null, "", `/${window.location.search}`);
            }
          }}
          isHidden={hideMainUI}
        />
      )}

      <section className="absolute inset-0 h-full w-full">
        <ReportMap
          reports={reports}
          selectedReport={selectedReport}
          onSelectReport={(report) => {
            setSelectedReport(report);
            setSelectedSafeZone(null);
            setSelectedHealthCenter(null);
            if (draftCustomPin) handleCloseDraftCustomPin();
          }}
          safeZones={safeZones}
          selectedSafeZone={selectedSafeZone}
          onSelectSafeZone={(zone) => {
            setSelectedSafeZone(zone);
            setSelectedReport(null);
            setSelectedHealthCenter(null);
            if (draftCustomPin) handleCloseDraftCustomPin();
          }}
          healthCenters={healthCenters}
          selectedHealthCenter={selectedHealthCenter}
          onSelectHealthCenter={(center) => {
            setSelectedHealthCenter(center);
            setSelectedReport(null);
            setSelectedSafeZone(null);
            if (draftCustomPin) handleCloseDraftCustomPin();
          }}
          onMapClick={handleMapClick}
          isCreatingSafeZone={isCreatingSafeZone}
          draftLocation={draftLocation}
          draftCustomPin={!isAdmin ? draftCustomPin : null}
          activeRouteCustomPin={!isAdmin ? activeRouteCustomPin : null}
          closingCustomPin={!isAdmin ? closingCustomPin : null}
          activeRoute={!isAdmin ? displayRoute : null}
          isClosingRoute={isClosingRoute}
          isAdmin={isAdmin}
          showEvacuationCenters={showEvacuationCenters}
          showMedicalCenters={showMedicalCenters}
          showBarrios={isAdmin ? activeListTab === "Barrios" : false}
        />
      </section>

      {/* Layer Controls & References for Admin */}
      {isAdmin && (
        <LayerControls
          showEvacuationCenters={showEvacuationCenters}
          setShowEvacuationCenters={setShowEvacuationCenters}
          showMedicalCenters={showMedicalCenters}
          setShowMedicalCenters={setShowMedicalCenters}
          onCreateEvacuationCenter={() => setIsCreatingSafeZone(true)}
          onCreateMedicalCenter={() => setIsCreatingSafeZone(true)}
          isHidden={hideMainUI}
        />
      )}

      {/* Banner de ruta activa — solo para usuarios */}
      {!isAdmin && displayRoute && (
        <div
          className={`absolute top-4 left-1/2 -translate-x-1/2 z-[500] flex items-center justify-between gap-4 rounded-2xl border border-white/50 bg-white/60 backdrop-blur-md px-4 py-2 shadow-lg transition-all duration-300 ease-out ${
            isClosingRoute
              ? "-translate-y-28 opacity-0 pointer-events-none"
              : "translate-y-0 opacity-100"
          }`}
          style={{ maxWidth: "calc(100vw - 2rem)" }}
        >
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-zinc-800 text-nowrap">
              Ruta a {displayRoute.zone.nombre}
            </span>
            <span className="text-[11px] text-zinc-500 text-nowrap">
              Distancia: {(displayRoute.distanceM / 1000).toFixed(1)} km ·
              Riesgo:{" "}
              {displayRoute.riskScore < 1
                ? "bajo"
                : displayRoute.riskScore < 3
                  ? "medio"
                  : "alto"}
            </span>
          </div>
          <button
            onClick={handleCancelRoute}
            title="Cancelar ruta"
            className="rounded-full p-1 text-zinc-400 transition-colors hover:bg-zinc-200/50 hover:text-zinc-700 cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Banner de error de routing */}
      {!isAdmin && routingState.status === "error" && routingState.error && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-3 rounded-2xl border border-red-200 bg-white/90 backdrop-blur-md px-4 py-2.5 shadow-xl"
          style={{ maxWidth: "calc(100vw - 2rem)" }}
        >
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
          <span className="text-xs font-medium text-red-700">
            {routingState.error}
          </span>
          <button
            onClick={clearRoute}
            title="Cerrar"
            className="ml-1 rounded-full p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Auth widget - conditionally rendered is fine since it's top right, but sliding out is better */}
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
        onLogin={() => {
          setShowLoginModal(false);
        }}
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
          customPoint={draftCustomPin}
          isOpen={!!draftCustomPin && !isClosingDraftCustomPin && !hideMainUI}
          onClose={handleCloseDraftCustomPin}
          onNavigate={handleNavigateToCustomPoint}
          isNavigating={
            routingState.status === "loading" &&
            navigatingTargetId === "custom-point"
          }
        />
      )}

      {hideMainUI && !showSafeZoneModal && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] flex gap-3">
          <button
            onClick={() => {
              setIsCreatingSafeZone(false);
              setIsEditingSafeZones(false);
              setDraftLocation(null);
              setShowSafeZoneModal(false);
            }}
            className="flex items-center justify-center gap-2 rounded-full border border-red-200 bg-white px-6 py-3 text-sm font-bold text-red-600 shadow-xl transition-all duration-200 hover:bg-red-50 hover:scale-105 active:scale-95 cursor-pointer"
          >
            Cancelar
          </button>
          {isCreatingSafeZone && (
            <button
              onClick={() => {
                if (draftLocation) setShowSafeZoneModal(true);
              }}
              disabled={!draftLocation}
              className="flex items-center justify-center gap-2 rounded-full border border-blue-200 bg-white px-6 py-3 text-sm font-bold text-blue-700 shadow-xl transition-all duration-200 hover:bg-blue-50 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:active:scale-100 disabled:cursor-not-allowed cursor-pointer"
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
          title="Editar Centro de Evacuación"
          initialData={{
            nombre: selectedSafeZone.nombre,
            descripcion: selectedSafeZone.descripcion,
          }}
          onClose={() => setIsEditingSingleSafeZone(false)}
          onSave={handleSaveSafeZone}
        />
      )}

      <SafeZoneDetailSidebar
        safeZone={selectedSafeZone}
        isOpen={!!selectedSafeZone && !hideMainUI && !isEditingSingleSafeZone}
        onClose={() => setSelectedSafeZone(null)}
        onEdit={isAdmin ? () => setIsEditingSingleSafeZone(true) : undefined}
        onDelete={isAdmin ? handleDeleteSafeZone : undefined}
        onNavigate={
          !isAdmin
            ? () => {
                if (selectedSafeZone) {
                  setNavigatingTargetId(selectedSafeZone.id);
                  startRouting(selectedSafeZone);
                }
              }
            : undefined
        }
        isNavigating={
          routingState.status === "loading" &&
          navigatingTargetId === selectedSafeZone?.id
        }
      />

      {isEditingSingleHealthCenter && selectedHealthCenter && (
        <HealthCenterModal
          isOpen={true}
          title="Editar Centro de Salud"
          initialData={{
            nombre: selectedHealthCenter.nombre,
            tipo: selectedHealthCenter.tipo,
          }}
          onClose={() => setIsEditingSingleHealthCenter(false)}
          onSave={handleSaveHealthCenter}
        />
      )}

      <SafeZoneDetailSidebar
        safeZone={
          selectedHealthCenter &&
          selectedHealthCenter.lat !== null &&
          selectedHealthCenter.lon !== null
            ? {
                id: `hc-${selectedHealthCenter.id}`,
                nombre: selectedHealthCenter.nombre,
                descripcion: "",
                latitud: selectedHealthCenter.lat,
                longitud: selectedHealthCenter.lon,
                created_at: selectedHealthCenter.updated_at,
              }
            : null
        }
        categoryTitle="Centro de salud"
        typeText={selectedHealthCenter?.tipo}
        buttonColor="blue"
        isOpen={
          !!selectedHealthCenter && !hideMainUI && !isEditingSingleHealthCenter
        }
        onClose={() => setSelectedHealthCenter(null)}
        onEdit={
          isAdmin ? () => setIsEditingSingleHealthCenter(true) : undefined
        }
        onDelete={isAdmin ? handleDeleteHealthCenter : undefined}
        onNavigate={
          !isAdmin &&
          selectedHealthCenter &&
          selectedHealthCenter.lat !== null &&
          selectedHealthCenter.lon !== null
            ? () => {
                const hcZone: SafeZone & {
                  isHealthCenter?: boolean;
                  tipo?: string;
                } = {
                  id: `hc-${selectedHealthCenter.id}`,
                  nombre: selectedHealthCenter.nombre,
                  descripcion: `${selectedHealthCenter.tipo} · ${
                    selectedHealthCenter.direccion ||
                    selectedHealthCenter.localidad ||
                    "Corrientes"
                  }`,
                  latitud: selectedHealthCenter.lat!,
                  longitud: selectedHealthCenter.lon!,
                  created_at: selectedHealthCenter.updated_at,
                  isHealthCenter: true,
                  tipo: selectedHealthCenter.tipo,
                };
                setNavigatingTargetId(selectedHealthCenter.id);
                startRouting(hcZone);
              }
            : undefined
        }
        isNavigating={
          routingState.status === "loading" &&
          navigatingTargetId === selectedHealthCenter?.id
        }
      />
    </>
  );
}
