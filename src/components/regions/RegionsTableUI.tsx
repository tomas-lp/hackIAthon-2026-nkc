"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { RegionLista, RegionPersonalizada } from "@/types/region";
import { Report } from "@/types/report";
import { isPointInPolygon, isPointInGeoJSONGeometry } from "@/lib/geometry";
import { formatTitleCase } from "@/lib/format";
import { BarriosFeatureCollection } from "@/services/barrioService";
import { TooltipSign } from "@/components/ui/TooltipSign";
import { Switch } from "@/components/ui/Switch";
import {
  Search,
  Plus,
  Trash2,
  Download,
  MoreHorizontal,
  X,
  MapPin,
  Check,
  Pencil,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
} from "lucide-react";

export type SortField = "nombre" | "localidad";

export type SortOrder = "asc" | "desc";

interface RegionsTableUIProps {
  regiones: RegionPersonalizada[];
  listas: RegionLista[];
  reports: Report[]; // Reportes activos
  allReports: Report[]; // Todos los reportes (de siempre)
  barriosGeoJson?: BarriosFeatureCollection | null;
  activeListFilter: string;
  onListFilterChange: (listName: string) => void;
  onSelectRegion: (id: string) => void;
  onCreateRegion: () => void;
  onDeleteRegions: (ids: string[]) => Promise<void>;
  onUpdateRegion?: (id: string, data: { nombre: string }) => Promise<void>;
  selectedRegionId: string | null;
  onOpenNewListModal?: () => void;
}

// Helper para calcular el centroide de un polígono
function calculateCentroid(points: [number, number][]): [number, number] {
  if (!points || points.length === 0) return [-27.4692, -58.8306];
  let sumLat = 0;
  let sumLon = 0;
  for (const pt of points) {
    sumLat += pt[0];
    sumLon += pt[1];
  }
  return [sumLat / points.length, sumLon / points.length];
}

// Validar que un texto de localidad sea válido (y no un número de teléfono o ID de chat)
function isValidLocalidad(loc?: string | null): loc is string {
  if (!loc || typeof loc !== "string") return false;
  const trimmed = loc.trim();
  if (trimmed.length < 3) return false;
  // Si contiene solo números (como ID de Telegram o teléfono), NO es localidad
  if (/^\d+$/.test(trimmed)) return false;
  if (/^\+?\d[\d\s-]{6,}$/.test(trimmed)) return false;
  return true;
}

// Fallback geográfico según coordenadas
function getFallbackLocalityFromCoords(lat: number, lon: number): string {
  if (lat >= -27.6 && lat <= -27.3) {
    if (lon >= -58.85 && lon <= -58.7) {
      return "Corrientes Capital";
    } else if (lon < -58.85 && lon >= -59.1) {
      return "Resistencia";
    }
  }
  return "Corrientes Capital";
}

// Cache local de localidades resueltas
const localityCache = new Map<string, string>();

