"use client";

import { useState } from "react";
import { useReports } from "@/hooks/useReports";
import { Sidebar } from "@/features/dashboard/Sidebar";
import { ReportMap } from "@/features/mapa/ReportMap";
import { ReportDetailSidebar } from "@/features/mapa/ReportDetailSidebar";
import { AuthWidget, LoginModal } from "@/features/dashboard/AuthWidget";
import { Report } from "@/types/report";

interface CrisisDashboardProps {
  initialReports: Report[];
}

export function CrisisDashboard({ initialReports }: CrisisDashboardProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

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
        isAdmin={isAdmin}
      />

      <section className="absolute inset-0 h-full w-full">
        <ReportMap
          reports={reports}
          selectedReport={selectedReport}
          onSelectReport={setSelectedReport}
        />
      </section>

      <AuthWidget
        isAdmin={isAdmin}
        onLoginClick={() => setShowLoginModal(true)}
        onLogoutClick={() => setIsAdmin(false)}
      />

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={() => {
          setIsAdmin(true);
          setShowLoginModal(false);
        }}
      />

      {selectedReport && (
        <ReportDetailSidebar
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          isAdmin={isAdmin}
        />
      )}
    </>
  );
}
