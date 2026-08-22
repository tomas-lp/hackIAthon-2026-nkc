"use client";

import { useEffect, useMemo, useState } from "react";
import { RegionLista, RegionPersonalizada } from "@/types/region";
import { Report } from "@/types/report";
import { isPointInPolygon } from "@/lib/geometry";
import {
  Search,
  Plus,
  Trash2,
  Download,
  MoreHorizontal,
  ChevronDown,
  X,
  MapPin,
  Check,
} from "lucide-react";

interface RegionsTableUIProps {
  regiones: RegionPersonalizada[];
  listas: RegionLista[];
  reports: Report[]; // Reportes activos
  allReports: Report[]; // Todos los reportes (de siempre)
  activeListFilter: string;
  onListFilterChange: (listName: string) => void;
  onSelectRegion: (id: string) => void;
  onCreateRegion: () => void;
  onDeleteRegions: (ids: string[]) => Promise<void>;
  selectedRegionId: string | null;
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
  activeListFilter,
  onListFilterChange,
  onSelectRegion,
  onCreateRegion,
  onDeleteRegions,
  selectedRegionId,
}: RegionsTableUIProps) {
  const [selectedType, setSelectedType] = useState<string>(
    activeListFilter === "Todo" ? "TODOS" : activeListFilter
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

  // Mantener sincronizado selectedType si cambia activeListFilter desde el header
  useEffect(() => {
    if (activeListFilter === "Todo") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedType("TODOS");
    } else {
      setSelectedType(activeListFilter);
    }
  }, [activeListFilter]);

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

  // Calcular estadísticas reales por polígono
  const regionesConStats = useMemo(() => {
    return regiones.map((region) => {
      // 2.b: Cantidad total de reclamos (históricos / de siempre) dentro del polígono
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

      // 2.d: Cantidad de reclamos activos dentro del polígono
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
      const localidad = resolvedLocalities[region.id] || defaultLoc;

      return {
        ...region,
        localidad,
        cantidadReclamos: totalReclamos,
        ultimaAyuda: null as string | null, // 2.c: null por ahora
        reclamosActivos,
      };
    });
  }, [regiones, allReports, reports, resolvedLocalities]);

  // Filtrado por Tipo/Lista y Buscador
  const filteredRegiones = useMemo(() => {
    return regionesConStats.filter((item) => {
      if (selectedType !== "TODOS") {
        if (selectedType === "Barrios") {
          return false;
        } else if (
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
  }, [regionesConStats, selectedType, searchQuery]);

  // Manejo de checkboxes
  const isAllSelected =
    filteredRegiones.length > 0 &&
    filteredRegiones.every((r) => selectedRowIds.has(r.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(filteredRegiones.map((r) => r.id)));
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

  // Exportar a Excel (CSV con UTF-8 BOM y datos reales)
  const handleExportExcel = () => {
    if (filteredRegiones.length === 0) {
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

    const rows = filteredRegiones.map((r) => [
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

  const typeOptions = useMemo(() => {
    const baseOptions = [
      { id: "TODOS", label: "Todas las listas" },
      { id: "Barrios", label: "Barrios (API)" },
    ];
    const seen = new Set<string>();
    seen.add("TODOS");
    seen.add("Barrios");

    const listOpts: { id: string; label: string }[] = [];
    for (const l of listas) {
      const key = l.id || l.nombre;
      if (!seen.has(key) && !seen.has(l.nombre)) {
        seen.add(key);
        seen.add(l.nombre);
        listOpts.push({ id: l.id || l.nombre, label: l.nombre });
      }
    }
    return [...baseOptions, ...listOpts];
  }, [listas]);

  const currentTypeLabel =
    typeOptions.find((t) => t.id === selectedType || t.label === selectedType)
      ?.label || "Todas las listas";

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto p-4 sm:p-6 font-sans">
      {/* Encabezado: Título y Controles */}
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">
          Regiones
        </h1>

        {/* Barra de Filtros y Acciones */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Lado Izquierdo: Filtro Tipo */}
          <div className="flex items-center gap-2 relative">
            <span className="text-sm font-semibold text-zinc-900">Tipo</span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsTypeDropdownOpen((prev) => !prev)}
                className="flex items-center justify-between gap-3 rounded-full border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-zinc-800 shadow-xs hover:bg-gray-50 transition-colors cursor-pointer min-w-[140px]"
              >
                <span>{currentTypeLabel}</span>
                <ChevronDown className="h-4 w-4 text-zinc-500" />
              </button>

              {isTypeDropdownOpen && (
                <div className="absolute left-0 top-full mt-1 z-50 w-48 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                  {typeOptions.map((opt, idx) => {
                    const isSelected =
                      selectedType === opt.id || selectedType === opt.label;
                    return (
                      <button
                        key={`${opt.id}-${idx}`}
                        onClick={() => {
                          setSelectedType(opt.id);
                          setIsTypeDropdownOpen(false);
                          onListFilterChange(
                            opt.id === "TODOS" ? "Todo" : opt.label
                          );
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

            {/* Botón + Crear nueva región en mapa */}
            <button
              type="button"
              onClick={onCreateRegion}
              title="Crear nueva región en mapa"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white text-zinc-800 shadow-xs hover:bg-gray-50 transition-colors cursor-pointer shrink-0"
            >
              <Plus className="h-4 w-4" />
            </button>

            {/* Botón Basura con estados y animaciones */}
            <div className="flex items-center gap-1.5 transition-all duration-200">
              <button
                type="button"
                onClick={handleTrashButtonClick}
                title={
                  isDeleteMode
                    ? "Confirmar eliminación de seleccionados"
                    : "Modo eliminar regiones"
                }
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

      {/* Tabla de Regiones */}
      <div className="w-full overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-white">
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
                <th className="px-6 py-3.5 font-bold text-zinc-900">Nombre</th>
                <th className="px-6 py-3.5 font-bold text-zinc-900">
                  Localidad
                </th>
                <th className="px-6 py-3.5 font-bold text-zinc-900">
                  Cantidad de reclamos
                </th>
                <th className="px-6 py-3.5 font-bold text-zinc-900">
                  Última ayuda
                </th>
                <th className="px-6 py-3.5 font-bold text-zinc-900">
                  Reclamos activos
                </th>
                <th className="w-12 px-4 py-3.5 text-center"></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {filteredRegiones.length === 0 ? (
                <tr>
                  <td
                    colSpan={isDeleteMode ? 7 : 6}
                    className="px-6 py-12 text-center text-zinc-400"
                  >
                    No se encontraron regiones creadas.
                  </td>
                </tr>
              ) : (
                filteredRegiones.map((region) => {
                  const isChecked = selectedRowIds.has(region.id);
                  const isSelected = selectedRegionId === region.id;

                  return (
                    <tr
                      key={region.id}
                      onClick={() => {
                        if (isDeleteMode) {
                          toggleSelectRow(region.id);
                        } else {
                          onSelectRegion(region.id);
                        }
                      }}
                      className={`group transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-zinc-100"
                          : isChecked
                            ? "bg-red-50/60"
                            : "hover:bg-zinc-50/80"
                      }`}
                    >
                      {/* Checkbox (solo visible en modo eliminación) */}
                      {isDeleteMode && (
                        <td
                          className="px-4 py-4 text-center animate-in fade-in duration-200"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectRow(region.id)}
                            className="h-4 w-4 rounded border-gray-300 text-zinc-900 focus:ring-zinc-500 cursor-pointer"
                          />
                        </td>
                      )}

                      {/* Nombre */}
                      <td className="px-6 py-4 font-medium text-zinc-800">
                        {region.nombre}
                      </td>

                      {/* Localidad */}
                      <td className="px-6 py-4 text-zinc-700">
                        {region.localidad}
                      </td>

                      {/* Cantidad de reclamos (históricos de siempre) */}
                      <td className="px-6 py-4 text-zinc-700">
                        {region.cantidadReclamos}
                      </td>

                      {/* Última ayuda (null) */}
                      <td className="px-6 py-4 text-zinc-400">
                        {region.ultimaAyuda ?? "-"}
                      </td>

                      {/* Reclamos activos (cantidad numérica de reclamos activos) */}
                      <td className="px-6 py-4 text-zinc-700 font-medium">
                        {region.reclamosActivos}
                      </td>

                      {/* Opciones ... */}
                      <td
                        className="px-4 py-4 text-center relative"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setActiveRowMenuId((prev) =>
                              prev === region.id ? null : region.id
                            )
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-gray-200 hover:text-zinc-800 transition-colors cursor-pointer mx-auto"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>

                        {activeRowMenuId === region.id && (
                          <div className="absolute right-4 top-full mt-1 z-50 w-36 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                            <button
                              onClick={() => {
                                onSelectRegion(region.id);
                                setActiveRowMenuId(null);
                              }}
                              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                            >
                              <MapPin className="h-3.5 w-3.5" />
                              Ver en mapa
                            </button>
                            <button
                              onClick={async () => {
                                setActiveRowMenuId(null);
                                await onDeleteRegions([region.id]);
                              }}
                              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Eliminar
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

      {/* Modal de confirmación para borrado */}
      {showConfirmDeleteModal && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/30 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-gray-200 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-900">
                Confirmar eliminación
              </h3>
              <button
                onClick={() => setShowConfirmDeleteModal(false)}
                className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-zinc-600">
              ¿Estás seguro de que deseas eliminar {selectedRowIds.size} región
              {selectedRowIds.size > 1 ? "es" : ""}? Esta acción no se puede
              deshacer.
            </p>
            <div className="flex items-center justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => setShowConfirmDeleteModal(false)}
                className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-gray-50 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-red-700 transition cursor-pointer"
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