export function RegionsTableUI({
  regiones,
  listas,
  reports,
  allReports,
  barriosGeoJson,
  activeListFilter,
  onListFilterChange,
  onSelectRegion,
  onCreateRegion,
  onDeleteRegions,
  onUpdateRegion,
  selectedRegionId,
  onOpenNewListModal,
}: RegionsTableUIProps) {
  const [selectedType, setSelectedType] = useState<string>(
    activeListFilter === "Todo" || !activeListFilter
      ? "Barrios"
      : activeListFilter
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);
  const rowMenuRef = useRef<HTMLDivElement>(null);

  // Estado para el menú flotante fijo (fuera del contenedor recortado)
  const [activeMenuData, setActiveMenuData] = useState<{
    region: { id: string; nombre: string };
    top: number;
    right: number;
  } | null>(null);

  useEffect(() => {
    function handleScrollOrClick(event: Event) {
      if (
        overflowRef.current &&
        !overflowRef.current.contains(event.target as Node)
      ) {
        setIsOverflowOpen(false);
      }
      if (
        rowMenuRef.current &&
        !rowMenuRef.current.contains(event.target as Node)
      ) {
        setActiveMenuData(null);
      }
    }
    document.addEventListener("mousedown", handleScrollOrClick);
    window.addEventListener("scroll", handleScrollOrClick, true);
    return () => {
      document.removeEventListener("mousedown", handleScrollOrClick);
      window.removeEventListener("scroll", handleScrollOrClick, true);
    };
  }, []);

  const [resolvedLocalities, setResolvedLocalities] = useState<
    Record<string, string>
  >({});
  const [sortField, setSortField] = useState<SortField>("nombre");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Inline editing state
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");

  // Mantener sincronizado selectedType si cambia activeListFilter desde el header
  useEffect(() => {
    if (activeListFilter === "Todo") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedType("Barrios");
    } else if (activeListFilter === "Barrios") {
      setSelectedType("Barrios");
    } else {
      setSelectedType(activeListFilter);
    }
  }, [activeListFilter]);

  // Mantener scroll sincronizado en el elemento seleccionado
  useEffect(() => {
    if (selectedRegionId) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`region-row-${selectedRegionId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedRegionId]);

  // Resolver localidades asíncronamente para cada región usando geocodificación inversa del centroide
  useEffect(() => {
    let isCancelled = false;

    async function resolveLocalities() {
      const newLocalities: Record<string, string> = {};

      for (const region of regiones) {
        const cacheKey = `${region.id}-${region.points.length}`;
        if (localityCache.has(cacheKey)) {
          const cachedVal = localityCache.get(cacheKey)!;
          if (isValidLocalidad(cachedVal)) {
            newLocalities[region.id] = cachedVal;
            continue;
          }
        }

        const [cLat, cLon] = calculateCentroid(region.points);
        let loc = getFallbackLocalityFromCoords(cLat, cLon);

        try {
          const res = await fetch(
            `/api/reverse-geocode?lat=${cLat}&lon=${cLon}&lang=es`
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const city =
              addr.city ||
              addr.town ||
              addr.village ||
              addr.municipality ||
              addr.county ||
              addr.state;

            if (city && typeof city === "string" && city.trim()) {
              const lower = city.toLowerCase();
              if (
                lower.includes("corrientes") ||
                addr.county === "Capital" ||
                addr.state === "Corrientes"
              ) {
                loc = "Corrientes Capital";
              } else if (lower.includes("resistencia")) {
                loc = "Resistencia";
              } else {
                loc = city;
              }
            }
          }
        } catch {
          // Usa el fallback geográfico calculado
        }

        // Si la geocodificación dio el genérico y encontramos un reporte con localidad explícita válida
        if (loc === "Corrientes Capital") {
          for (const r of allReports) {
            if (
              isValidLocalidad(r.localidad) &&
              Number.isFinite(r.latitud) &&
              Number.isFinite(r.longitud) &&
              isPointInPolygon([r.latitud, r.longitud], region.points)
            ) {
              loc = r.localidad;
              break;
            }
          }
        }

        localityCache.set(cacheKey, loc);
        newLocalities[region.id] = loc;
      }

      if (!isCancelled) {
        setResolvedLocalities((prev) => ({ ...prev, ...newLocalities }));
      }
    }

    resolveLocalities();

    return () => {
      isCancelled = true;
    };
  }, [regiones, allReports]);

  // Calcular estadísticas reales por región personalizada
  const regionesConStats = useMemo(() => {
    return regiones.map((region) => {
      let totalReclamos = 0;

      for (const r of allReports) {
        if (
          Number.isFinite(r.latitud) &&
          Number.isFinite(r.longitud) &&
          isPointInPolygon([r.latitud, r.longitud], region.points)
        ) {
          totalReclamos++;
        }
      }

      let reclamosActivos = 0;
      for (const r of reports) {
        if (
          Number.isFinite(r.latitud) &&
          Number.isFinite(r.longitud) &&
          isPointInPolygon([r.latitud, r.longitud], region.points)
        ) {
          reclamosActivos++;
        }
      }

      const [cLat, cLon] = calculateCentroid(region.points);
      const defaultLoc = getFallbackLocalityFromCoords(cLat, cLon);
      const rawLoc = resolvedLocalities[region.id] || defaultLoc;

      return {
        ...region,
        nombre: formatTitleCase(region.nombre),
        localidad: formatTitleCase(rawLoc),
        cantidadReclamos: totalReclamos,
        ultimaAyuda: null as string | null, // Sistema de ayuda no implementado aún
        reclamosActivos,
      };
    });
  }, [regiones, allReports, reports, resolvedLocalities]);

  // Calcular estadísticas reales para los barrios de la API PostGIS
  const barriosConStats = useMemo(() => {
    if (!barriosGeoJson?.features) return [];

    return barriosGeoJson.features.map((feature, idx) => {
      const props = feature.properties || {};
      const id = props.id || `barrio-${idx}`;
      const rawNombre = props.nombre || `Barrio ${idx + 1}`;
      const rawLocalidad = props.ciudad || "Corrientes Capital";

      let totalReclamos = 0;
      let reclamosActivos = 0;

      if (feature.geometry) {
        for (const r of allReports) {
          if (
            Number.isFinite(r.latitud) &&
            Number.isFinite(r.longitud) &&
            isPointInGeoJSONGeometry([r.latitud, r.longitud], feature.geometry)
          ) {
            totalReclamos++;
          }
        }

        for (const r of reports) {
          if (
            Number.isFinite(r.latitud) &&
            Number.isFinite(r.longitud) &&
            isPointInGeoJSONGeometry([r.latitud, r.longitud], feature.geometry)
          ) {
            reclamosActivos++;
          }
        }
      }

      return {
        id,
        user_id: "system",
        nombre: formatTitleCase(rawNombre),
        lista_id: "barrios-api",
        lista_nombre: "Barrios",
        points: [] as [number, number][],
        created_at: new Date().toISOString(),
        localidad: formatTitleCase(rawLocalidad),
        cantidadReclamos: totalReclamos,
        ultimaAyuda: null as string | null, // Sistema de ayuda no implementado aún
        reclamosActivos,
      };
    });
  }, [barriosGeoJson, allReports, reports]);

  // Estado auxiliar para saber si la vista activa es Barrios
  const isBarriosSelected = useMemo(() => {
    return selectedType === "Barrios" || activeListFilter === "Barrios";
  }, [selectedType, activeListFilter]);

  // Filtrado por Tipo/Lista y Buscador
  const filteredRegiones = useMemo(() => {
    if (isBarriosSelected) {
      return barriosConStats.filter((item) => {
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          return item.nombre.toLowerCase().includes(query);
        }
        return true;
      });
    }

    return regionesConStats.filter((item) => {
      if (selectedType !== "TODOS") {
        if (
          item.lista_id !== selectedType &&
          item.lista_nombre !== selectedType
        ) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        if (!item.nombre.toLowerCase().includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [
    regionesConStats,
    barriosConStats,
    selectedType,
    searchQuery,
    isBarriosSelected,
  ]);

  // Manejo de ordenamiento solo para nombre y localidad
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const sortedRegiones = useMemo(() => {
    return [...filteredRegiones].sort((a, b) => {
      const valA = a[sortField] ?? "";
      const valB = b[sortField] ?? "";

      if (typeof valA === "string" && typeof valB === "string") {
        const cmp = valA.localeCompare(valB, "es", { sensitivity: "base" });
        return sortOrder === "asc" ? cmp : -cmp;
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredRegiones, sortField, sortOrder]);

  // Manejo de checkboxes
  const isAllSelected =
    sortedRegiones.length > 0 &&
    sortedRegiones.every((r) => selectedRowIds.has(r.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(sortedRegiones.map((r) => r.id)));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Botón Basura: activa modo selección o abre confirmación de borrado
  const handleTrashButtonClick = () => {
    if (isBarriosSelected) {
      alert(
        "Los barrios provienen de la API del sistema y no se pueden eliminar."
      );
      return;
    }
    if (!isDeleteMode) {
      setIsDeleteMode(true);
      setSelectedRowIds(new Set());
    } else {
      if (selectedRowIds.size === 0) {
        alert("Selecciona al menos una región para eliminar.");
        return;
      }
      setShowConfirmDeleteModal(true);
    }
  };

  const handleCancelDeleteMode = () => {
    setIsDeleteMode(false);
    setSelectedRowIds(new Set());
  };

  // Inline editing handlers
  const handleStartEdit = (region: { id: string; nombre: string }) => {
    setEditingRowId(region.id);
    setEditNombre(region.nombre);
    setActiveMenuData(null);
  };

  const handleCancelEdit = () => {
    setEditingRowId(null);
    setEditNombre("");
  };

  const handleConfirmEdit = async () => {
    if (!editingRowId || !onUpdateRegion) return;
    try {
      await onUpdateRegion(editingRowId, { nombre: editNombre.trim() });
    } catch (e) {
      console.error("Error al actualizar región:", e);
    }
    setEditingRowId(null);
    setEditNombre("");
  };

  // Exportar a Excel (CSV con UTF-8 BOM y datos reales)
  const handleExportExcel = () => {
    if (sortedRegiones.length === 0) {
      alert("No hay regiones para exportar.");
      return;
    }

    const headers = [
      "Nombre",
      "Localidad",
      "Cantidad de reclamos",
      "Última ayuda",
      "Reclamos activos",
      "Lista",
      "Fecha de creación",
    ];

    const rows = sortedRegiones.map((r) => [
      `"${r.nombre.replace(/"/g, '""')}"`,
      `"${r.localidad}"`,
      r.cantidadReclamos,
      r.ultimaAyuda ? `"${r.ultimaAyuda}"` : "null",
      r.reclamosActivos,
      `"${(r.lista_nombre || "Lista 1").replace(/"/g, '""')}"`,
      `"${new Date(r.created_at).toLocaleDateString()}"`,
    ]);

    const csvContent =
      "\uFEFF" +
      [headers.join(";"), ...rows.map((row) => row.join(";"))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `regiones_listado_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Confirmar eliminación
  const handleDeleteConfirm = async () => {
    const idsToDelete = Array.from(selectedRowIds);
    if (idsToDelete.length === 0) return;
    try {
      await onDeleteRegions(idsToDelete);
      setSelectedRowIds(new Set());
      setIsDeleteMode(false);
      setShowConfirmDeleteModal(false);
    } catch (e) {
      console.error(e);
      alert("Error eliminando las regiones seleccionadas.");
    }
  };

  // Listas personalizadas únicas
  const uniqueListas = useMemo(() => {
    const seen = new Set<string>();
    const res: RegionLista[] = [];
    for (const l of listas) {
      if (l.nombre && !seen.has(l.nombre)) {
        seen.add(l.nombre);
        res.push(l);
      }
    }
    return res;
  }, [listas]);

  const activeCustomList = useMemo(() => {
    return (
      uniqueListas.find(
        (l) => l.nombre === selectedType || l.id === selectedType
      ) ||
      uniqueListas[0] ||
      null
    );
  }, [uniqueListas, selectedType]);

  const hasMultipleLists = uniqueListas.length >= 2;

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Controles de Filtro Superiores y Acciones (Alineados en altura y con mismo sombreado) */}
      <div className="flex flex-wrap items-center justify-between gap-4 w-full py-1">
        {/* Lado Izquierdo: Filtro Región con Switch animado y dropdown select */}
        <div ref={overflowRef} className="relative flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-600">Región:</span>
          <Switch
            value={isBarriosSelected ? "Barrios" : selectedType}
            onValueChange={(val) => {
              setSelectedType(val);
              onListFilterChange(val === "TODOS" ? "Todo" : val);
            }}
          >
            <Switch.Option value="Barrios">Barrios</Switch.Option>

            {/* Pestaña de lista personalizada única con dropdown */}
            {activeCustomList && (
              <Switch.Option
                value={activeCustomList.nombre}
                onClick={() => {
                  if (
                    !isBarriosSelected &&
                    (selectedType === activeCustomList.nombre ||
                      selectedType === activeCustomList.id)
                  ) {
                    if (hasMultipleLists) {
                      setIsOverflowOpen((prev) => !prev);
                    }
                  } else {
                    setSelectedType(activeCustomList.nombre);
                    onListFilterChange(activeCustomList.nombre);
                    setIsOverflowOpen(false);
                  }
                }}
              >
                <span className="flex items-center gap-1">
                  <span>{activeCustomList.nombre}</span>
                  {hasMultipleLists && (
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-300 ${
                        isOverflowOpen ? "rotate-180" : ""
                      }`}
                    />
                  )}
                </span>
              </Switch.Option>
            )}
          </Switch>

          {/* Menú desplegable flotante con las demás listas */}
          {hasMultipleLists && isOverflowOpen && (
            <div className="absolute top-full mt-2 left-0 z-50 flex flex-col rounded-2xl border border-gray-200/60 bg-white/90 backdrop-blur-md shadow-[0_7px_50px_0px_rgb(0,0,0,0.1)] min-w-[170px] overflow-hidden transition-all duration-200 ease-out p-1.5 animate-in fade-in zoom-in-95">
              {uniqueListas.map((lista) => {
                const isSelected =
                  !isBarriosSelected &&
                  (selectedType === lista.nombre || selectedType === lista.id);
                return (
                  <button
                    key={lista.id || lista.nombre}
                    type="button"
                    onClick={() => {
                      setSelectedType(lista.nombre);
                      onListFilterChange(lista.nombre);
                      setIsOverflowOpen(false);
                    }}
                    className={`flex items-center justify-between rounded-xl px-3.5 py-2 text-xs text-left transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-white font-bold text-zinc-950 shadow-xs"
                        : "text-zinc-700 hover:bg-white/60 hover:text-zinc-950 font-medium"
                    }`}
                  >
                    <span>{lista.nombre}</span>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-zinc-900 ml-2" />
                    )}
                  </button>
                );
              })}
              {onOpenNewListModal && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOverflowOpen(false);
                    onOpenNewListModal();
                  }}
                  className="text-left px-3 py-2 text-xs rounded-lg font-bold text-zinc-800 hover:bg-zinc-100 transition cursor-pointer border-t border-gray-200/60 mt-1 flex items-center gap-1.5"
                >
                  <Plus className="w-3 h-3" />
                  <span>Nueva lista...</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Lado Derecho: Buscador, +, Trash, Exportar - Todos con h-9 y sombra uniforme */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Buscador */}
          <div className="relative flex items-center h-9">
            <input
              type="text"
              placeholder="Buscar región..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 rounded-full border border-gray-200/60 bg-white/50 shadow-[0_7px_50px_0px_rgb(0,0,0,0.1)] backdrop-blur-md pl-3.5 pr-8 text-xs text-zinc-800 placeholder:text-zinc-400 outline-none focus:border-zinc-400 focus:bg-white transition-all w-36 sm:w-48"
            />
            <button
              type="button"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full text-zinc-400 hover:text-zinc-800 transition-colors cursor-pointer"
            >
              <Search className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Botón + Crear nueva región en mapa */}
          <TooltipSign
            label={
              isBarriosSelected
                ? "No se pueden añadir barrios"
                : "Añadir nueva región en el mapa"
            }
            position="top"
            delayMs={500}
          >
            <button
              type="button"
              disabled={isBarriosSelected}
              onClick={onCreateRegion}
              className={`flex h-9 w-9 items-center justify-center rounded-full border transition-all active:scale-95 shrink-0 shadow-[0_7px_50px_0px_rgb(0,0,0,0.1)] backdrop-blur-md ${
                isBarriosSelected
                  ? "border-gray-200/60 bg-white/30 text-zinc-300 cursor-not-allowed opacity-50"
                  : "border-gray-200/60 bg-white/50 text-zinc-700 hover:bg-white hover:text-zinc-900 cursor-pointer"
              }`}
            >
              <Plus className="h-4 w-4" />
            </button>
          </TooltipSign>

          {/* Botón Basura — perfectamente redondo con h-9 w-9 y sombra uniforme */}
          <div className="flex items-center gap-1.5 transition-all duration-200">
            <TooltipSign
              label={
                isBarriosSelected
                  ? "Los barrios no se pueden eliminar"
                  : isDeleteMode
                    ? "Cancelar modo eliminación"
                    : "Eliminar una región"
              }
              position="top"
              delayMs={500}
            >
              <button
                type="button"
                disabled={isBarriosSelected}
                onClick={handleTrashButtonClick}
                className={`flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-200 shadow-[0_7px_50px_0px_rgb(0,0,0,0.1)] backdrop-blur-md active:scale-95 shrink-0 ${
                  isBarriosSelected
                    ? "border-gray-200/60 bg-white/30 text-zinc-300 cursor-not-allowed opacity-50"
                    : isDeleteMode
                      ? "border-red-200 bg-red-50/90 text-red-600 hover:bg-red-100 cursor-pointer"
                      : "border-gray-200/60 bg-white/50 text-zinc-700 hover:bg-white hover:text-zinc-900 cursor-pointer"
                }`}
              >
                {isDeleteMode && selectedRowIds.size > 0 ? (
                  <span className="text-[11px] font-bold animate-fade-kpi">
                    {selectedRowIds.size}
                  </span>
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </button>
            </TooltipSign>

            {isDeleteMode && !isBarriosSelected && (
              <button
                type="button"
                onClick={handleCancelDeleteMode}
                className="h-9 rounded-full border border-gray-200/60 bg-white/50 px-3.5 text-xs font-semibold text-zinc-600 shadow-[0_7px_50px_0px_rgb(0,0,0,0.1)] backdrop-blur-md hover:bg-white hover:text-zinc-900 transition-all duration-150 active:scale-95 cursor-pointer flex items-center"
              >
                Cancelar
              </button>
            )}
          </div>

          {/* Botón Exportar — perfectamente redondo con icono y sombra uniforme */}
          <TooltipSign label="Exportar listado" position="top" delayMs={500}>
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200/60 bg-white/50 text-zinc-700 shadow-[0_7px_50px_0px_rgb(0,0,0,0.1)] backdrop-blur-md hover:bg-white hover:text-zinc-900 transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
          </TooltipSign>
        </div>
      </div>

      {/* Tabla con scrollbar fijo bloqueado en espacio que no causa movimientos */}
      <div className="w-full overflow-x-auto overflow-y-scroll max-h-[580px] custom-scrollbar [scrollbar-gutter:stable] pr-1 animate-list-slide-left">
        <div className="rounded-xl border border-gray-200/80 bg-white overflow-hidden">
          <table className="w-full text-left text-xs relative border-collapse">
            <thead className="sticky top-0 z-20 bg-zinc-50/90 backdrop-blur-xs shadow-2xs">
              <tr className="border-b border-gray-200 select-none">
                {isDeleteMode && (
                  <th className="w-12 px-4 py-3.5 text-left hover:bg-zinc-100/80 transition-colors animate-fade-kpi">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-zinc-900 focus:ring-zinc-500 cursor-pointer"
                    />
                  </th>
                )}

                {/* Nombre — sortable y hover */}
                <th
                  onClick={() => handleSort("nombre")}
                  className={`px-5 py-3.5 text-xs font-bold transition-colors cursor-pointer group select-none hover:bg-zinc-100/80 text-left min-w-[180px] ${
                    sortField === "nombre"
                      ? "text-zinc-900 bg-zinc-100/40"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  <div className="flex items-center justify-start gap-1.5">
                    <span className="leading-snug">Nombre</span>
                    {sortField === "nombre" ? (
                      sortOrder === "asc" ? (
                        <ArrowDown className="h-3 w-3 text-zinc-900 shrink-0" />
                      ) : (
                        <ArrowUp className="h-3 w-3 text-zinc-900 shrink-0" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-zinc-400 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
                    )}
                  </div>
                </th>

                {/* Localidad — sortable y hover */}
                <th
                  onClick={() => handleSort("localidad")}
                  className={`px-5 py-3.5 text-xs font-bold transition-colors cursor-pointer group select-none hover:bg-zinc-100/80 text-left min-w-[150px] ${
                    sortField === "localidad"
                      ? "text-zinc-900 bg-zinc-100/40"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  <div className="flex items-center justify-start gap-1.5">
                    <span className="leading-snug">Localidad</span>
                    {sortField === "localidad" ? (
                      sortOrder === "asc" ? (
                        <ArrowDown className="h-3 w-3 text-zinc-900 shrink-0" />
                      ) : (
                        <ArrowUp className="h-3 w-3 text-zinc-900 shrink-0" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-zinc-400 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
                    )}
                  </div>
                </th>

                {/* Cantidad de reclamos — hover, título completo y alineado izquierda */}
                <th className="px-5 py-3.5 text-xs font-bold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80 transition-colors select-none text-left min-w-[150px]">
                  Cantidad de reclamos
                </th>

                {/* Última ayuda — hover, título completo y alineado izquierda */}
                <th className="px-5 py-3.5 text-xs font-bold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80 transition-colors select-none text-left min-w-[130px]">
                  Última ayuda
                </th>

                {/* Reclamos activos — hover, título completo y alineado izquierda */}
                <th className="px-5 py-3.5 text-xs font-bold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80 transition-colors select-none text-left min-w-[140px]">
                  Reclamos activos
                </th>

                {/* Acciones — hover en cabecera */}
                <th className="w-16 px-3 py-3.5 hover:bg-zinc-100/80 transition-colors" />
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 bg-white">
              {sortedRegiones.length === 0 ? (
                <tr>
                  <td
                    colSpan={isDeleteMode ? 7 : 6}
                    className="px-6 py-12 text-center text-xs text-zinc-400"
                  >
                    {isBarriosSelected && !barriosGeoJson
                      ? "Cargando barrios..."
                      : "No se encontraron regiones creadas."}
                  </td>
                </tr>
              ) : (
                <>
                  {sortedRegiones.map((region) => {
                    const isChecked = selectedRowIds.has(region.id);
                    const isSelected = selectedRegionId === region.id;
                    const isEditing = editingRowId === region.id;

                    return (
                      <tr
                        key={region.id}
                        id={`region-row-${region.id}`}
                        onClick={() => {
                          if (isEditing) return;
                          if (isDeleteMode) {
                            toggleSelectRow(region.id);
                          } else {
                            onSelectRegion(region.id);
                          }
                        }}
                        className={`group transition-colors cursor-pointer ${
                          isEditing
                            ? "bg-amber-50/60"
                            : isSelected
                              ? "bg-blue-50/90 font-bold"
                              : isChecked
                                ? "bg-red-50/60"
                                : "hover:bg-zinc-50/80"
                        }`}
                      >
                        {/* Checkbox (solo visible en modo eliminación) */}
                        {isDeleteMode && (
                          <td
                            className="px-4 py-3 text-left animate-fade-kpi"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSelectRow(region.id)}
                              className="h-3.5 w-3.5 rounded border-gray-300 text-zinc-900 focus:ring-zinc-500 cursor-pointer"
                            />
                          </td>
                        )}

                        {/* Nombre — alineado a la izquierda */}
                        <td className="px-5 py-3 font-bold text-zinc-900 text-left">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editNombre}
                              onChange={(e) => setEditNombre(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full rounded-xl border border-gray-300 bg-white/90 shadow-2xs px-3 py-1.5 text-xs text-zinc-900 font-bold outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 transition-all"
                              autoFocus
                            />
                          ) : (
                            region.nombre
                          )}
                        </td>

                        {/* Localidad — alineado a la izquierda */}
                        <td className="px-5 py-3 text-zinc-600 font-medium text-left">
                          {region.localidad}
                        </td>

                        {/* Cantidad de reclamos — alineado a la izquierda */}
                        <td className="px-5 py-3 text-zinc-800 text-left font-bold">
                          {region.cantidadReclamos}
                        </td>

                        {/* Última ayuda — alineado a la izquierda */}
                        <td className="px-5 py-3 text-zinc-400 text-left font-medium">
                          {region.ultimaAyuda ?? "-"}
                        </td>

                        {/* Reclamos activos — alineado a la izquierda */}
                        <td className="px-5 py-3 text-zinc-800 font-bold text-left">
                          {region.reclamosActivos}
                        </td>

                        {/* Opciones ... — botones redondos con color de fuente normal */}
                        <td
                          className="px-3 py-3 text-left relative"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isEditing ? (
                            <div className="flex items-center justify-start gap-1.5">
                              <button
                                type="button"
                                onClick={handleConfirmEdit}
                                className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 shadow-2xs transition-all active:scale-95 cursor-pointer"
                                title="Confirmar edición"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 shadow-2xs transition-all active:scale-95 cursor-pointer"
                                title="Cancelar edición"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect =
                                  e.currentTarget.getBoundingClientRect();
                                if (activeMenuData?.region.id === region.id) {
                                  setActiveMenuData(null);
                                } else {
                                  const spaceBelow =
                                    window.innerHeight - rect.bottom;
                                  const showAbove = spaceBelow < 140;
                                  setActiveMenuData({
                                    region,
                                    top: showAbove
                                      ? rect.top - 120
                                      : rect.bottom + 4,
                                    right: window.innerWidth - rect.right,
                                  });
                                }
                              }}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800 transition-colors cursor-pointer"
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Menú contextual flotante fijo (Portal libre de recortes o límites de tabla) */}
      {activeMenuData && (
        <div
          ref={rowMenuRef}
          style={{
            position: "fixed",
            top: `${activeMenuData.top}px`,
            right: `${activeMenuData.right}px`,
            zIndex: 9999,
          }}
          className="w-36 rounded-xl border border-gray-200 bg-white p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              onSelectRegion(activeMenuData.region.id);
              setActiveMenuData(null);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
          >
            <MapPin className="h-3.5 w-3.5 text-zinc-500" />
            <span>Ver en mapa</span>
          </button>
          {!isBarriosSelected && onUpdateRegion && (
            <button
              onClick={() => {
                handleStartEdit(activeMenuData.region);
                setActiveMenuData(null);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
            >
              <Pencil className="h-3.5 w-3.5 text-zinc-500" />
              <span>Editar</span>
            </button>
          )}
          {!isBarriosSelected && (
            <button
              onClick={async () => {
                const idToDelete = activeMenuData.region.id;
                setActiveMenuData(null);
                await onDeleteRegions([idToDelete]);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Eliminar</span>
            </button>
          )}
        </div>
      )}

      {/* Modal de confirmación para borrado */}
      {showConfirmDeleteModal && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/30 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-gray-200 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-900">
                Confirmar eliminación
              </h3>
              <button
                onClick={() => setShowConfirmDeleteModal(false)}
                className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed">
              ¿Estás seguro de que deseas eliminar {selectedRowIds.size} región
              {selectedRowIds.size > 1 ? "es" : ""}? Esta acción no se puede
              deshacer.
            </p>
            <div className="flex items-center justify-end gap-2.5 mt-2">
              <button
                type="button"
                onClick={() => setShowConfirmDeleteModal(false)}
                className="flex w-1/2 items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-zinc-700 shadow-2xs hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="flex w-1/2 items-center justify-center gap-2 rounded-full border border-red-500 bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-red-700 transition-all active:scale-95 cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
