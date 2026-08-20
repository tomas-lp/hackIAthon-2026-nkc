"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Report, ReportFilters, ReportType } from "@/types/report";
import { SafeZone } from "@/types/safeZone";
import { HealthCenter } from "@/types/healthCenter";
import { formatDate, TYPE_CONFIG } from "@/lib/utils";
import { resolveAddress } from "@/lib/geocode";
import {
  ChevronLeft,
  ChevronDown,
  Check,
  Filter,
  Navigation,
  Loader2,
} from "lucide-react";

function FilterDropdown({
  value,
  onChange,
}: {
  value: ReportType | "TODOS" | "";
  onChange: (val: ReportType | "TODOS") => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const options: { value: ReportType | "TODOS"; label: string }[] = [
    { value: "TODOS", label: "Todos" },
    ...(Object.keys(TYPE_CONFIG) as ReportType[]).map((type) => ({
      value: type,
      label: TYPE_CONFIG[type].label,
    })),
  ];

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center justify-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 cursor-pointer"
      >
        <Filter className="h-4 w-4" />
        Filtrar
        <ChevronDown
          className={`h-3 w-3 ml-1 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        className={`absolute right-0 top-full mt-2 z-50 w-48 flex flex-col rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden transition-all duration-200 ease-out origin-top ${
          isOpen
            ? "max-h-[300px] opacity-100 pointer-events-auto p-1.5"
            : "max-h-0 opacity-0 pointer-events-none !p-0 !border-transparent"
        }`}
      >
        {options.map((opt) => {
          const isSelected = opt.value === (value || "TODOS");
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm text-left transition-colors cursor-pointer ${
                isSelected
                  ? "bg-gray-100 font-semibold text-zinc-900"
                  : "text-zinc-700 hover:bg-gray-50 hover:text-zinc-900"
              }`}
            >
              <span>{opt.label}</span>
              {isSelected && <Check className="h-4 w-4 text-zinc-700" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

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
  healthCenters?: HealthCenter[];
  selectedHealthCenter?: HealthCenter | null;
  onSelectHealthCenter?: (center: HealthCenter) => void;
  onCollapse?: () => void;
  /** Usuario: navegar a la zona segura con menor costo de ruta */
  onNavigateToNearest?: () => void;
  /** true mientras se está calculando la ruta al centro más cercano */
  isNavigatingNearest?: boolean;
  onNavigateToNearestHealthCenter?: () => void;
  isNavigatingNearestHealthCenter?: boolean;
}

function HealthCenterCard({
  healthCenter,
  isSelected,
  onSelect,
}: {
  healthCenter: HealthCenter;
  isSelected: boolean;
  onSelect: (hc: HealthCenter) => void;
}) {
  const address = healthCenter.direccion
    ? healthCenter.localidad
      ? `${healthCenter.direccion}, ${healthCenter.localidad}`
      : healthCenter.direccion
    : healthCenter.localidad || "Corrientes";

  return (
    <div
      className={`shrink-0 w-full rounded-2xl border border-gray-200 text-left transition overflow-hidden ${
        isSelected
          ? "border-gray-200 bg-gray-200"
          : "border-gray-200 bg-white/80"
      }`}
    >
      <button
        onClick={() => onSelect(healthCenter)}
        className="w-full text-left hover:bg-zinc-50 transition rounded-2xl p-3 cursor-pointer"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-black">
              {healthCenter.nombre}
            </span>
            <span className="text-xs font-medium text-black/50">
              {healthCenter.tipo}
            </span>
            <span className="text-xs font-medium text-black/80">{address}</span>
          </div>
        </div>
      </button>
    </div>
  );
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
    <div
      className={`shrink-0 w-full rounded-2xl border border-gray-200 text-left transition overflow-hidden ${
        isSelected
          ? "border-gray-200 bg-gray-200"
          : "border-gray-200 bg-white/80"
      }`}
    >
      <button
        onClick={() => onSelect(safeZone)}
        className="w-full text-left hover:bg-zinc-50 transition rounded-2xl"
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
              {address ?? "Dirección no disponible"}
            </span>
          </div>
        </div>
      </button>
    </div>
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
  selectedSafeZone,
  onSelectSafeZone,
  healthCenters = [],
  selectedHealthCenter,
  onSelectHealthCenter,
  onCollapse,
  onNavigateToNearest,
  isNavigatingNearest = false,
  onNavigateToNearestHealthCenter,
  isNavigatingNearestHealthCenter = false,
}: SidebarProps) {
  const [activeAdminTab, setActiveAdminTab] = useState<string>("Mapa");
  const [categoryMode, setCategoryMode] = useState<"EVACUACION" | "SALUD">(
    "EVACUACION"
  );
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const categoryMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        categoryMenuRef.current &&
        !categoryMenuRef.current.contains(event.target as Node)
      ) {
        setIsCategoryMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const adminMenuOptions = [
    "Mapa",
    "Marcadores",
    "Regiones",
    "Panel de Administración",
  ];

  return (
    <aside className="flex flex-col gap-3 m-4 z-100 w-72 max-w-72 rounded-2xl border border-gray-200 bg-white/60 p-2.5 backdrop-blur-xs max-h-[85vh]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2 bg-inu py-1.5 px-3 rounded-xl items-center">
          <div className="font-black text-3xl leading-7 logo flex justify-center items-center text-white rounded-xl">
            INU
          </div>
          <span className="text-xs text-white/90 leading-3.5 font-medium">
            Sistema de Alerta
            <br />
            para Inundaciones
          </span>
        </div>
        {onCollapse && (
          <button
            id="sidebar-collapse-btn"
            onClick={onCollapse}
            title="Ocultar panel"
            className="rounded-lg border border-gray-200 bg-white p-1 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600 cursor-pointer shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {isAdmin ? (
        /* Admin Navigation View */
        <div className="flex flex-col gap-1.5 py-0.5">
          {adminMenuOptions.map((option) => {
            const isSelected = activeAdminTab === option;
            return (
              <button
                key={option}
                onClick={() => setActiveAdminTab(option)}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-left font-medium text-xs transition-all duration-200 cursor-pointer shadow-2xs ${
                  isSelected
                    ? "border-zinc-400 bg-white text-zinc-950 font-bold shadow-xs scale-[1.01]"
                    : "border-gray-200/80 bg-white/90 text-zinc-700 hover:bg-gray-50 hover:border-gray-300"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      ) : (
        /* User Normal View */
        <div className="flex flex-col flex-1 w-full gap-4 min-h-0">
          {/* Sección Selector: Centros de evacuación / Centros de salud */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div ref={categoryMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsCategoryMenuOpen((prev) => !prev)}
                  className="flex items-center justify-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 cursor-pointer"
                >
                  <span>
                    {categoryMode === "EVACUACION"
                      ? "Centros de evacuación"
                      : "Centros de salud"}
                  </span>
                  <ChevronDown
                    className={`h-3 w-3 ml-1 transition-transform duration-200 ${
                      isCategoryMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <div
                  className={`absolute left-0 top-full mt-2 z-50 w-56 flex flex-col rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden transition-all duration-200 ease-out origin-top ${
                    isCategoryMenuOpen
                      ? "max-h-[300px] opacity-100 pointer-events-auto p-1.5"
                      : "max-h-0 opacity-0 pointer-events-none !p-0 !border-transparent"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryMode("EVACUACION");
                      setIsCategoryMenuOpen(false);
                    }}
                    className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm text-left transition-colors cursor-pointer ${
                      categoryMode === "EVACUACION"
                        ? "bg-gray-100 font-semibold text-zinc-900"
                        : "text-zinc-700 hover:bg-gray-50 hover:text-zinc-900"
                    }`}
                  >
                    <span>Centros de evacuación</span>
                    {categoryMode === "EVACUACION" && (
                      <Check className="h-4 w-4 text-zinc-700" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCategoryMode("SALUD");
                      setIsCategoryMenuOpen(false);
                    }}
                    className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm text-left transition-colors cursor-pointer ${
                      categoryMode === "SALUD"
                        ? "bg-gray-100 font-semibold text-zinc-900"
                        : "text-zinc-700 hover:bg-gray-50 hover:text-zinc-900"
                    }`}
                  >
                    <span>Centros de salud</span>
                    {categoryMode === "SALUD" && (
                      <Check className="h-4 w-4 text-zinc-700" />
                    )}
                  </button>
                </div>
              </div>

              {categoryMode === "EVACUACION" ? (
                <button
                  onClick={onNavigateToNearest}
                  disabled={isNavigatingNearest}
                  className="flex items-center justify-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isNavigatingNearest ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Navigation className="h-4 w-4" />
                  )}
                  {isNavigatingNearest ? "Calculando…" : "Ir al más cercano"}
                </button>
              ) : (
                <button
                  onClick={onNavigateToNearestHealthCenter}
                  disabled={isNavigatingNearestHealthCenter}
                  className="flex items-center justify-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isNavigatingNearestHealthCenter ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Navigation className="h-4 w-4" />
                  )}
                  {isNavigatingNearestHealthCenter
                    ? "Calculando…"
                    : "Ir al más cercano"}
                </button>
              )}
            </div>

            <div className="flex flex-col rounded-2xl border border-gray-200 bg-white p-2 overflow-hidden max-h-[30vh]">
              <div className="gap-2 flex flex-col overflow-auto pr-2">
                {categoryMode === "EVACUACION" ? (
                  safeZones.length > 0 ? (
                    safeZones.map((sz) => (
                      <SafeZoneCard
                        key={sz.id}
                        safeZone={sz}
                        isSelected={selectedSafeZone?.id === sz.id}
                        onSelect={onSelectSafeZone || (() => {})}
                      />
                    ))
                  ) : (
                    <div className="px-3 py-6 text-center text-xs text-zinc-500">
                      No hay centros de evacuación cargados.
                    </div>
                  )
                ) : healthCenters.length > 0 ? (
                  healthCenters.map((hc) => (
                    <HealthCenterCard
                      key={hc.id}
                      healthCenter={hc}
                      isSelected={selectedHealthCenter?.id === hc.id}
                      onSelect={onSelectHealthCenter || (() => {})}
                    />
                  ))
                ) : (
                  <div className="px-3 py-6 text-center text-xs text-zinc-500">
                    No hay centros de salud disponibles.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col flex-1 min-h-0 gap-2">
            <div className="w-full flex items-center justify-between relative z-20">
              <span className="text-md font-medium text-black text-nowrap">
                Últimas alertas
              </span>
              <FilterDropdown
                value={filters.tipo || ""}
                onChange={(val) => onUpdateFilter("tipo", val)}
              />
            </div>

            <div className="flex flex-col rounded-2xl border border-gray-200 bg-white p-2 overflow-hidden">
              {loading && (
                <div className="rounded-2xl border border-dashed border-zinc-300 px-3 py-20 text-center text-xs text-zinc-500  ">
                  Cargando alertas...
                </div>
              )}

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-xs text-red-600   ">
                  {error}
                </div>
              )}

              {!loading && !error && visibleReports.length === 0 && (
                <div className="rounded-2xl border border-dashed border-zinc-300 px-3 py-20 text-center text-xs text-zinc-500  ">
                  No hay alertas de este tipo.
                </div>
              )}

              {!loading && !error && visibleReports.length > 0 && (
                <div className="gap-2 flex flex-col overflow-auto pr-2">
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
      )}
    </aside>
  );
}
