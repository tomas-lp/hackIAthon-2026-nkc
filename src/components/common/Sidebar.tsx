"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Report, ReportFilters, ReportType } from "@/types/report";
import { SafeZone, SafeZoneType } from "@/types/safeZone";
import { HealthCenter } from "@/types/healthCenter";
import {
  SAFE_ZONE_TYPE_LABELS,
  HEALTH_CENTER_TYPE_LABELS,
} from "@/types/marker";
import { formatDate, formatReportAddress } from "@/lib/format";
import { TYPE_CONFIG } from "@/lib/constants";
import { resolveAddress } from "@/lib/geocode";
import { TooltipSign } from "@/components/ui/TooltipSign";
import { SidebarAdmin } from "@/components/common/SidebarAdmin";
import {
  ChevronLeft,
  ChevronDown,
  Check,
  Filter,
  Search,
  X,
  MapPin,
  Info,
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
  fullHeight?: boolean;
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
  const storedAddress = formatReportAddress(report);
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    if (storedAddress) return; // ya tenemos datos de la BD

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
  }, [report.latitud, report.longitud, storedAddress]);

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
            title={storedAddress ?? address ?? report.descripcion}
          >
            {storedAddress ?? address ?? "Dirección no disponible"}
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
  onSelectSafeZone,
  healthCenters = [],
  onSelectHealthCenter,
  onCollapse,
  fullHeight = false,
}: SidebarProps) {
  // Buscador de marcadores (Evacuación y Salud)
  const [markerSearchQuery, setMarkerSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchableMarkers = useMemo(() => {
    const res: Array<{
      id: string;
      nombre: string;
      tipo: string;
      category: "EVACUACION" | "SALUD";
      ubicacion: string;
      lat: number;
      lon: number;
      rawSafeZone?: SafeZone;
      rawHealthCenter?: HealthCenter;
    }> = [];

    for (const sz of safeZones) {
      res.push({
        id: `sz-${sz.id}`,
        nombre: sz.nombre,
        tipo:
          (sz.tipo && (sz.tipo as SafeZoneType) in SAFE_ZONE_TYPE_LABELS
            ? SAFE_ZONE_TYPE_LABELS[sz.tipo as SafeZoneType]
            : null) || "Centro de Evacuación",
        category: "EVACUACION",
        ubicacion: sz.direccion || sz.localidad || "Corrientes Capital",
        lat: sz.latitud,
        lon: sz.longitud,
        rawSafeZone: sz,
      });
    }

    for (const hc of healthCenters) {
      if (hc.lat !== null && hc.lon !== null) {
        res.push({
          id: `hc-${hc.id}`,
          nombre: hc.nombre,
          tipo: HEALTH_CENTER_TYPE_LABELS[hc.tipo] || hc.tipo,
          category: "SALUD",
          ubicacion: hc.direccion || hc.localidad || "Corrientes Capital",
          lat: hc.lat,
          lon: hc.lon,
          rawHealthCenter: hc,
        });
      }
    }

    return res;
  }, [safeZones, healthCenters]);

  const searchResults = useMemo(() => {
    const q = markerSearchQuery.trim().toLowerCase();
    if (!q) return [];
    return searchableMarkers
      .filter(
        (m) =>
          m.nombre.toLowerCase().includes(q) ||
          m.tipo.toLowerCase().includes(q) ||
          m.ubicacion.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [markerSearchQuery, searchableMarkers]);

  const handleSelectSearchResult = (item: (typeof searchableMarkers)[0]) => {
    if (
      item.category === "EVACUACION" &&
      item.rawSafeZone &&
      onSelectSafeZone
    ) {
      onSelectSafeZone(item.rawSafeZone);
    } else if (
      item.category === "SALUD" &&
      item.rawHealthCenter &&
      onSelectHealthCenter
    ) {
      onSelectHealthCenter(item.rawHealthCenter);
    }
    setMarkerSearchQuery("");
    setIsSearchFocused(false);
  };

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

  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      if (
        !fullHeight &&
        sessionStorage.getItem("sidebar_was_expanded") === "true"
      ) {
        return true;
      }
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (fullHeight) {
      sessionStorage.setItem("sidebar_was_expanded", "true");
      const timer = requestAnimationFrame(() => {
        setIsExpanded(true);
      });
      return () => cancelAnimationFrame(timer);
    } else {
      if (sessionStorage.getItem("sidebar_was_expanded") === "true") {
        sessionStorage.removeItem("sidebar_was_expanded");
      }
      const timer = requestAnimationFrame(() => {
        setIsExpanded(false);
      });
      return () => cancelAnimationFrame(timer);
    }
  }, [fullHeight]);

  return (
    <aside
      className={`flex flex-col gap-3 z-100 transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
        isExpanded
          ? "w-[304px] max-w-[304px] h-screen rounded-none m-0 pt-[30px] pl-[30px] pr-[14px] pb-[30px] bg-white border-r border-gray-200/80 shadow-md"
          : "w-80 max-w-80 sm:w-[370px] sm:max-w-[370px] m-4 rounded-3xl border border-gray-200/80 bg-white/95 p-4 backdrop-blur-md max-h-[88vh] shadow-xl"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2 bg-inu py-1.5 px-3 rounded-xl items-center shadow-xs">
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
          <TooltipSign label="Ocultar panel" position="right" delayMs={500}>
            <button
              id="sidebar-collapse-btn"
              onClick={onCollapse}
              className="rounded-xl border border-gray-200 bg-white p-1.5 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600 cursor-pointer shrink-0 shadow-2xs"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </TooltipSign>
        )}
      </div>

      {isAdmin ? (
        /* Admin Navigation View */
        <SidebarAdmin />
      ) : (
        /* User Normal View */
        <div className="flex flex-col flex-1 w-full gap-3.5 min-h-0">
          {/* Buscador de Marcadores y Centros */}
          <div ref={searchContainerRef} className="relative w-full">
            <div className="relative flex items-center w-full">
              <Search className="absolute left-3.5 h-4 w-4 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar centros o marcadores..."
                value={markerSearchQuery}
                onChange={(e) => {
                  setMarkerSearchQuery(e.target.value);
                  setIsSearchFocused(true);
                }}
                onFocus={() => setIsSearchFocused(true)}
                className="w-full h-10 rounded-2xl border border-gray-200/90 bg-white/90 shadow-2xs pl-9.5 pr-8 text-xs font-semibold text-zinc-800 placeholder:text-zinc-400 outline-none focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-200/60 transition-all"
              />
              {markerSearchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setMarkerSearchQuery("");
                    setIsSearchFocused(false);
                  }}
                  className="absolute right-2.5 flex h-5 w-5 items-center justify-center rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Menú desplegable con coincidencias de búsqueda */}
            {isSearchFocused && markerSearchQuery.trim().length > 0 && (
              <div className="absolute left-0 top-full mt-1.5 z-50 w-full max-h-64 overflow-y-auto custom-scrollbar rounded-2xl border border-gray-200/90 bg-white/98 shadow-2xl p-1.5 flex flex-col gap-1 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
                {searchResults.length > 0 ? (
                  searchResults.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelectSearchResult(item)}
                      className="flex flex-col gap-1 rounded-xl p-2.5 text-left transition-colors cursor-pointer hover:bg-zinc-100/80 border border-transparent hover:border-gray-200/60 group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-zinc-900 group-hover:text-black truncate">
                          {item.nombre}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0 ${
                            item.category === "EVACUACION"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          {item.category === "EVACUACION" ? (
                            <Info className="h-2.5 w-2.5 stroke-[2.5]" />
                          ) : (
                            <svg
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="h-2.5 w-2.5"
                            >
                              <path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7V2z" />
                            </svg>
                          )}
                          <span>{item.tipo}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-zinc-500 font-medium truncate">
                        <MapPin className="h-3 w-3 shrink-0 text-zinc-400" />
                        <span className="truncate">{item.ubicacion}</span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-6 text-center text-xs text-zinc-400 font-medium">
                    No se encontraron marcadores para &quot;{markerSearchQuery}
                    &quot;
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Lista de Reclamos Recientes (Últimas alertas) */}
          <div className="flex flex-col flex-1 min-h-0 gap-2">
            <div className="w-full flex items-center justify-between relative z-20">
              <span className="text-sm font-bold text-zinc-900 text-nowrap">
                Últimas alertas
              </span>
              <FilterDropdown
                value={filters.tipo || ""}
                onChange={(val) => onUpdateFilter("tipo", val)}
              />
            </div>

            <div className="flex flex-col flex-1 rounded-2xl border border-gray-200 bg-white p-2 overflow-hidden max-h-[56vh]">
              {loading && (
                <div className="rounded-xl border border-dashed border-zinc-200 px-3 py-16 text-center text-xs text-zinc-400 font-medium">
                  Cargando alertas...
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-xs text-red-600 font-medium">
                  {error}
                </div>
              )}

              {!loading && !error && visibleReports.length === 0 && (
                <div className="rounded-xl border border-dashed border-zinc-200 px-3 py-16 text-center text-xs text-zinc-400 font-medium">
                  No hay alertas de este tipo.
                </div>
              )}

              {!loading && !error && visibleReports.length > 0 && (
                <div className="gap-2 flex flex-col overflow-y-auto custom-scrollbar pr-1">
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
