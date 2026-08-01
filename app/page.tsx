"use client";

import { useReports } from "@/hooks/useReports";
import { Sidebar } from "@/features/dashboard/Sidebar";
import { ReportMap } from "@/features/mapa/ReportMap";

export default function CrisisGraphPage() {
  const {
    reports,
    loading,
    error,
    filters,
    selectedReport,
    setSelectedReport,
    updateFilter,
    resetFilters,
  } = useReports();

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-zinc-100 ">
      <Sidebar
        reports={reports}
        filters={filters}
        loading={loading}
        error={error}
        selectedReport={selectedReport}
        onSelectReport={setSelectedReport}
        onUpdateFilter={updateFilter}
        onResetFilters={resetFilters}
      />

      <section className="absolute inset-0 h-full w-full">
        <ReportMap
          reports={reports}
          selectedReport={selectedReport}
          onSelectReport={setSelectedReport}
        />
      </section>

      <div className="pointer-events-none absolute bottom-4 right-4 z-50 rounded-2xl border border-white/80 bg-white/90 p-2 shadow-lg shadow-black/10 sm:bottom-6 sm:right-6">
        <div className="flex flex-col items-center gap-1">
          <img
            src="/qrbot.png"
            alt="QR para el bot de Telegram"
            className="h-24 w-24 rounded-2xl object-cover"
          />
          <span className="text-xs font-semibold text-zinc-700">
            Bot de Telegram
          </span>
        </div>
      </div>
    </main>
  );
}
