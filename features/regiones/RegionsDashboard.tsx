"use client";

import { useState } from "react";
import { Report } from "@/types/report";
import { RegionPersonalizada } from "@/types/region";
import { User } from "@supabase/supabase-js";
import { RegionsSidebar } from "./RegionsSidebar";
import { RegionsMap } from "./RegionsMap";
import { RegionNamePopup } from "./RegionNamePopup";
import { regionService } from "@/services/regionService";
import { AuthWidget } from "../dashboard/AuthWidget";

interface RegionsDashboardProps {
  initialReports: Report[];
  initialRegiones: RegionPersonalizada[];
  user: User | null;
}

export function RegionsDashboard({
  initialReports,
  initialRegiones,
  user,
}: RegionsDashboardProps) {
  const [reports] = useState<Report[]>(initialReports);
  const [regiones, setRegiones] = useState<RegionPersonalizada[]>(initialRegiones);
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [draftPoints, setDraftPoints] = useState<[number, number][]>([]);
  const [showNamePopup, setShowNamePopup] = useState(false);
  
  const handleCreateRegion = () => {
    setIsDrawing(true);
    setDraftPoints([]);
    setShowNamePopup(false);
    setSidebarCollapsed(true);
  };

  const handleAddDraftPoint = (pt: [number, number]) => {
    setDraftPoints(prev => [...prev, pt]);
  };

  const handleFinishDrawing = () => {
    if (draftPoints.length > 2) {
      setIsDrawing(false);
      setShowNamePopup(true);
    } else {
      // Error si no tiene al menos 3 puntos
      alert("Una región debe tener al menos 3 puntos.");
    }
  };

  const handleCancelDrawing = () => {
    setIsDrawing(false);
    setDraftPoints([]);
    setShowNamePopup(false);
    setSidebarCollapsed(false);
  };

  const handleConfirmName = async (name: string) => {
    try {
      await regionService.createRegion(name, draftPoints);
      const updatedRegiones = await regionService.getRegions();
      setRegiones(updatedRegiones);
    } catch (e) {
      console.error(e);
      alert("Error guardando la región");
    } finally {
      setIsDrawing(false);
      setDraftPoints([]);
      setShowNamePopup(false);
      setSidebarCollapsed(false);
    }
  };

  const handleDeleteRegion = async (id: string) => {
    if (!confirm("¿Eliminar esta región?")) return;
    try {
      await regionService.deleteRegion(id);
      const updatedRegiones = await regionService.getRegions();
      setRegiones(updatedRegiones);
    } catch (e) {
      console.error(e);
      alert("Error eliminando la región");
    }
  };

  return (
    <>
      <div
        className="absolute left-0 top-0 z-[100] transition-transform duration-300 ease-in-out"
        style={{
          transform: sidebarCollapsed || isDrawing ? "translateX(-110%)" : "translateX(0)",
        }}
      >
        <RegionsSidebar
          regiones={regiones}
          onDeleteRegion={handleDeleteRegion}
          onCreateRegion={handleCreateRegion}
          onCollapse={() => setSidebarCollapsed(true)}
          isCreating={isDrawing}
        />
      </div>

      <section className="absolute inset-0 h-full w-full">
        <RegionsMap
          reports={reports}
          regiones={regiones}
          isDrawing={isDrawing}
          draftPoints={draftPoints}
          onAddDraftPoint={handleAddDraftPoint}
          onFinishDrawing={handleFinishDrawing}
          onCancelDrawing={handleCancelDrawing}
        />
      </section>

      {showNamePopup && (
        <RegionNamePopup
          onConfirm={handleConfirmName}
          onCancel={handleCancelDrawing}
        />
      )}

      {isDrawing && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] flex gap-3">
          <button
            onClick={handleCancelDrawing}
            className="flex items-center justify-center gap-2 rounded-full border border-red-200 bg-white px-6 py-3 text-sm font-bold text-red-600 shadow-xl transition-all duration-200 hover:bg-red-50 hover:scale-105 active:scale-95 cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      )}

      <AuthWidget
        isAdmin={!!user}
        onLoginClick={() => {}}
        onLogoutClick={async () => {
          const { logoutFromSession } = await import("@/app/auth/actions");
          await logoutFromSession();
          window.location.href = "/";
        }}
        isHidden={isDrawing}
      />
    </>
  );
}
