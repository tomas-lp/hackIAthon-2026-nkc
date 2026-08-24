"use client";

import { useMemo, useState } from "react";
import { Report, ReportType } from "@/types/report";
import { TYPE_CONFIG } from "@/lib/constants";
import { BarriosFeatureCollection } from "@/services/barrioService";
import { isPointInGeoJSONGeometry } from "@/lib/geometry";
import { Calendar, ChevronDown, Filter } from "lucide-react";

export type PeriodType = "HOY" | "7DIAS" | "RANGO";

interface MetricCardsProps {
  reports: Report[];
  barriosGeoJson: BarriosFeatureCollection | null;
  period: PeriodType;
  onPeriodChange: (period: PeriodType) => void;
  startDate: string;
  endDate: string;
  onDateChange: (start: string, end: string) => void;
  selectedType: ReportType | "TODOS";
  onTypeChange: (type: ReportType | "TODOS") => void;
}

export function MetricCards({
  reports,
  barriosGeoJson,
  period,
  onPeriodChange,
  startDate,
  endDate,
  onDateChange,
  selectedType,
  onTypeChange,
}: MetricCardsProps) {
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

  // Filtrar reportes según periodo y tipo
  const filteredReports = useMemo(() => {
    const now = new Date();
    return reports.filter((r) => {
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
  }, [reports, selectedType, period, startDate, endDate]);

  // 1. Total de reclamos
  const totalReclamos = filteredReports.length;

  // 2. Porcentaje de la ciudad afectada (% de barrios con al menos 1 reclamo)
  const porcentajeAfectado = useMemo(() => {
    if (
      !barriosGeoJson ||
      !barriosGeoJson.features ||
      barriosGeoJson.features.length === 0
    ) {
      return 0;
    }
    const totalBarrios = barriosGeoJson.features.length;
    let barriosConReclamos = 0;

    for (const feature of barriosGeoJson.features) {
      const hasReport = filteredReports.some((r) =>
        isPointInGeoJSONGeometry([r.latitud, r.longitud], feature.geometry)
      );
      if (hasReport) barriosConReclamos++;
    }

    return Math.round((barriosConReclamos / totalBarrios) * 100);
  }, [barriosGeoJson, filteredReports]);

  // 3. Cantidad de lluvia caída (acumulado en mm en los reportes del periodo)
  const lluviaAcumulada = useMemo(() => {
    const totalMm = filteredReports.reduce(
      (acc, r) => acc + (r.lluviaMm || 0),
      0
    );
    // Si hay reportes pero suma 0, devolver el máximo o promedio razonable
    return Math.round(totalMm * 10) / 10;
  }, [filteredReports]);

  const typeOptions: { value: ReportType | "TODOS"; label: string }[] = [
    { value: "TODOS", label: "Todos los reclamos" },
    ...(Object.keys(TYPE_CONFIG) as ReportType[]).map((t) => ({
      value: t,
      label: TYPE_CONFIG[t].label,
    })),
  ];

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Controles de Filtro Superiores */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
        {/* Selector de Periodo */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Periodo:
          </span>
          <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl">
            <button
              onClick={() => onPeriodChange("HOY")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                period === "HOY"
                  ? "bg-white text-zinc-900 shadow-2xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => onPeriodChange("7DIAS")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                period === "7DIAS"
                  ? "bg-white text-zinc-900 shadow-2xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              Últimos 7 días
            </button>
            <button
              onClick={() => onPeriodChange("RANGO")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                period === "RANGO"
                  ? "bg-white text-zinc-900 shadow-2xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Desde - Hasta
            </button>
          </div>

          {period === "RANGO" && (
            <div className="flex items-center gap-2 ml-2 animate-fadeIn">
              <input
                type="date"
                value={startDate}
                onChange={(e) => onDateChange(e.target.value, endDate)}
                className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white text-zinc-800"
              />
              <span className="text-xs text-zinc-400">a</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => onDateChange(startDate, e.target.value)}
                className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white text-zinc-800"
              />
            </div>
          )}
        </div>

        {/* Selector de Tipo de Reclamo */}
        <div className="relative">
          <button
            onClick={() => setIsTypeDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200/80 px-3.5 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-zinc-800 transition cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5 text-zinc-500" />
            <span>
              Tipo: {typeOptions.find((t) => t.value === selectedType)?.label}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          </button>

          {isTypeDropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 z-50 w-52 bg-white rounded-xl border border-gray-200 shadow-lg p-1.5 flex flex-col gap-0.5">
              {typeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    onTypeChange(opt.value);
                    setIsTypeDropdownOpen(false);
                  }}
                  className={`text-left px-3 py-2 text-xs rounded-lg font-medium transition cursor-pointer ${
                    selectedType === opt.value
                      ? "bg-zinc-100 font-bold text-zinc-900"
                      : "text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tarjetas de Métricas (3 tarjetas) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tarjeta 1: Total de Reclamos */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-2xs flex flex-col justify-between hover:border-gray-300 transition">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Total de reclamos
          </span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-zinc-900 tracking-tight">
              {totalReclamos.toLocaleString("es-AR")}
            </span>
            <span className="text-xs font-medium text-zinc-400">
              registrados
            </span>
          </div>
        </div>

        {/* Tarjeta 2: Porcentaje Afectado */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-2xs flex flex-col justify-between hover:border-gray-300 transition">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Porcentaje de la ciudad afectada
          </span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-zinc-900 tracking-tight">
              {porcentajeAfectado}%
            </span>
            <span className="text-xs font-medium text-zinc-400">
              de barrios con reclamos
            </span>
          </div>
        </div>

        {/* Tarjeta 3: Cantidad de Lluvia Caída */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-2xs flex flex-col justify-between hover:border-gray-300 transition">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Lluvia acumulada
          </span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-zinc-900 tracking-tight">
              {lluviaAcumulada}
            </span>
            <span className="text-sm font-bold text-zinc-600">mm</span>
          </div>
        </div>
      </div>
    </div>
  );
}
