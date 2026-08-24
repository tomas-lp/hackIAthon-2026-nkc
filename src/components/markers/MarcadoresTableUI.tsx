"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { MarkerRow } from "@/types/marker";
import {
  Search,
  Plus,
  Trash2,
  Download,
  MoreHorizontal,
  ChevronDown,
  MapPin,
  Check,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
} from "lucide-react";
import { TooltipSign } from "@/components/ui/TooltipSign";

export type SortField =
  "nombre" | "localidad" | "subtipo" | "direccion" | "capacidad_maxima";

export type SortOrder = "asc" | "desc";

interface MarcadoresTableUIProps {
  markers: MarkerRow[];
  activeCategoryFilter: string;
  onCategoryFilterChange: (cat: string) => void;
  onSelectMarker: (marker: MarkerRow) => void;
  onCreateMarker: () => void;
  onDeleteMarkers: (ids: string[]) => Promise<void>;
  selectedMarkerId: string | null;
}

// Cache local de localidades resueltas
const localityCache = new Map<string, string>();

export function MarcadoresTableUI({
  markers,
  activeCategoryFilter,
  onCategoryFilterChange,
  onSelectMarker,
  onCreateMarker,
  onDeleteMarkers,
  selectedMarkerId,
}: MarcadoresTableUIProps) {
  const [selectedType, setSelectedType] = useState<string>(
    activeCategoryFilter === "TODOS" ? "TODOS" : activeCategoryFilter
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [activeRowMenuId, setActiveRowMenuId] = useState<string | null>(null);
  const [resolvedLocalities, setResolvedLocalities] = useState<
    Record<string, string>
  >({});
  const [sortField, setSortField] = useState<SortField>("nombre");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const typeDropdownRef = useRef<HTMLDivElement>(null);
  const rowMenuRef = useRef<HTMLDivElement>(null);

  // Sincronizar estado si cambia desde el padre
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedType(
      activeCategoryFilter === "TODOS" ? "TODOS" : activeCategoryFilter
    );
  }, [activeCategoryFilter]);

  // Click outside para cerrar dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        typeDropdownRef.current &&
        !typeDropdownRef.current.contains(event.target as Node)
      ) {
        setIsTypeDropdownOpen(false);
      }
      if (
        rowMenuRef.current &&
        !rowMenuRef.current.contains(event.target as Node)
      ) {
        setActiveRowMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Opciones de tipos de marcadores
  const typeOptions = useMemo(() => {
    return [
      { id: "TODOS", label: "Todas las listas" },
      { id: "EVACUACION", label: "Centros de evacuación" },
      { id: "SALUD", label: "Centros de salud" },
    ];
  }, []);

  const currentTypeLabel = useMemo(() => {
    return (
      typeOptions.find((t) => t.id === selectedType || t.label === selectedType)
        ?.label || "Todas las listas"
    );
  }, [typeOptions, selectedType]);

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

  // Filtrado
  const filteredMarkers = useMemo(() => {
    return markers.filter((item) => {
      if (selectedType !== "TODOS") {
        if (item.category !== selectedType) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const loc = item.localidad || resolvedLocalities[item.id] || "";
        const dir = item.direccion || "";
        const matchName = item.nombre.toLowerCase().includes(query);
        const matchLoc = loc.toLowerCase().includes(query);
        const matchDir = dir.toLowerCase().includes(query);
        const matchSub = item.subtipo.toLowerCase().includes(query);
        if (!matchName && !matchLoc && !matchDir && !matchSub) {
          return false;
        }
      }

      return true;
    });
  }, [markers, selectedType, searchQuery, resolvedLocalities]);

  // Manejo de ordenamiento dinámico con ciclo de 3 estados
  const handleSort = (field: SortField) => {
    if (field === "nombre") {
      if (sortField === "nombre") {
        setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortField("nombre");
        setSortOrder("asc");
      }
      return;
    }

    if (sortField === field) {
      const primaryOrder: SortOrder = field === "localidad" ? "asc" : "desc";
      if (sortOrder === primaryOrder) {
        setSortOrder(primaryOrder === "asc" ? "desc" : "asc");
      } else {
        setSortField("nombre");
        setSortOrder("asc");
      }
    } else {
      setSortField(field);
      setSortOrder(field === "localidad" ? "asc" : "desc");
    }
  };

  const sortedMarkers = useMemo(() => {
    return [...filteredMarkers].sort((a, b) => {
      let valA: string | number | null = null;
      let valB: string | number | null = null;

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
        case "subtipo":
          valA = a.subtipo;
          valB = b.subtipo;
          break;
        case "direccion":
          valA = a.direccion || "";
          valB = b.direccion || "";
          break;
        case "capacidad_maxima":
          valA = a.capacidad_maxima ?? -1;
          valB = b.capacidad_maxima ?? -1;
          break;
      }

      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === "string" && typeof valB === "string") {
        const cmp = valA.localeCompare(valB, "es", { sensitivity: "base" });
        return sortOrder === "asc" ? cmp : -cmp;
      }

      if (typeof valA === "number" && typeof valB === "number") {
        return sortOrder === "asc" ? valA - valB : valB - valA;
      }

      return 0;
    });
  }, [filteredMarkers, sortField, sortOrder, resolvedLocalities]);

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
      "Departamento",
      "Dirección",
      "Capacidad máxima",
      "Latitud",
      "Longitud",
      "Fecha de registro",
    ];

    const rows = sortedMarkers.map((m) => {
      const loc =
        m.localidad || resolvedLocalities[m.id] || "Corrientes Capital";
      const catLabel =
        m.category === "EVACUACION"
          ? "Centro de evacuación"
          : "Centro de atención médica";
      return [
        `"${m.nombre.replace(/"/g, '""')}"`,
        `"${catLabel}"`,
        `"${m.subtipo.replace(/"/g, '""')}"`,
        `"${loc.replace(/"/g, '""')}"`,
        `"${(m.departamento || "").replace(/"/g, '""')}"`,
        `"${(m.direccion || "").replace(/"/g, '""')}"`,
        m.capacidad_maxima !== null && m.capacidad_maxima !== undefined
          ? m.capacidad_maxima
          : "",
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
    <div className="flex flex-col h-full min-h-0 gap-6 w-full max-w-5xl mx-auto p-4 sm:p-6 font-sans">
      {/* Encabezado: Título y Controles */}
      <div className="flex-shrink-0 flex flex-col gap-4">
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">
          Marcadores
        </h1>

        {/* Barra de Filtros y Acciones */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Lado Izquierdo: Filtro Tipo */}
          <div className="flex items-center gap-2 relative">
            <span className="text-sm font-semibold text-zinc-900">Tipo</span>
            <div ref={typeDropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setIsTypeDropdownOpen((prev) => !prev)}
                className="flex items-center justify-between gap-3 rounded-full border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-zinc-800 shadow-xs hover:bg-gray-50 transition-colors cursor-pointer min-w-[140px]"
              >
                <span>{currentTypeLabel}</span>
                <ChevronDown className="h-4 w-4 text-zinc-500" />
              </button>

              {isTypeDropdownOpen && (
                <div className="absolute left-0 top-full mt-1 z-50 w-52 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                  {typeOptions.map((opt, idx) => {
                    const isSelected = selectedType === opt.id;
                    return (
                      <button
                        key={`${opt.id}-${idx}`}
                        onClick={() => {
                          setSelectedType(opt.id);
                          setIsTypeDropdownOpen(false);
                          onCategoryFilterChange(opt.id);
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-left transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-zinc-100 font-bold text-zinc-900"
                            : "text-zinc-700 hover:bg-zinc-50"
                        }`}
                      >
                        <span>{opt.label}</span>
                        {isSelected && (
                          <Check className="h-3.5 w-3.5 text-zinc-900" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Lado Derecho: Buscador, +, Trash, Exportar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Buscador */}
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-full border border-gray-300 bg-white pl-4 pr-10 py-1.5 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400 transition-all w-44 sm:w-56"
              />
              <button
                type="button"
                className="absolute right-1 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
              >
                <Search className="h-4 w-4" />
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
                className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white text-zinc-800 shadow-xs hover:bg-gray-50 transition-colors cursor-pointer shrink-0"
              >
                <Plus className="h-4 w-4" />
              </button>
            </TooltipSign>

            {/* Botón Basura con estados */}
            <div className="flex items-center gap-1.5 transition-all duration-200">
              <TooltipSign
                label="Eliminar un marcador"
                position="top"
                delayMs={500}
              >
                <button
                  type="button"
                  onClick={handleTrashButtonClick}
                  className={`flex h-9 items-center justify-center rounded-full border px-3 transition-all duration-200 cursor-pointer shadow-xs ${
                    isDeleteMode
                      ? "border-red-300 bg-red-50 text-red-600 hover:bg-red-100"
                      : "border-gray-300 bg-white text-zinc-800 hover:bg-gray-50"
                  }`}
                >
                  <Trash2 className="h-4 w-4" />
                  {isDeleteMode && selectedRowIds.size > 0 && (
                    <span className="ml-1.5 text-xs font-bold animate-in fade-in duration-150">
                      {selectedRowIds.size}
                    </span>
                  )}
                </button>
              </TooltipSign>

              {isDeleteMode && (
                <button
                  type="button"
                  onClick={handleCancelDeleteMode}
                  className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-gray-50 transition-all duration-150 animate-in fade-in cursor-pointer"
                >
                  Cancelar
                </button>
              )}
            </div>

            {/* Botón Exportar */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-1.5 text-sm font-semibold text-zinc-800 shadow-xs hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Exportar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de Marcadores */}
      <div
        id="marcadores-table-card"
        className="flex-1 min-h-0 w-full rounded-3xl border border-gray-200 bg-white shadow-xs overflow-hidden flex flex-col"
      >
        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto">
          <table className="w-full text-left text-sm relative border-collapse">
            <thead className="sticky top-0 z-20 bg-white shadow-xs">
              <tr className="border-b border-gray-200 bg-white select-none">
                {isDeleteMode && (
                  <th className="w-12 px-4 py-3.5 text-center animate-in fade-in duration-200">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-gray-300 text-zinc-900 focus:ring-zinc-500 cursor-pointer"
                    />
                  </th>
                )}

                {/* Nombre */}
                <th
                  onClick={() => handleSort("nombre")}
                  className={`px-6 py-4 font-bold transition-colors cursor-pointer group select-none hover:bg-zinc-100/80 ${
                    sortField === "nombre"
                      ? "text-zinc-900"
                      : "text-zinc-700 hover:text-zinc-900"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="leading-snug">Nombre</span>
                    {sortField === "nombre" ? (
                      sortOrder === "asc" ? (
                        <ArrowDown className="h-3.5 w-3.5 text-zinc-900 shrink-0" />
                      ) : (
                        <ArrowUp className="h-3.5 w-3.5 text-zinc-900 shrink-0" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 text-zinc-400 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
                    )}
                  </div>
                </th>

                {/* Localidad */}
                <th
                  onClick={() => handleSort("localidad")}
                  className={`px-6 py-4 font-bold transition-colors cursor-pointer group select-none hover:bg-zinc-100/80 ${
                    sortField === "localidad"
                      ? "text-zinc-900"
                      : "text-zinc-700 hover:text-zinc-900"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="leading-snug">Localidad</span>
                    {sortField === "localidad" ? (
                      sortOrder === "asc" ? (
                        <ArrowDown className="h-3.5 w-3.5 text-zinc-900 shrink-0" />
                      ) : (
                        <ArrowUp className="h-3.5 w-3.5 text-zinc-900 shrink-0" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 text-zinc-400 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
                    )}
                  </div>
                </th>

                {/* Tipo / Subtipo */}
                <th
                  onClick={() => handleSort("subtipo")}
                  className={`px-6 py-4 font-bold transition-colors cursor-pointer group select-none hover:bg-zinc-100/80 ${
                    sortField === "subtipo"
                      ? "text-zinc-900"
                      : "text-zinc-700 hover:text-zinc-900"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="leading-snug">Tipo</span>
                    {sortField === "subtipo" ? (
                      sortOrder === "asc" ? (
                        <ArrowDown className="h-3.5 w-3.5 text-zinc-900 shrink-0" />
                      ) : (
                        <ArrowUp className="h-3.5 w-3.5 text-zinc-900 shrink-0" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 text-zinc-400 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
                    )}
                  </div>
                </th>

                {/* Dirección */}
                <th
                  onClick={() => handleSort("direccion")}
                  className={`px-6 py-4 font-bold transition-colors cursor-pointer group select-none hover:bg-zinc-100/80 ${
                    sortField === "direccion"
                      ? "text-zinc-900"
                      : "text-zinc-700 hover:text-zinc-900"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="leading-snug">Dirección</span>
                    {sortField === "direccion" ? (
                      sortOrder === "asc" ? (
                        <ArrowDown className="h-3.5 w-3.5 text-zinc-900 shrink-0" />
                      ) : (
                        <ArrowUp className="h-3.5 w-3.5 text-zinc-900 shrink-0" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 text-zinc-400 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
                    )}
                  </div>
                </th>

                {/* Capacidad */}
                <th
                  onClick={() => handleSort("capacidad_maxima")}
                  className={`px-4 py-4 font-bold text-center transition-colors cursor-pointer group select-none hover:bg-zinc-100/80 ${
                    sortField === "capacidad_maxima"
                      ? "text-zinc-900"
                      : "text-zinc-700 hover:text-zinc-900"
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="leading-snug text-center">
                      Capacidad
                      <br />
                      máxima
                    </span>
                    {sortField === "capacidad_maxima" ? (
                      sortOrder === "desc" ? (
                        <ArrowDown className="h-3.5 w-3.5 text-zinc-900 shrink-0" />
                      ) : (
                        <ArrowUp className="h-3.5 w-3.5 text-zinc-900 shrink-0" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 text-zinc-400 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
                    )}
                  </div>
                </th>

                {/* Acciones */}
                <th className="w-16 px-4 py-4 font-bold text-center text-zinc-400">
                  ...
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedMarkers.length === 0 ? (
                <tr>
                  <td
                    colSpan={isDeleteMode ? 7 : 6}
                    className="py-12 text-center text-zinc-400 font-medium"
                  >
                    No se encontraron marcadores.
                  </td>
                </tr>
              ) : (
                sortedMarkers.map((marker) => {
                  const isSelected = selectedMarkerId === marker.id;
                  const isChecked = selectedRowIds.has(marker.id);
                  const locDisplay =
                    marker.localidad ||
                    resolvedLocalities[marker.id] ||
                    "Corrientes Capital";

                  return (
                    <tr
                      key={marker.id}
                      onClick={() => {
                        if (isDeleteMode) {
                          toggleSelectRow(marker.id);
                        } else {
                          onSelectMarker(marker);
                        }
                      }}
                      className={`group transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-zinc-100 font-semibold"
                          : isChecked
                            ? "bg-red-50/50"
                            : "hover:bg-zinc-50"
                      }`}
                    >
                      {isDeleteMode && (
                        <td
                          className="px-4 py-3.5 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectRow(marker.id)}
                            className="h-4 w-4 rounded border-gray-300 text-zinc-900 focus:ring-zinc-500 cursor-pointer"
                          />
                        </td>
                      )}

                      {/* Nombre */}
                      <td className="px-6 py-4 font-medium text-zinc-900">
                        {marker.nombre}
                      </td>

                      {/* Localidad */}
                      <td className="px-6 py-4 text-zinc-600">{locDisplay}</td>

                      {/* Tipo */}
                      <td className="px-6 py-4 text-zinc-600">
                        {marker.subtipo}
                      </td>

                      {/* Dirección */}
                      <td className="px-6 py-4 text-zinc-600">
                        {marker.direccion || "-"}
                      </td>

                      {/* Capacidad */}
                      <td className="px-4 py-4 text-center text-zinc-600">
                        {marker.capacidad_maxima !== null &&
                        marker.capacidad_maxima !== undefined
                          ? marker.capacidad_maxima
                          : "-"}
                      </td>

                      {/* Acciones */}
                      <td
                        className="px-4 py-4 text-center relative"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setActiveRowMenuId((prev) =>
                              prev === marker.id ? null : marker.id
                            )
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800 transition-colors cursor-pointer mx-auto"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>

                        {activeRowMenuId === marker.id && (
                          <div
                            ref={rowMenuRef}
                            className="absolute right-4 top-10 z-50 w-36 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150"
                          >
                            <button
                              onClick={() => {
                                onSelectMarker(marker);
                                setActiveRowMenuId(null);
                              }}
                              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
                            >
                              <MapPin className="h-3.5 w-3.5 text-zinc-500" />
                              <span>Ver en mapa</span>
                            </button>
                            <button
                              onClick={async () => {
                                setActiveRowMenuId(null);
                                await onDeleteMarkers([marker.id]);
                              }}
                              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Eliminar</span>
                            </button>
                          </div>
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

      {/* Modal de confirmación de eliminación masiva */}
      {showConfirmDeleteModal && (
        <div className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-zinc-900 mb-2">
              ¿Eliminar marcadores?
            </h3>
            <p className="text-xs text-zinc-600 mb-5 leading-relaxed">
              Estás por eliminar{" "}
              <strong>{selectedRowIds.size} marcadores</strong> seleccionados.
              Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmDeleteModal(false)}
                className="flex w-1/2 items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-zinc-700 shadow-xs hover:bg-gray-50 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="flex w-1/2 items-center justify-center gap-2 rounded-full border border-red-300 bg-red-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-red-700 transition-all cursor-pointer"
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
