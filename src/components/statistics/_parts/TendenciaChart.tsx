"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { ResponsiveLine } from "@nivo/line";
import { Report } from "@/types/report";
import { Switch } from "@/components/ui/Switch";
import { ChevronDown, Plus } from "lucide-react";

interface TendenciaChartProps {
  reports: Report[];
}

const MONTH_NAMES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

const MONTH_FULL_NAMES: Record<string, string> = {
  Ene: "Enero",
  Feb: "Febrero",
  Mar: "Marzo",
  Abr: "Abril",
  May: "Mayo",
  Jun: "Junio",
  Jul: "Julio",
  Ago: "Agosto",
  Sep: "Septiembre",
  Oct: "Octubre",
  Nov: "Noviembre",
  Dic: "Diciembre",
};

const YEAR_COLORS: Record<number, string> = {
  2026: "#2563eb", // Azul
  2025: "#059669", // Esmeralda
  2024: "#d97706", // Ámbar
  2023: "#7c3aed", // Violeta
  2022: "#e11d48", // Rosa
  2021: "#0284c7", // Celeste
};

const DEFAULT_COLORS = [
  "#2563eb",
  "#059669",
  "#d97706",
  "#7c3aed",
  "#e11d48",
  "#0284c7",
];

export function TendenciaChart({ reports = [] }: TendenciaChartProps) {
  // Años disponibles en los reportes ordenados descendente
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    const safeReports = reports || [];
    for (const r of safeReports) {
      if (r && r.fecha) {
        const yr = new Date(r.fecha).getFullYear();
        if (!isNaN(yr)) yearsSet.add(yr);
      }
    }
    const currentYear = new Date().getFullYear();
    yearsSet.add(currentYear);
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [reports]);

  const [selectedYear, setSelectedYear] = useState<number | "TODOS">(
    availableYears[0] || new Date().getFullYear()
  );

  const [isYearOverflowOpen, setIsYearOverflowOpen] = useState(false);
  const yearOverflowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        yearOverflowRef.current &&
        !yearOverflowRef.current.contains(e.target as Node)
      ) {
        setIsYearOverflowOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const MAX_VISIBLE_YEARS = 3;
  const visibleYears = availableYears.slice(0, MAX_VISIBLE_YEARS);
  const overflowYears = availableYears.slice(MAX_VISIBLE_YEARS);

  // Generar datos para Nivo Line
  const { chartSeries } = useMemo(() => {
    const safeReports = reports || [];

    if (selectedYear === "TODOS") {
      // Si es TODOS, generamos una línea por cada año disponible
      const series = availableYears.map((yr, idx) => {
        const monthlyCounts = Array(12).fill(0);
        for (const r of safeReports) {
          if (!r || !r.fecha) continue;
          const rDate = new Date(r.fecha);
          if (!isNaN(rDate.getTime()) && rDate.getFullYear() === yr) {
            const m = rDate.getMonth();
            if (m >= 0 && m < 12) monthlyCounts[m]++;
          }
        }

        const dataPoints = MONTH_NAMES.map((mName, mIdx) => ({
          x: mName,
          y: monthlyCounts[mIdx],
        }));

        const color =
          YEAR_COLORS[yr] || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];

        return {
          id: `Año ${yr}`,
          color,
          year: yr,
          data: dataPoints,
        };
      });

      return {
        chartSeries: series,
      };
    } else {
      // Si es un año específico, generamos solo 1 línea para ese año
      const yr = selectedYear;
      const monthlyCounts = Array(12).fill(0);
      for (const r of safeReports) {
        if (!r || !r.fecha) continue;
        const rDate = new Date(r.fecha);
        if (!isNaN(rDate.getTime()) && rDate.getFullYear() === yr) {
          const m = rDate.getMonth();
          if (m >= 0 && m < 12) monthlyCounts[m]++;
        }
      }

      const dataPoints = MONTH_NAMES.map((mName, mIdx) => ({
        x: mName,
        y: monthlyCounts[mIdx],
      }));

      const color = YEAR_COLORS[yr] || "#2563eb";

      const series = [
        {
          id: `Año ${yr}`,
          color,
          year: yr,
          data: dataPoints,
        },
      ];

      return {
        chartSeries: series,
      };
    }
  }, [reports, availableYears, selectedYear]);

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-2xs flex flex-col gap-4">
      {/* Encabezado y Selector de Año con Switch */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-zinc-900">
          Tendencia de reclamos
        </h3>

        {/* Filtro de Año */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-600">Año:</span>

          <div className="flex items-center gap-1.5">
            <Switch
              value={selectedYear.toString()}
              onValueChange={(val) =>
                setSelectedYear(val === "TODOS" ? "TODOS" : parseInt(val, 10))
              }
            >
              <Switch.Option value="TODOS">Todos</Switch.Option>
              {visibleYears.map((yr) => (
                <Switch.Option key={yr} value={yr.toString()}>
                  {yr.toString()}
                </Switch.Option>
              ))}
            </Switch>

            {/* Desplegable + para desbordamiento de Años */}
            {overflowYears.length > 0 && (
              <div ref={yearOverflowRef} className="relative">
                <button
                  onClick={() => setIsYearOverflowOpen((prev) => !prev)}
                  className={`h-9 px-2.5 rounded-full border border-gray-200/60 bg-white/50 text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                    typeof selectedYear === "number" &&
                    overflowYears.includes(selectedYear)
                      ? "bg-white text-zinc-950 font-bold shadow-sm"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                  title="Más años"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <ChevronDown className="w-3 h-3 ml-0.5" />
                </button>

                {isYearOverflowOpen && (
                  <div className="absolute right-0 top-full mt-1.5 z-50 w-32 bg-white rounded-xl border border-gray-200 shadow-lg p-1.5 flex flex-col gap-0.5">
                    {overflowYears.map((yr) => (
                      <button
                        key={yr}
                        onClick={() => {
                          setSelectedYear(yr);
                          setIsYearOverflowOpen(false);
                        }}
                        className={`text-left px-3 py-2 text-xs rounded-lg font-medium transition cursor-pointer ${
                          selectedYear === yr
                            ? "bg-zinc-100 font-bold text-zinc-900"
                            : "text-zinc-700 hover:bg-zinc-50"
                        }`}
                      >
                        {yr}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Referencia pequeña de colores con animación de despliegue hacia abajo y repliegue hacia arriba */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          selectedYear === "TODOS"
            ? "max-h-12 opacity-100 translate-y-0 mt-0"
            : "max-h-0 opacity-0 -translate-y-2 pointer-events-none -mt-2"
        }`}
      >
        <div className="flex items-center gap-4 flex-wrap text-xs text-zinc-600 px-1 py-0.5">
          <span className="font-semibold text-zinc-600 text-xs">Año:</span>
          {chartSeries.map((s) => (
            <div key={s.id} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full shadow-2xs"
                style={{ backgroundColor: s.color }}
              />
              <span className="font-medium text-zinc-700">{s.year}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Gráfico Nivo Line */}
      <div className="h-[300px] w-full">
        <ResponsiveLine
          data={chartSeries}
          margin={{ top: 20, right: 25, bottom: 45, left: 60 }}
          xScale={{ type: "point" }}
          yScale={{
            type: "linear",
            min: 0,
            max: "auto",
            stacked: false,
            reverse: false,
          }}
          curve="monotoneX"
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 5,
            tickPadding: 8,
            tickRotation: 0,
            legend: "Mes",
            legendOffset: 36,
            legendPosition: "middle",
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 8,
            tickRotation: 0,
            legend: "Reportes",
            legendOffset: -48,
            legendPosition: "middle",
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          colors={(d: any) => d.color}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          pointSymbol={(props: any) => {
            if (!props) return null;
            const fillColor =
              props.color ||
              props.datum?.color ||
              props.serieColor ||
              "#2563eb";
            return (
              <circle
                cx={0}
                cy={0}
                r={6}
                fill={fillColor}
                stroke="#ffffff"
                strokeWidth={2.5}
              />
            );
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tooltip={({ point }: any) => {
            if (!point || !point.data) return null;
            const fullMonth =
              MONTH_FULL_NAMES[point.data.x] || point.data.x || "";
            const pointColor = point.serieColor || point.color || "#2563eb";
            return (
              <div className="bg-white border border-gray-200 shadow-md rounded-xl p-3 text-xs font-sans flex flex-col gap-1.5 z-50 whitespace-nowrap min-w-[220px]">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: pointColor }}
                  />
                  <span className="font-bold text-zinc-900">
                    {point.serieId}
                  </span>
                </div>
                <div className="flex flex-col text-zinc-600 font-medium text-[11px] gap-1">
                  <div className="flex items-center justify-between gap-4">
                    <span>Mes:</span>
                    <strong className="text-zinc-900 font-bold">
                      {fullMonth}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Cantidad de reclamos:</span>
                    <strong className="text-zinc-900 font-bold">
                      {point.data.y ?? 0}
                    </strong>
                  </div>
                </div>
              </div>
            );
          }}
          pointLabelYOffset={-12}
          useMesh={true}
          enableGridX={false}
          enableGridY={true}
          theme={{
            axis: {
              ticks: {
                text: {
                  fontSize: 11,
                  fill: "#71717a",
                  fontWeight: 500,
                },
              },
              legend: {
                text: {
                  fontSize: 12,
                  fill: "#3f3f46",
                  fontWeight: 600,
                },
              },
            },
            grid: {
              line: {
                stroke: "#e4e4e7",
                strokeWidth: 1,
              },
            },
            crosshair: {
              line: {
                stroke: "#3b82f6",
                strokeWidth: 1,
                strokeDasharray: "4 4",
              },
            },
          }}
        />
      </div>
    </div>
  );
}
