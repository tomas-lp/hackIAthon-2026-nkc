"use client";

import { useEffect, useMemo, useState } from "react";
import { Report, ReportFilters, ReportType } from "@/types/report";
import { SafeZone } from "@/types/safeZone";
import { formatDate, TYPE_CONFIG } from "@/lib/utils";
import { resolveAddress } from "@/lib/geocode";
import { ShieldCheck, Plus, Edit } from "lucide-react";

interface SidebarProps {
  reports: Report[];
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
  isAdmin?: boolean;
  safeZones?: SafeZone[];
  onCreateSafeZone?: () => void;
  selectedSafeZone?: SafeZone | null;
  onSelectSafeZone?: (zone: SafeZone) => void;
}

function SafeZoneCard({
  safeZone,
  isSelected,
  onSelect,
}: {
  safeZone: SafeZone;
  isSelected: boolean;
  onSelect: (safeZone: SafeZone) => void;
}) {
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    resolveAddress(safeZone.latitud, safeZone.longitud)
      .then((resolved) => {
        if (!isCancelled) setAddress(resolved);
      })
      .catch(() => {
        if (!isCancelled) setAddress("Ubicación no disponible");
      });

    return () => {
      isCancelled = true;
    };
  }, [safeZone.latitud, safeZone.longitud]);

  return (
    <button
      onClick={() => onSelect(safeZone)}
      className={`shrink-0 w-full rounded-2xl border border-gray-200 text-left transition overflow-hidden ${
        isSelected
          ? "border-gray-200 bg-gray-200"
          : "border-gray-200 bg-white/80 hover:border-zinc-300 hover:bg-zinc-100"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col p-3">
          <span className="text-sm font-medium text-black">
            {safeZone.nombre}
          </span>
          <span
            className="text-xs font-medium text-black/50"
            suppressHydrationWarning
          >
            {formatDate(safeZone.created_at)}
          </span>
          <span
            className="text-xs font-medium text-black/80"
            title={address ?? safeZone.descripcion}
          >
            {address ?? "Direccion no disponible"}
          </span>
        </div>
      </div>
    </button>
  );
}

function ReportCard({
  report,
  isSelected,
  onSelect,
  isAdmin,
}: {
  report: Report;
  isSelected: boolean;
  onSelect: (report: Report) => void;
  isAdmin?: boolean;
}) {
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    resolveAddress(report.latitud, report.longitud)
      .then((resolved) => {
        if (!isCancelled) setAddress(resolved);
      })
      .catch(() => {
        if (!isCancelled) setAddress("Ubicación no disponible");
      });

    return () => {
      isCancelled = true;
    };
  }, [report.latitud, report.longitud]);

  const typeLabel = TYPE_CONFIG[report.tipo].label;

  return (
    <button
      onClick={() => onSelect(report)}
      className={`shrink-0 w-full rounded-2xl border border-gray-200 text-left transition overflow-hidden ${
        isSelected
          ? "border-gray-200 bg-gray-200"
          : "border-gray-200 bg-white/80 hover:border-zinc-300 hover:bg-zinc-100"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col p-3">
          <span className="text-sm font-medium text-black">{typeLabel}</span>
          <span
            className="text-xs font-medium text-black/50"
            suppressHydrationWarning
          >
            {formatDate(report.fecha)}
          </span>
          <span
            className="text-xs font-medium text-black/80"
            title={address ?? report.localidad ?? report.descripcion}
          >
            {address ?? report.localidad ?? "Direccion no disponible"}
          </span>
        </div>
        {isAdmin && (
          <div className="flex flex-col items-end p-3 gap-1">
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600 w-fit text-nowrap">
              {report.puntajeBase} pts
            </span>
          </div>
        )}
      </div>
    </button>
  );
}

export function Sidebar({
  reports,
  filters,
  loading,
  error,
  selectedReport,
  onSelectReport,
  onUpdateFilter,
  isAdmin,
  safeZones = [],
  onCreateSafeZone,
  selectedSafeZone,
  onSelectSafeZone,
}: SidebarProps) {
  const visibleReports = useMemo(() => {
    const sortedReports = [...reports].sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );

    return sortedReports.filter((report) => {
      if (
        filters.tipo &&
        filters.tipo !== "TODOS" &&
        report.tipo !== filters.tipo
      )
        return false;
      return true;
    });
  }, [filters.tipo, reports]);

  return (
    <aside
      className={`absolute flex flex-col gap-4 left-4 top-4 z-100 w-md max-w-md rounded-2xl border border-gray-200 bg-white/50 p-3 backdrop-blur-xs overflow-hidden ${
        isAdmin ? "max-h-[85vh]" : "max-h-[60vh]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-2 bg-inu py-2 px-4 rounded-2xl">
          <div className="font-black text-4xl leading-8 logo flex justify-center items-center text-white rounded-2xl">
            INU
          </div>
          <span className="text-md text-white/90 leading-4">
            Sistema de Alerta
            <br />
            para Inundaciones
          </span>
        </div>
      </div>
      <div className="flex flex-col flex-1 w-full gap-4 overflow-hidden">
        {isAdmin && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-md font-medium text-black text-nowrap flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Zonas seguras
              </span>
              <button
                onClick={onCreateSafeZone}
                className="flex items-center justify-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
              >
                <Plus className="h-3.5 w-3.5" />
                Crear
              </button>
            </div>

            {safeZones.length > 0 && (
              <div className="flex flex-col rounded-2xl border border-gray-200 bg-white p-2 overflow-hidden max-h-[30vh]">
                <div className="gap-2 flex flex-col overflow-auto">
                  {safeZones.map((sz) => (
                    <SafeZoneCard
                      key={sz.id}
                      safeZone={sz}
                      isSelected={selectedSafeZone?.id === sz.id}
                      onSelect={onSelectSafeZone || (() => {})}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col flex-1 min-h-0 gap-2">
          <div className="w-full flex items-center justify-between">
            <span className="text-md font-medium text-black text-nowrap">
              Últimas alertas
            </span>
          </div>

          <div className="flex flex-col gap-2 p-3 rounded-2xl border border-gray-200 bg-white">
            <span className="text-sm font-medium text-black">Filtrar por</span>
            <div className="flex gap-2">
              <select
                value={filters.tipo || ""}
                onChange={(event) =>
                  onUpdateFilter(
                    "tipo",
                    event.target.value as ReportType | "TODOS"
                  )
                }
                className="w-full rounded-2xl border border-gray-200 bg-white py-1 px-2 text-sm text-zinc-800 outline-none transition focus:border-blue-500"
              >
                <option value="" disabled hidden>
                  Tipo
                </option>
                <option value="TODOS">Todos</option>
                {(Object.keys(TYPE_CONFIG) as ReportType[]).map((type) => (
                  <option key={type} value={type}>
                    {TYPE_CONFIG[type].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col rounded-2xl border border-gray-200 bg-white p-2 overflow-hidden">
            {loading && (
              <div className="rounded-2xl border border-dashed border-zinc-300 px-3 py-4 text-center text-xs text-zinc-500  ">
                Cargando alertas...
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-xs text-red-600   ">
                {error}
              </div>
            )}

            {!loading && !error && visibleReports.length === 0 && (
              <div className="rounded-2xl border border-dashed border-zinc-300 px-3 py-4 text-center text-xs text-zinc-500  ">
                No hay puntos para este tipo.
              </div>
            )}

            {!loading && !error && visibleReports.length > 0 && (
              <div className="gap-2 flex flex-col overflow-auto">
                {visibleReports.map((report) => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    isSelected={selectedReport?.id === report.id}
                    onSelect={onSelectReport}
                    isAdmin={isAdmin}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
