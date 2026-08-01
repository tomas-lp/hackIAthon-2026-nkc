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
    </main>
  );
}
