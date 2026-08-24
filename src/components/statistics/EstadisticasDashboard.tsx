"use client";

import { useState } from "react";
import { User } from "@supabase/supabase-js";
import { Report, ReportType } from "@/types/report";
import { BarriosFeatureCollection } from "@/services/barrioService";
import { RegionLista, RegionPersonalizada } from "@/types/region";
import { Sidebar } from "@/components/common/Sidebar";
import { AuthWidget } from "@/components/common/AuthWidget";
import { MetricCards, PeriodType } from "./_parts/MetricCards";
import { RegionAnalysis } from "./_parts/RegionAnalysis";
import { TendenciaChart } from "./_parts/TendenciaChart";
import { ChevronRight } from "lucide-react";

interface EstadisticasDashboardProps {
  allReports: Report[];
  barriosGeoJson: BarriosFeatureCollection | null;
  regionLists: RegionLista[];
  customRegions: RegionPersonalizada[];
  user: User;
}

export function EstadisticasDashboard({
  allReports,
  barriosGeoJson,
  regionLists,
  customRegions,
  user,
}: EstadisticasDashboardProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Estados de filtros
  const [period, setPeriod] = useState<PeriodType>("HOY");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedType, setSelectedType] = useState<ReportType | "TODOS">(
    "TODOS"
  );
  const [selectedZoneFilter, setSelectedZoneFilter] =
    useState<string>("MAPA_CALOR");

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-zinc-100 font-sans text-zinc-900">
      {/* Sidebar Enlazado */}
      <div
        className="absolute left-0 top-0 z-[100] transition-transform duration-300 ease-in-out"
        style={{
          transform: sidebarCollapsed ? "translateX(-110%)" : "translateX(0)",
        }}
      >
        <Sidebar
          reports={allReports}
          filters={{ tipo: "TODOS" }}
          loading={false}
          error={null}
          selectedReport={null}
          onSelectReport={() => {}}
          onUpdateFilter={() => {}}
          onResetFilters={() => {}}
          isAdmin={true}
          activeAdminTab="Panel de Estadísticas"
          onCollapse={() => setSidebarCollapsed(true)}
        />
      </div>

      {/* Botón desplegar Sidebar */}
      <button
        onClick={() => setSidebarCollapsed(false)}
        title="Mostrar panel"
        className="absolute left-0 top-6 z-[100] flex items-center justify-center rounded-r-xl border border-l-0 border-gray-200 bg-white px-1.5 py-3 text-gray-400 shadow-md transition-colors hover:bg-gray-50 hover:text-gray-600 cursor-pointer"
        style={{
          transform: sidebarCollapsed ? "translateX(0)" : "translateX(-100%)",
          transition: sidebarCollapsed
            ? "transform 200ms ease-out 350ms"
            : "transform 200ms ease-in",
        }}
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {/* Área Principal */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto pl-80 pr-6 py-6 transition-all duration-300">
        {/* Encabezado Superior */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
              Panel de estadísticas
            </h1>
            <p className="text-xs font-medium text-zinc-500 mt-0.5">
              Monitoreo general e indicadores de reclamos e inundaciones en
              Corrientes.
            </p>
          </div>

          <AuthWidget
            isAdmin={true}
            onLoginClick={() => {}}
            onLogoutClick={async () => {
              const { logoutFromSession } = await import("@/app/auth/actions");
              await logoutFromSession();
              window.location.reload();
            }}
          />
        </div>

        {/* Contenido Dashboard */}
        <div className="flex flex-col gap-6 pb-12">
          {/* 1. Tarjetas de Métricas */}
          <MetricCards
            reports={allReports}
            barriosGeoJson={barriosGeoJson}
            period={period}
            onPeriodChange={setPeriod}
            startDate={startDate}
            endDate={endDate}
            onDateChange={(s, e) => {
              setStartDate(s);
              setEndDate(e);
            }}
            selectedType={selectedType}
            onTypeChange={setSelectedType}
          />

          {/* 2. Análisis por región */}
          <RegionAnalysis
            reports={allReports}
            barriosGeoJson={barriosGeoJson}
            regionLists={regionLists}
            customRegions={customRegions}
            selectedZoneFilter={selectedZoneFilter}
            onZoneFilterChange={setSelectedZoneFilter}
          />

          {/* 3. Tendencia de Reclamos */}
          <TendenciaChart reports={allReports} />
        </div>
      </div>
    </div>
  );
}
