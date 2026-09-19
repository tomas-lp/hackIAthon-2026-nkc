"use client";

import { useState, useCallback } from "react";
import { Report } from "@/types/report";
import { User } from "@supabase/supabase-js";
import { AuthWidget, LoginModal } from "@/components/common/AuthWidget";
import { ReportesTableUI } from "./ReportesTableUI";

interface ReportesDashboardProps {
  initialReports: Report[];
  user: User | null;
}

export function ReportesDashboard({
  initialReports,
  user,
}: ReportesDashboardProps) {
  const [reports, setReports] = useState<Report[]>(initialReports);

  // Estado asignado por reporte — se guarda localmente en esta iteración
  const [estadosMap, setEstadosMap] = useState<Map<string, string>>(new Map());

  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleAssignEstado = useCallback((reportId: string, estado: string) => {
    setEstadosMap((prev) => {
      const next = new Map(prev);
      next.set(reportId, estado);
      return next;
    });
  }, []);

  // Eliminar reportes localmente (sin backend en esta iteración)
  const handleDeleteReports = useCallback(async (ids: string[]) => {
    setReports((prev) => prev.filter((r) => !ids.includes(r.id)));
    setEstadosMap((prev) => {
      const next = new Map(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
  }, []);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-zinc-100 dark:bg-[#0b101d] font-sans">
      <div className="flex-1 flex flex-col h-full overflow-y-auto pt-8 pb-6 px-6">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-2 font-sans flex flex-col gap-5">
          {/* Encabezado Superior */}
          <div className="flex items-center justify-between gap-4 mb-1">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">
                Reportes
              </h1>
              <p className="text-xs text-zinc-500 dark:text-slate-400 mt-0.5">
                {reports.length} reporte{reports.length !== 1 ? "s" : ""} en
                total
              </p>
            </div>

            <AuthWidget
              isAdmin={!!user}
              onLoginClick={() => setShowLoginModal(true)}
              onLogoutClick={async () => {
                const { logoutFromSession } =
                  await import("@/app/auth/actions");
                await logoutFromSession();
                window.location.href = "/";
              }}
            />
          </div>

          {/* Tabla de Reportes */}
          <ReportesTableUI
            reports={reports}
            estadosMap={estadosMap}
            onDeleteReports={handleDeleteReports}
            onAssignEstado={handleAssignEstado}
          />
        </div>
      </div>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={() => setShowLoginModal(false)}
      />
    </div>
  );
}
