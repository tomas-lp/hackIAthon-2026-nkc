"use client";

import { useState } from "react";
import { Report, ReportFilters, ReportStats } from "@/types/report";
import { StatsSummary } from "./StatsSummary";
import { FilterPanel } from "./FilterPanel";
import { RecentReportsList } from "./RecentReportsList";
import { CloudRain, BarChart2, List, Bot } from "lucide-react";

interface SidebarProps {
  reports: Report[];
  stats: ReportStats;
  filters: ReportFilters;
  loading: boolean;
  error: string | null;
  selectedReport: Report | null;
  onSelectReport: (report: Report | null) => void;
  onUpdateFilter: <K extends keyof ReportFilters>(
    key: K,
    value: ReportFilters[K]
  ) => void;
  onResetFilters: () => void;
}

export function Sidebar({
  reports,
  stats,
  filters,
  loading,
  error,
  selectedReport,
  onSelectReport,
  onUpdateFilter,
  onResetFilters,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<"feed" | "stats">("feed");

  return (
    <aside className="w-full lg:w-[430px] bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex flex-col h-full overflow-hidden font-sans">
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-xs">
              <CloudRain className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                Inu{" "}
                <span className="text-xs font-normal text-zinc-400">
                  | Inundaciones
                </span>
              </h1>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Bot className="w-3 h-3" /> Grok AI + API Clima
          </span>
        </div>
        <p className="text-xs text-zinc-500 leading-normal">
          Monitoreo de inundaciones y lluvias en Corrientes. Procesa mensajes de
          Telegram con Grok AI y valida con la API meteorológica.
        </p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 p-1 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-xs">
        <button
          onClick={() => setActiveTab("feed")}
          className={`py-1.5 font-medium rounded flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === "feed"
              ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
        >
          <List className="w-3.5 h-3.5" /> Reportes & Filtros
        </button>
        <button
          onClick={() => setActiveTab("stats")}
          className={`py-1.5 font-medium rounded flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === "stats"
              ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" /> Métricas & Resumen
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && (
          <div className="p-4 text-center text-xs text-zinc-400 font-mono">
            Cargando reportes de Inu...
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded text-xs">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {activeTab === "feed" && (
              <>
                <FilterPanel
                  filters={filters}
                  onUpdateFilter={onUpdateFilter}
                  onResetFilters={onResetFilters}
                />
                <RecentReportsList
                  reports={reports}
                  selectedReport={selectedReport}
                  onSelectReport={onSelectReport}
                />
              </>
            )}

            {activeTab === "stats" && <StatsSummary stats={stats} />}
          </>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-[10px] text-zinc-400 flex items-center justify-between font-mono">
        <span>Inu - Provincia de Corrientes</span>
        <span>Mock Bot Telegram</span>
      </div>
    </aside>
  );
}
