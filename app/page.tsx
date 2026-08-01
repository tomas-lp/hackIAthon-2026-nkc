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
    stats,
    selectedReport,
    setSelectedReport,
    updateFilter,
    resetFilters,
  } = useReports();

  return (
    <main className="flex flex-col lg:flex-row h-screen w-screen overflow-hidden bg-zinc-100 dark:bg-zinc-950">
      {/* Sidebar Dashboard */}
      <Sidebar
        reports={reports}
        stats={stats}
        filters={filters}
        loading={loading}
        error={error}
        selectedReport={selectedReport}
        onSelectReport={setSelectedReport}
        onUpdateFilter={updateFilter}
        onResetFilters={resetFilters}
      />

      {/* Hero Map View */}
      <section className="flex-1 h-[60vh] lg:h-full relative overflow-hidden">
        <ReportMap
          reports={reports}
          selectedReport={selectedReport}
          onSelectReport={setSelectedReport}
        />
      </section>
    </main>
  );
}
