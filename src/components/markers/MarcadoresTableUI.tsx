"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import {
  MarkerRow,
  SAFE_ZONE_TYPE_LABELS,
  HEALTH_CENTER_TYPE_LABELS,
} from "@/types/marker";
import { RegionLista, RegionPersonalizada } from "@/types/region";
import { BarriosFeatureCollection } from "@/services/barrioService";
import { isPointInPolygon, isPointInGeoJSONGeometry } from "@/lib/geometry";
import { formatTitleCase } from "@/lib/format";
import {
  Search,
  Plus,
  Trash2,
  Download,
  MoreHorizontal,
  MapPin,
  Check,
  X,
  Pencil,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
} from "lucide-react";
import { Switch } from "@/components/ui/Switch";
import { TooltipSign } from "@/components/ui/TooltipSign";

export type SortField = "nombre" | "localidad" | "region" | "subtipo";

export type SortOrder = "asc" | "desc";

interface MarcadoresTableUIProps {
  markers: MarkerRow[];
  activeCategoryFilter: string;
  onCategoryFilterChange: (cat: string) => void;
  barriosGeoJson?: BarriosFeatureCollection | null;
  regionLists?: RegionLista[];
  customRegions?: RegionPersonalizada[];
  onSelectMarker: (marker: MarkerRow) => void;
  onCreateMarker: () => void;
  onDeleteMarkers: (ids: string[]) => Promise<void>;
  onUpdateMarker?: (
    id: string,
    data: {
      nombre: string;
      direccion: string;
      tipo?: string;
      capacidad_maxima?: number | null;
    }
  ) => Promise<void>;
  selectedMarkerId: string | null;
}

// Cache local de localidades resueltas
const localityCache = new Map<string, string>();

