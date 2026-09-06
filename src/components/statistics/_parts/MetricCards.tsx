"use client";

import { useMemo, useState } from "react";
import { Report, ReportType } from "@/types/report";
import { BarriosFeatureCollection } from "@/services/barrioService";
import { isPointInGeoJSONGeometry } from "@/lib/geometry";
import { Switch } from "@/components/ui/Switch";
import { RangeCalendarModal } from "./RangeCalendarModal";

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
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  // 1. Total de reclamos
  const totalReclamos = reports.length;

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
      const hasReport = reports.some((r) =>
        isPointInGeoJSONGeometry([r.latitud, r.longitud], feature.geometry)
      );
      if (hasReport) barriosConReclamos++;
    }

    return Math.round((barriosConReclamos / totalBarrios) * 100);
  }, [barriosGeoJson, reports]);

  // 3. Cantidad de lluvia caída (acumulado en mm en los reportes del periodo)
  const lluviaAcumulada = useMemo(() => {
    const totalMm = reports.reduce((acc, r) => acc + (r.lluviaMm || 0), 0);
    return Math.round(totalMm * 10) / 10;
  }, [reports]);

  const handlePeriodSelect = (val: string) => {
    const p = val as PeriodType;
    onPeriodChange(p);
    if (p === "RANGO") {
      setShowCalendarModal(true);
    } else {
      setShowCalendarModal(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Controles de Filtro Superiores (Sin fondo blanco) */}
      <div className="flex flex-wrap items-center justify-between gap-4 w-full py-1">
        {/* Lado Izquierdo: Periodo y Tipo de Reclamo */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Filtro Periodo */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-600 dark:text-slate-400">
              Periodo:
            </span>
            <div className="relative">
              <Switch value={period} onValueChange={handlePeriodSelect}>
                <Switch.Option value="HOY">Hoy</Switch.Option>
                <Switch.Option value="7DIAS">Últimos 7 días</Switch.Option>
                <Switch.Option value="RANGO">Desde - Hasta</Switch.Option>
              </Switch>

              {/* Calendario de Rango Único */}
              <RangeCalendarModal
                isOpen={period === "RANGO" && showCalendarModal}
                onClose={() => setShowCalendarModal(false)}
                startDate={startDate}
                endDate={endDate}
                onSelectRange={(s, e) => onDateChange(s, e)}
              />
            </div>
          </div>

          {/* Filtro Tipo de Reclamo */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-600 dark:text-slate-400">
              Tipo de reclamo:
            </span>
            <Switch
              value={selectedType}
              onValueChange={(val) => onTypeChange(val as ReportType | "TODOS")}
            >
              <Switch.Option value="TODOS">Todos</Switch.Option>
              <Switch.Option value="INUNDACION_URBANA">
                Inundación
              </Switch.Option>
              <Switch.Option value="LLUVIAS_FUERTES">
                Lluvias fuertes
              </Switch.Option>
              <Switch.Option value="GRANIZO">Granizo</Switch.Option>
              <Switch.Option value="ANEGAMIENTO_VIVIENDA">
                Anegamiento
              </Switch.Option>
            </Switch>
          </div>
        </div>
      </div>

      {/* Tarjetas de Métricas (3 tarjetas) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tarjeta 1: Total de Reclamos */}
        <div className="bg-white dark:bg-[#161f36] rounded-2xl p-5 border border-gray-200 dark:border-[#2b395b] shadow-2xs flex flex-col justify-between hover:border-gray-300 dark:hover:border-[#3d5691] transition">
          <span className="text-xs font-semibold text-zinc-500 dark:text-slate-400 uppercase tracking-wider">
            Total de reclamos
          </span>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              key={`val-total-${totalReclamos}-${period}-${selectedType}-${startDate}-${endDate}`}
              className="text-4xl font-extrabold text-zinc-900 dark:text-slate-100 tracking-tight animate-fade-kpi inline-block"
            >
              {totalReclamos.toLocaleString("es-AR")}
            </span>
            <span className="text-xs font-medium text-zinc-400 dark:text-slate-500">
              registrados
            </span>
          </div>
        </div>

        {/* Tarjeta 2: Porcentaje Afectado */}
        <div className="bg-white dark:bg-[#161f36] rounded-2xl p-5 border border-gray-200 dark:border-[#2b395b] shadow-2xs flex flex-col justify-between hover:border-gray-300 dark:hover:border-[#3d5691] transition">
          <span className="text-xs font-semibold text-zinc-500 dark:text-slate-400 uppercase tracking-wider">
            Porcentaje de la ciudad afectada
          </span>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              key={`val-porcentaje-${porcentajeAfectado}-${period}-${selectedType}-${startDate}-${endDate}`}
              className="text-4xl font-extrabold text-zinc-900 dark:text-slate-100 tracking-tight animate-fade-kpi inline-block"
            >
              {porcentajeAfectado}%
            </span>
            <span className="text-xs font-medium text-zinc-400 dark:text-slate-500">
              de barrios con reclamos
            </span>
          </div>
        </div>

        {/* Tarjeta 3: Cantidad de Lluvia Caída */}
        <div className="bg-white dark:bg-[#161f36] rounded-2xl p-5 border border-gray-200 dark:border-[#2b395b] shadow-2xs flex flex-col justify-between hover:border-gray-300 dark:hover:border-[#3d5691] transition">
          <span className="text-xs font-semibold text-zinc-500 dark:text-slate-400 uppercase tracking-wider">
            Lluvia acumulada
          </span>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              key={`val-lluvia-${lluviaAcumulada}-${period}-${selectedType}-${startDate}-${endDate}`}
              className="text-4xl font-extrabold text-zinc-900 dark:text-slate-100 tracking-tight animate-fade-kpi inline-block"
            >
              {lluviaAcumulada}
            </span>
            <span className="text-sm font-bold text-zinc-600 dark:text-slate-300">
              mm
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
