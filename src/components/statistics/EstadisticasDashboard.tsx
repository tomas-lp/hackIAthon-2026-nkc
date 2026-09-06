"use client";

import { useMemo, useState } from "react";
import { User } from "@supabase/supabase-js";
import { Report, ReportType } from "@/types/report";
import { BarriosFeatureCollection } from "@/services/barrioService";
import { RegionLista, RegionPersonalizada } from "@/types/region";
import { AuthWidget } from "@/components/common/AuthWidget";
import { MetricCards, PeriodType } from "./_parts/MetricCards";
import { RegionAnalysis } from "./_parts/RegionAnalysis";
import { TendenciaChart } from "./_parts/TendenciaChart";

interface EstadisticasDashboardProps {
  allReports: Report[];
  barriosGeoJson: BarriosFeatureCollection | null;
  regionLists: RegionLista[];
  customRegions: RegionPersonalizada[];
  user?: User;
}

export function EstadisticasDashboard({
  allReports,
  barriosGeoJson,
  regionLists,
  customRegions,
}: EstadisticasDashboardProps) {
  // Estados de filtros superiores
  const [period, setPeriod] = useState<PeriodType>("HOY");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedType, setSelectedType] = useState<ReportType | "TODOS">(
    "TODOS"
  );
  const [selectedZoneFilter, setSelectedZoneFilter] =
    useState<string>("BARRIOS");

  // Filtrado general de reportes según Periodo y Tipo de Reclamo
  const filteredReports = useMemo(() => {
    const now = new Date();
    return allReports.filter((r) => {
      // Filtro por tipo
      if (selectedType !== "TODOS" && r.tipo !== selectedType) {
        return false;
      }

      // Filtro por periodo
      const reportDate = new Date(r.fecha);
      if (period === "HOY") {
        const startOfDay = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        if (reportDate < startOfDay) return false;
      } else if (period === "7DIAS") {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (reportDate < sevenDaysAgo) return false;
      } else if (period === "RANGO") {
        if (startDate) {
          const s = new Date(startDate);
          s.setHours(0, 0, 0, 0);
          if (reportDate < s) return false;
        }
        if (endDate) {
          const e = new Date(endDate);
          e.setHours(23, 59, 59, 999);
          if (reportDate > e) return false;
        }
      }
      return true;
    });
  }, [allReports, selectedType, period, startDate, endDate]);

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-zinc-100 dark:bg-[#0b101d] font-sans text-zinc-900 dark:text-slate-100">
      {/* Área Principal con la misma estructura y espaciado que Regiones y Marcadores */}
      <div
        className={`flex-1 flex flex-col h-full overflow-y-auto pt-16 pb-12 transition-all duration-300 ease-in-out ${"px-6"}`}
      >
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-2 font-sans flex flex-col gap-5">
          {/* Encabezado Superior */}
          <div className="flex items-center justify-between gap-4 mb-1">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-slate-100 tracking-tight">
                Panel de Administración
              </h1>
            </div>

            <AuthWidget
              isAdmin={true}
              onLoginClick={() => {}}
              onLogoutClick={async () => {
                const { logoutFromSession } =
                  await import("@/app/auth/actions");
                await logoutFromSession();
                window.location.reload();
              }}
            />
          </div>

          {/* Contenido Dashboard */}
          <div className="flex flex-col gap-6 pb-12">
            {/* 1. Tarjetas de Métricas */}
            <MetricCards
              reports={filteredReports}
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

            {/* 2. Análisis por región (Afectado por los filtros de arriba) */}
            <RegionAnalysis
              reports={filteredReports}
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
    </div>
  );
}