export function MarcadoresTableUI({
  markers,
  activeCategoryFilter,
  onCategoryFilterChange,
  barriosGeoJson,
  regionLists = [],
  customRegions = [],
  onSelectMarker,
  onCreateMarker,
  onDeleteMarkers,
  onUpdateMarker,
  selectedMarkerId,
}: MarcadoresTableUIProps) {
  const [selectedType, setSelectedType] = useState<string>(
    activeCategoryFilter === "TODOS" ? "EVACUACION" : activeCategoryFilter
  );
  const [selectedRegionFilter, setSelectedRegionFilter] =
    useState<string>("Barrios");
  const [isRegionOverflowOpen, setIsRegionOverflowOpen] = useState(false);
  const regionOverflowRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);

  // Estado para el menú flotante fijo (fuera del contenedor recortado)
  const [activeMenuData, setActiveMenuData] = useState<{
    marker: MarkerRow;
    top: number;
    right: number;
  } | null>(null);

  const [resolvedLocalities, setResolvedLocalities] = useState<
    Record<string, string>
  >({});
  const [sortField, setSortField] = useState<SortField>("nombre");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Inline editing state
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editTipo, setEditTipo] = useState("");
  const [editDireccion, setEditDireccion] = useState("");
  const [editCapacidad, setEditCapacidad] = useState<string>("");

  const rowMenuRef = useRef<HTMLDivElement>(null);

  // Sincronizar estado si cambia desde el padre
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedType(
      activeCategoryFilter === "TODOS" ? "EVACUACION" : activeCategoryFilter
    );
  }, [activeCategoryFilter]);

  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [typeDropdownPos, setTypeDropdownPos] = useState<{
    top: number;
    left: number;
    width: number;
    marker: MarkerRow;
  } | null>(null);
  const typeDropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar menú contextual en click fuera o scroll
  useEffect(() => {
    function handleScrollOrClick(event: Event) {
      if (
        rowMenuRef.current &&
        !rowMenuRef.current.contains(event.target as Node)
      ) {
        setActiveMenuData(null);
      }
      if (
        regionOverflowRef.current &&
        !regionOverflowRef.current.contains(event.target as Node)
      ) {
        setIsRegionOverflowOpen(false);
      }
      if (
        typeDropdownRef.current &&
        !typeDropdownRef.current.contains(event.target as Node)
      ) {
        setIsTypeDropdownOpen(false);
        setTypeDropdownPos(null);
      }
    }
    document.addEventListener("mousedown", handleScrollOrClick);
    window.addEventListener("scroll", handleScrollOrClick, true);
    return () => {
      document.removeEventListener("mousedown", handleScrollOrClick);
      window.removeEventListener("scroll", handleScrollOrClick, true);
    };
  }, []);

  // Reverse geocoding diferido para los marcadores sin localidad
  useEffect(() => {
    let isCancelled = false;

    async function fetchMissingLocalities() {
      for (const m of markers) {
        if (isCancelled) break;
        if (m.localidad) continue;

        const cacheKey = `${m.lat.toFixed(4)},${m.lon.toFixed(4)}`;
        if (localityCache.has(cacheKey)) {
          setResolvedLocalities((prev) => ({
            ...prev,
            [m.id]: localityCache.get(cacheKey)!,
          }));
          continue;
        }

        try {
          const res = await fetch(
            `/api/reverse-geocode?lat=${m.lat}&lon=${m.lon}`
          );
          if (!res.ok) continue;
          const data = await res.json();
          const locName =
            data.localidad ||
            data.barrio ||
            data.departamento ||
            "Corrientes Capital";
          localityCache.set(cacheKey, locName);
          if (!isCancelled) {
            setResolvedLocalities((prev) => ({
              ...prev,
              [m.id]: locName,
            }));
          }
        } catch {
          // Fallback
        }
      }
    }

    fetchMissingLocalities();

    return () => {
      isCancelled = true;
    };
  }, [markers]);

  // Listas personalizadas únicas
  const uniqueListas = useMemo(() => {
    const seen = new Set<string>();
    const res: RegionLista[] = [];
    for (const l of internalRegionLists) {
      if (l.nombre && !seen.has(l.nombre)) {
        seen.add(l.nombre);
        res.push(l);
      }
    }
    return res;
  }, [internalRegionLists]);

  const activeCustomList = useMemo(() => {
    return (
      uniqueListas.find(
        (l) =>
          l.nombre === selectedRegionFilter || l.id === selectedRegionFilter
      ) ||
      uniqueListas[0] ||
      null
    );
  }, [uniqueListas, selectedRegionFilter]);

  const hasMultipleLists = uniqueListas.length >= 2;

  // Mapeo espacial de Marcadores -> Región / Barrio / Fuera de rango
  const markerRegionMap = useMemo(() => {
    const map = new Map<string, string>();

    for (const m of markers) {
      if (!Number.isFinite(m.lat) || !Number.isFinite(m.lon)) {
        map.set(m.id, "Fuera de rango");
        continue;
      }

      if (selectedRegionFilter === "Barrios") {
        if (!internalBarriosGeoJson?.features) {
          map.set(m.id, "Fuera de rango");
          continue;
        }

        let foundBarrio: string | null = null;
        for (const feature of internalBarriosGeoJson.features) {
          if (
            feature.geometry &&
            isPointInGeoJSONGeometry([m.lat, m.lon], feature.geometry)
          ) {
            foundBarrio = feature.properties?.nombre || "Barrio";
            break;
          }
        }

        map.set(
          m.id,
          foundBarrio ? formatTitleCase(foundBarrio) : "Fuera de rango"
        );
      } else {
        // Lista personalizada seleccionada
        const targetListRegions = internalCustomRegions.filter(
          (r) =>
            r.lista_nombre === selectedRegionFilter ||
            r.lista_id === selectedRegionFilter
        );

        let foundRegion: string | null = null;
        for (const r of targetListRegions) {
          if (isPointInPolygon([m.lat, m.lon], r.points)) {
            foundRegion = r.nombre;
            break;
          }
        }

        map.set(
          m.id,
          foundRegion ? formatTitleCase(foundRegion) : "Fuera de rango"
        );
      }
    }

    return map;
  }, [
    markers,
    selectedRegionFilter,
    internalBarriosGeoJson,
    internalCustomRegions,
  ]);

  // Filtrado
  const filteredMarkers = useMemo(() => {
    return markers.filter((item) => {
      // Filtro por tipo/categoría
      if (item.category !== selectedType) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const loc = item.localidad || resolvedLocalities[item.id] || "";
        const dir = item.direccion || "";
        const region = markerRegionMap.get(item.id) || "";
        const matchName = item.nombre.toLowerCase().includes(query);
        const matchLoc = loc.toLowerCase().includes(query);
        const matchDir = dir.toLowerCase().includes(query);
        const matchSub = item.subtipo.toLowerCase().includes(query);
        const matchRegion = region.toLowerCase().includes(query);
        if (!matchName && !matchLoc && !matchDir && !matchSub && !matchRegion) {
          return false;
        }
      }

      return true;
    });
  }, [markers, selectedType, searchQuery, resolvedLocalities, markerRegionMap]);

  // Manejo de ordenamiento (nombre, localidad, region, subtipo)
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const sortedMarkers = useMemo(() => {
    return [...filteredMarkers].sort((a, b) => {
      let valA: string = "";
      let valB: string = "";

      switch (sortField) {
        case "nombre":
          valA = a.nombre;
          valB = b.nombre;
          break;
        case "localidad":
          valA =
            a.localidad || resolvedLocalities[a.id] || "Corrientes Capital";
          valB =
            b.localidad || resolvedLocalities[b.id] || "Corrientes Capital";
          break;
        case "region":
          valA = markerRegionMap.get(a.id) || "";
          valB = markerRegionMap.get(b.id) || "";
          break;
        case "subtipo":
          valA = a.subtipo;
          valB = b.subtipo;
          break;
      }

      const cmp = valA.localeCompare(valB, "es", { sensitivity: "base" });
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [
    filteredMarkers,
    sortField,
    sortOrder,
    resolvedLocalities,
    markerRegionMap,
  ]);

  // Manejo de checkboxes
  const isAllSelected =
    sortedMarkers.length > 0 &&
    sortedMarkers.every((r) => selectedRowIds.has(r.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(sortedMarkers.map((r) => r.id)));
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

  // Botón Basura
  const handleTrashButtonClick = () => {
    if (!isDeleteMode) {
      setIsDeleteMode(true);
      setSelectedRowIds(new Set());
    } else {
      if (selectedRowIds.size === 0) {
        alert("Selecciona al menos un marcador para eliminar.");
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
  const handleStartEdit = (marker: MarkerRow) => {
    setEditingRowId(marker.id);
    setEditNombre(marker.nombre);
    setEditTipo(marker.rawTipo || marker.subtipo);
    setEditDireccion(marker.direccion || "");
    setEditCapacidad(
      marker.capacidad_maxima !== null && marker.capacidad_maxima !== undefined
        ? String(marker.capacidad_maxima)
        : ""
    );
    setIsTypeDropdownOpen(false);
    setTypeDropdownPos(null);
    setActiveMenuData(null);
  };

  const handleCancelEdit = () => {
    setEditingRowId(null);
    setEditNombre("");
    setEditTipo("");
    setEditDireccion("");
    setEditCapacidad("");
    setIsTypeDropdownOpen(false);
    setTypeDropdownPos(null);
  };

  const handleConfirmEdit = async (marker: MarkerRow) => {
    if (!editingRowId || !onUpdateMarker) return;
    try {
      const parsedCap = editCapacidad.trim()
        ? parseInt(editCapacidad.trim(), 10)
        : null;

      await onUpdateMarker(editingRowId, {
        nombre: editNombre.trim(),
        direccion: editDireccion.trim(),
        tipo: editTipo || undefined,
        capacidad_maxima: marker.category === "EVACUACION" ? parsedCap : null,
      });
    } catch (e) {
      console.error("Error al actualizar marcador:", e);
    }
    setEditingRowId(null);
    setEditNombre("");
    setEditTipo("");
    setEditDireccion("");
    setEditCapacidad("");
    setIsTypeDropdownOpen(false);
    setTypeDropdownPos(null);
  };

  // Exportar a Excel / CSV (UTF-8 BOM con separador ;)
  const handleExportExcel = () => {
    if (sortedMarkers.length === 0) {
      alert("No hay marcadores para exportar.");
      return;
    }

    const headers = [
      "Nombre",
      "Categoría",
      "Tipo",
      "Localidad",
      "Región",
      "Departamento",
      "Dirección",
      ...(selectedType === "EVACUACION" ? ["Capacidad"] : []),
      "Latitud",
      "Longitud",
      "Fecha de registro",
    ];

    const rows = sortedMarkers.map((m) => {
      const loc =
        m.localidad || resolvedLocalities[m.id] || "Corrientes Capital";
      const reg = markerRegionMap.get(m.id) || "Fuera de rango";
      const catLabel =
        m.category === "EVACUACION"
          ? "Centro de evacuación"
          : "Centro de atención médica";
      return [
        `"${m.nombre.replace(/"/g, '""')}"`,
        `"${catLabel}"`,
        `"${m.subtipo.replace(/"/g, '""')}"`,
        `"${loc.replace(/"/g, '""')}"`,
        `"${reg.replace(/"/g, '""')}"`,
        `"${(m.departamento || "").replace(/"/g, '""')}"`,
        `"${(m.direccion || "").replace(/"/g, '""')}"`,
        ...(selectedType === "EVACUACION"
          ? [
              m.capacidad_maxima !== null && m.capacidad_maxima !== undefined
                ? m.capacidad_maxima
                : "",
            ]
          : []),
        m.lat,
        m.lon,
        `"${new Date(m.fecha).toLocaleDateString()}"`,
      ].join(";");
    });

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `marcadores_listado_${new Date().toISOString().slice(0, 10)}.csv`
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
      await onDeleteMarkers(idsToDelete);
      setSelectedRowIds(new Set());
      setIsDeleteMode(false);
      setShowConfirmDeleteModal(false);
    } catch (e) {
      console.error(e);
      alert("Error eliminando los marcadores seleccionados.");
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Controles de Filtro Superiores y Acciones (Alineados en altura y con mismo sombreado) */}
      <div className="flex flex-wrap items-center justify-between gap-4 w-full py-1">
        {/* Lado Izquierdo: Filtro Tipo y Filtro Región */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Filtro Tipo */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-600">
              Tipo de marcador:
            </span>
            <Switch
              value={selectedType}
              onValueChange={(val) => {
                setSelectedType(val);
                onCategoryFilterChange(val);
              }}
            >
              <Switch.Option value="EVACUACION">
                Centros de evacuación
              </Switch.Option>
              <Switch.Option value="SALUD">Centros de salud</Switch.Option>
            </Switch>
          </div>

          {/* Filtro Región (Barrios y Listas personalizadas) */}
          <div
            ref={regionOverflowRef}
            className="relative flex items-center gap-2"
          >
            <span className="text-xs font-semibold text-zinc-600">Región:</span>
            <Switch
              value={selectedRegionFilter}
              onValueChange={(val) => {
                setSelectedRegionFilter(val);
              }}
            >
              <Switch.Option value="Barrios">Barrios</Switch.Option>

              {/* Pestaña de lista personalizada única con dropdown */}
              {activeCustomList && (
                <Switch.Option
                  value={activeCustomList.nombre}
                  onClick={() => {
                    if (
                      selectedRegionFilter === activeCustomList.nombre ||
                      selectedRegionFilter === activeCustomList.id
                    ) {
                      if (hasMultipleLists) {
                        setIsRegionOverflowOpen((prev) => !prev);
                      }
                    } else {
                      setSelectedRegionFilter(activeCustomList.nombre);
                      setIsRegionOverflowOpen(false);
                    }
                  }}
                >
                  <span className="flex items-center gap-1">
                    <span>{activeCustomList.nombre}</span>
                    {hasMultipleLists && (
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform duration-300 ${
                          isRegionOverflowOpen ? "rotate-180" : ""
                        }`}
                      />
                    )}
                  </span>
                </Switch.Option>
              )}
            </Switch>

            {/* Menú desplegable flotante con las demás listas */}
            {hasMultipleLists && isRegionOverflowOpen && (
              <div className="absolute top-full mt-2 right-0 z-50 flex flex-col rounded-2xl border border-gray-200/60 bg-white/90 backdrop-blur-md shadow-[0_7px_50px_0px_rgb(0,0,0,0.1)] min-w-[170px] overflow-hidden transition-all duration-200 ease-out p-1.5 animate-in fade-in zoom-in-95">
                {uniqueListas.map((lista) => {
                  const isSelected =
                    selectedRegionFilter === lista.nombre ||
                    selectedRegionFilter === lista.id;
                  return (
                    <button
                      key={lista.id || lista.nombre}
                      type="button"
                      onClick={() => {
                        setSelectedRegionFilter(lista.nombre);
                        setIsRegionOverflowOpen(false);
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
              </div>
            )}
          </div>
        </div>

        {/* Lado Derecho: Buscador, +, Trash, Exportar - Todos con h-9 y sombra uniforme */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Buscador */}
          <div className="relative flex items-center h-9">
            <input
              type="text"
              placeholder="Buscar marcador..."
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

          {/* Botón + Añadir marcador */}
          <TooltipSign
            label="Añadir marcador en el mapa"
            position="top"
            delayMs={500}
          >
            <button
              type="button"
              onClick={onCreateMarker}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200/60 bg-white/50 text-zinc-700 shadow-[0_7px_50px_0px_rgb(0,0,0,0.1)] backdrop-blur-md hover:bg-white hover:text-zinc-900 transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <Plus className="h-4 w-4" />
            </button>
          </TooltipSign>

          {/* Botón Basura con estados — perfectamente redondo con h-9 w-9 y sombra uniforme */}
          <div className="flex items-center gap-1.5 transition-all duration-200">
            <TooltipSign
              label="Eliminar un marcador"
              position="top"
              delayMs={500}
            >
              <button
                type="button"
                onClick={handleTrashButtonClick}
                className={`flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-200 cursor-pointer shadow-[0_7px_50px_0px_rgb(0,0,0,0.1)] backdrop-blur-md active:scale-95 shrink-0 ${
                  isDeleteMode
                    ? "border-red-200 bg-red-50/90 text-red-600 hover:bg-red-100"
                    : "border-gray-200/60 bg-white/50 text-zinc-700 hover:bg-white hover:text-zinc-900"
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

            {isDeleteMode && (
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
        <div className="rounded-xl border border-gray-200/80 bg-white">
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
                  className={`px-5 py-3.5 text-xs font-bold transition-colors cursor-pointer group select-none hover:bg-zinc-100/80 text-left min-w-[170px] ${
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
                  className={`px-5 py-3.5 text-xs font-bold transition-colors cursor-pointer group select-none hover:bg-zinc-100/80 text-left min-w-[140px] ${
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

                {/* Región — sortable y hover */}
                <th
                  onClick={() => handleSort("region")}
                  className={`px-5 py-3.5 text-xs font-bold transition-colors cursor-pointer group select-none hover:bg-zinc-100/80 text-left min-w-[140px] ${
                    sortField === "region"
                      ? "text-zinc-900 bg-zinc-100/40"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  <div className="flex items-center justify-start gap-1.5">
                    <span className="leading-snug">Región</span>
                    {sortField === "region" ? (
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

                {/* Tipo / Subtipo — sortable, hover y alineado izquierda */}
                <th
                  onClick={() => handleSort("subtipo")}
                  className={`px-5 py-3.5 text-xs font-bold transition-colors cursor-pointer group select-none hover:bg-zinc-100/80 text-left min-w-[150px] ${
                    sortField === "subtipo"
                      ? "text-zinc-900 bg-zinc-100/40"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  <div className="flex items-center justify-start gap-1.5">
                    <span className="leading-snug">Tipo</span>
                    {sortField === "subtipo" ? (
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

                {/* Dirección — hover y alineado izquierda */}
                <th className="px-5 py-3.5 text-xs font-bold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80 transition-colors select-none text-left min-w-[170px]">
                  Dirección
                </th>

                {/* Capacidad — SOLO visible si es Centros de Evacuación */}
                {selectedType === "EVACUACION" && (
                  <th className="px-5 py-3.5 text-xs font-bold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80 transition-colors select-none text-left min-w-[130px]">
                    Capacidad
                  </th>
                )}

                {/* Acciones — hover en cabecera */}
                <th className="w-16 px-3 py-3.5 hover:bg-zinc-100/80 transition-colors" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {sortedMarkers.length === 0 ? (
                <tr>
                  <td
                    colSpan={
                      (isDeleteMode ? 1 : 0) +
                      5 +
                      (selectedType === "EVACUACION" ? 1 : 0) +
                      1
                    }
                    className="py-12 text-center text-xs text-zinc-400 font-medium"
                  >
                    No se encontraron marcadores.
                  </td>
                </tr>
              ) : (
                sortedMarkers.map((marker) => {
                  const isSelected = selectedMarkerId === marker.id;
                  const isChecked = selectedRowIds.has(marker.id);
                  const isEditing = editingRowId === marker.id;
                  const locDisplay =
                    marker.localidad ||
                    resolvedLocalities[marker.id] ||
                    "Corrientes Capital";
                  const regionDisplay =
                    markerRegionMap.get(marker.id) || "Fuera de rango";

                  return (
                    <tr
                      key={marker.id}
                      onClick={() => {
                        if (isEditing) return;
                        if (isDeleteMode) {
                          toggleSelectRow(marker.id);
                        } else {
                          onSelectMarker(marker);
                        }
                      }}
                      className={`group transition-colors cursor-pointer ${
                        isEditing
                          ? "bg-amber-50/60"
                          : isSelected
                            ? "bg-blue-50/90 font-bold"
                            : isChecked
                              ? "bg-red-50/50"
                              : "hover:bg-zinc-50/80"
                      }`}
                    >
                      {isDeleteMode && (
                        <td
                          className="px-4 py-3 text-left"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectRow(marker.id)}
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
                          marker.nombre
                        )}
                      </td>

                      {/* Localidad — alineado a la izquierda */}
                      <td className="px-5 py-3 text-zinc-600 font-medium text-left">
                        {locDisplay}
                      </td>

                      {/* Región — polígono calculado o Fuera de rango */}
                      <td className="px-5 py-3 text-zinc-600 font-medium text-left">
                        <span
                          className={
                            regionDisplay === "Fuera de rango"
                              ? "text-zinc-400 italic"
                              : "text-zinc-700 font-semibold"
                          }
                        >
                          {regionDisplay}
                        </span>
                      </td>

                      {/* Tipo — Custom Dropdown estilizado */}
                      <td className="px-5 py-3 text-zinc-600 font-medium text-left">
                        {isEditing ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isTypeDropdownOpen) {
                                setIsTypeDropdownOpen(false);
                                setTypeDropdownPos(null);
                              } else {
                                const rect =
                                  e.currentTarget.getBoundingClientRect();
                                const spaceBelow =
                                  window.innerHeight - rect.bottom;
                                const showAbove = spaceBelow < 220;
                                setTypeDropdownPos({
                                  top: showAbove
                                    ? rect.top - 210
                                    : rect.bottom + 4,
                                  left: rect.left,
                                  width: Math.max(rect.width, 180),
                                  marker,
                                });
                                setIsTypeDropdownOpen(true);
                              }
                            }}
                            className="w-full flex items-center justify-between gap-2 rounded-xl border border-gray-300 bg-white shadow-2xs px-3 py-1.5 text-xs font-semibold text-zinc-800 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 transition-all cursor-pointer hover:border-gray-400"
                          >
                            <span className="truncate">
                              {marker.category === "EVACUACION"
                                ? (
                                    SAFE_ZONE_TYPE_LABELS as Record<
                                      string,
                                      string
                                    >
                                  )[editTipo] || editTipo
                                : (
                                    HEALTH_CENTER_TYPE_LABELS as Record<
                                      string,
                                      string
                                    >
                                  )[editTipo] || editTipo}
                            </span>
                            <ChevronDown
                              className={`h-3.5 w-3.5 text-zinc-500 shrink-0 transition-transform duration-200 ${
                                isTypeDropdownOpen ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                        ) : (
                          marker.subtipo
                        )}
                      </td>

                      {/* Dirección — alineado a la izquierda */}
                      <td className="px-5 py-3 text-zinc-500 font-medium text-left">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editDireccion}
                            onChange={(e) => setEditDireccion(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full rounded-xl border border-gray-300 bg-white/90 shadow-2xs px-3 py-1.5 text-xs text-zinc-700 font-medium outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 transition-all"
                          />
                        ) : (
                          marker.direccion || "-"
                        )}
                      </td>

                      {/* Capacidad — SOLO visible si es Centros de Evacuación */}
                      {selectedType === "EVACUACION" && (
                        <td className="px-5 py-3 text-zinc-700 font-bold text-left">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              value={editCapacidad}
                              onChange={(e) => setEditCapacidad(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              placeholder="0"
                              className="w-24 rounded-xl border border-gray-300 bg-white/90 shadow-2xs px-3 py-1.5 text-xs text-zinc-700 font-bold outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 transition-all"
                            />
                          ) : marker.capacidad_maxima !== null &&
                            marker.capacidad_maxima !== undefined ? (
                            marker.capacidad_maxima.toLocaleString("es-AR")
                          ) : (
                            "-"
                          )}
                        </td>
                      )}

                      {/* Acciones — botones redondos con color de fuente normal */}
                      <td
                        className="px-3 py-3 text-left relative"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isEditing ? (
                          <div className="flex items-center justify-start gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleConfirmEdit(marker)}
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
                              if (activeMenuData?.marker.id === marker.id) {
                                setActiveMenuData(null);
                              } else {
                                const spaceBelow =
                                  window.innerHeight - rect.bottom;
                                const showAbove = spaceBelow < 140;
                                setActiveMenuData({
                                  marker,
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
                })
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
              onSelectMarker(activeMenuData.marker);
              setActiveMenuData(null);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
          >
            <MapPin className="h-3.5 w-3.5 text-zinc-500" />
            <span>Ver en mapa</span>
          </button>
          {onUpdateMarker && (
            <button
              onClick={() => {
                handleStartEdit(activeMenuData.marker);
                setActiveMenuData(null);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
            >
              <Pencil className="h-3.5 w-3.5 text-zinc-500" />
              <span>Editar</span>
            </button>
          )}
          <button
            onClick={async () => {
              const idToDelete = activeMenuData.marker.id;
              setActiveMenuData(null);
              await onDeleteMarkers([idToDelete]);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Eliminar</span>
          </button>
        </div>
      )}

      {/* Menú desplegable flotante fijo para Tipo (libre de recortes de tabla) */}
      {isTypeDropdownOpen && typeDropdownPos && editingRowId && (
        <div
          ref={typeDropdownRef}
          style={{
            position: "fixed",
            top: `${typeDropdownPos.top}px`,
            left: `${typeDropdownPos.left}px`,
            width: `${typeDropdownPos.width}px`,
            zIndex: 9999,
          }}
          onClick={(e) => e.stopPropagation()}
          className="max-h-56 overflow-y-auto custom-scrollbar rounded-2xl border border-gray-200/90 bg-white/95 backdrop-blur-md shadow-2xl p-1.5 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-150"
        >
          {typeDropdownPos.marker.category === "EVACUACION"
            ? Object.entries(SAFE_ZONE_TYPE_LABELS).map(([key, label]) => {
                const isSelected = editTipo === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setEditTipo(key);
                      setIsTypeDropdownOpen(false);
                      setTypeDropdownPos(null);
                    }}
                    className={`flex items-center justify-between rounded-xl px-3.5 py-2 text-xs text-left transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-zinc-100 font-bold text-zinc-950 shadow-2xs"
                        : "text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 font-medium"
                    }`}
                  >
                    <span>{label}</span>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-zinc-900 ml-2" />
                    )}
                  </button>
                );
              })
            : Object.entries(HEALTH_CENTER_TYPE_LABELS).map(([key, label]) => {
                const isSelected = editTipo === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setEditTipo(key);
                      setIsTypeDropdownOpen(false);
                      setTypeDropdownPos(null);
                    }}
                    className={`flex items-center justify-between rounded-xl px-3.5 py-2 text-xs text-left transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-zinc-100 font-bold text-zinc-950 shadow-2xs"
                        : "text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 font-medium"
                    }`}
                  >
                    <span>{label}</span>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-zinc-900 ml-2" />
                    )}
                  </button>
                );
              })}
        </div>
      )}

      {/* Modal de confirmación de eliminación masiva */}
      {showConfirmDeleteModal && (
        <div className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/30 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-3">
            <h3 className="text-base font-bold text-zinc-900">
              ¿Eliminar marcadores?
            </h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Estás por eliminar{" "}
              <strong>{selectedRowIds.size} marcadores</strong> seleccionados.
              Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2.5 mt-2">
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
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
