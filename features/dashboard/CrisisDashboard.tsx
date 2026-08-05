"use client";

import { useReports } from "@/hooks/useReports";
import { Sidebar } from "@/features/dashboard/Sidebar";
import { ReportMap } from "@/features/mapa/ReportMap";
import { Report } from "@/types/report";

interface CrisisDashboardProps {
  initialReports: Report[];
}

export function CrisisDashboard({ initialReports }: CrisisDashboardProps) {
  const {
    reports,
    loading,
    error,
    filters,
    selectedReport,
    setSelectedReport,
    updateFilter,
    resetFilters,
  } = useReports(initialReports);

  return (
    <>
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
    </>
  );
}
