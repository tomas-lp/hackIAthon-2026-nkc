"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { ResponsiveLine } from "@nivo/line";
import { Report } from "@/types/report";
import { TYPE_CONFIG } from "@/lib/constants";
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

export function TendenciaChart({ reports }: TendenciaChartProps) {
  // Años disponibles en los reportes
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    for (const r of reports) {
      if (r.fecha) {
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

  // Procesar datos para Nivo Line
  const chartData = useMemo(() => {
    // Filtrar por año
    const filtered = reports.filter((r) => {
      if (selectedYear === "TODOS") return true;
      const yr = new Date(r.fecha).getFullYear();
      return yr === selectedYear;
    });

    // Agrupar por mes para la línea general
    const monthlyCounts = Array(12).fill(0);
    for (const r of filtered) {
      const month = new Date(r.fecha).getMonth();
      if (month >= 0 && month < 12) {
        monthlyCounts[month]++;
      }
    }

    const dataPoints = MONTH_NAMES.map((monthName, idx) => ({
      x: monthName,
      y: monthlyCounts[idx],
    }));

    return [
      {
        id: "Reportes",
        color: "#3b82f6",
        data: dataPoints,
      },
    ];
  }, [reports, selectedYear]);

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-2xs flex flex-col gap-4">
      {/* Encabezado y Selector de Año */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-zinc-900">
          Tendencia de reclamos
        </h3>

        {/* Filtro de Año */}
        <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-xl">
          <span className="text-xs font-semibold text-zinc-500 uppercase px-2">
            Año:
          </span>

          <button
            onClick={() => setSelectedYear("TODOS")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              selectedYear === "TODOS"
                ? "bg-white text-zinc-900 shadow-2xs"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Todos
          </button>

          {visibleYears.map((yr) => (
            <button
              key={yr}
              onClick={() => setSelectedYear(yr)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                selectedYear === yr
                  ? "bg-white text-zinc-900 shadow-2xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              {yr}
            </button>
          ))}

          {/* Botón + desbordamiento de Años */}
          {overflowYears.length > 0 && (
            <div ref={yearOverflowRef} className="relative">
              <button
                onClick={() => setIsYearOverflowOpen((prev) => !prev)}
                className={`p-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                  typeof selectedYear === "number" &&
                  overflowYears.includes(selectedYear)
                    ? "bg-white text-zinc-900 shadow-2xs"
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

      {/* Gráfico Nivo */}
      <div className="h-[300px] w-full">
        <ResponsiveLine
          data={chartData}
          margin={{ top: 20, right: 25, bottom: 45, left: 45 }}
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
            legendOffset: -38,
            legendPosition: "middle",
          }}
          colors={["#2563eb"]}
          pointSize={8}
          pointColor="#ffffff"
          pointBorderWidth={2}
          pointBorderColor={{ from: "serieColor" }}
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
