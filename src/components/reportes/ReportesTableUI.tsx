"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { Report } from "@/types/report";
import {
  Search,
  Trash2,
  Download,
  MoreHorizontal,
  Tag,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
} from "lucide-react";
import { TooltipSign } from "@/components/ui/TooltipSign";
import { Switch } from "@/components/ui/Switch";
import { RangeCalendarModal } from "@/components/statistics/_parts/RangeCalendarModal";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import {
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
  useTable,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  AsignarEstadoModal,
  EstadoPreset,
  pickCustomColor,
  CUSTOM_TAG_COLORS,
} from "./AsignarEstadoModal";

const INITIAL_PRESETS: EstadoPreset[] = [
  {
    label: "Pendiente",
    color:
      "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700/50",
  },
  {
    label: "En revision",
    color:
      "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700/50",
  },
  {
    label: "Resuelto",
    color:
      "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/50",
  },
  {
    label: "Descartado",
    color:
      "bg-zinc-100 dark:bg-zinc-800/60 text-zinc-500 dark:text-slate-400 border-zinc-200 dark:border-zinc-600/50",
  },
];

const TIPO_LABELS: Record<string, string> = {
  INUNDACION_URBANA: "Inundación urbana",
  LLUVIAS_FUERTES: "Lluvias fuertes",
  GRANIZO: "Granizo",
  ANEGAMIENTO_VIVIENDA: "Anegamiento",
};

type PeriodoFilter = "HOY" | "7DIAS" | "RANGO";

const tableFeaturesConfig = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: {
    text: sortFn_text,
    alphanumeric: sortFn_alphanumeric,
  },
});

interface ReportesTableUIProps {
  reports: Report[];
  estadosMap: Map<string, string>;
  onDeleteReports: (ids: string[]) => Promise<void>;
  onAssignEstado: (id: string, estado: string) => void;
}

export function ReportesTableUI({
  reports,
  estadosMap,
  onDeleteReports,
  onAssignEstado,
}: ReportesTableUIProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [isTagMode, setIsTagMode] = useState(false);

  // Selección compartida entre modos
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [showTagEstadoModal, setShowTagEstadoModal] = useState(false);

  // Estado de presets — compartido entre ambos modales
  const [estadosPreset, setEstadosPreset] =
    useState<EstadoPreset[]>(INITIAL_PRESETS);

  const handleAddEstadoPreset = (preset: EstadoPreset) => {
    setEstadosPreset((prev) => {
      if (prev.some((p) => p.label === preset.label)) return prev;
      const usedColors = new Set(prev.map((p) => p.color));
      // Si el preset ya viene con un color no usado, respetarlo
      let chosenColor: string | undefined = !usedColors.has(preset.color)
        ? preset.color
        : undefined;
      if (!chosenColor) {
        chosenColor = CUSTOM_TAG_COLORS.find((c) => !usedColors.has(c));
      }
      // Si todos los colores del set ya fueron usados al menos una vez, buscar el menos usado
      if (!chosenColor) {
        const usageCount = new Map<string, number>();
        CUSTOM_TAG_COLORS.forEach((c) => usageCount.set(c, 0));
        prev.forEach((p) => {
          if (usageCount.has(p.color)) {
            usageCount.set(p.color, (usageCount.get(p.color) || 0) + 1);
          }
        });
        let minCount = Infinity;
        for (const c of CUSTOM_TAG_COLORS) {
          const count = usageCount.get(c) || 0;
          if (count < minCount) {
            minCount = count;
            chosenColor = c;
          }
        }
      }
      return [
        ...prev,
        {
          label: preset.label,
          color: chosenColor ?? pickCustomColor(prev.length),
        },
      ];
    });
  };

  const handleDeleteEstadoPresets = (labels: string[]) => {
    setEstadosPreset((prev) => prev.filter((p) => !labels.includes(p.label)));
  };

  // Period filter
  const [periodoFilter, setPeriodoFilter] = useState<PeriodoFilter>("7DIAS");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  const [activeMenuData, setActiveMenuData] = useState<{
    report: Report;
    top: number;
    right: number;
  } | null>(null);

  const [estadoModalData, setEstadoModalData] = useState<{
    reportId: string;
    currentEstado: string | null;
  } | null>(null);

  const rowMenuRef = useRef<HTMLDivElement>(null);

  const showCheckboxes = isDeleteMode || isTagMode;

  // Cerrar menú en click fuera o scroll
  useEffect(() => {
    function handleClose(event: Event) {
      if (
        rowMenuRef.current &&
        !rowMenuRef.current.contains(event.target as Node)
      ) {
        setActiveMenuData(null);
      }
    }
    document.addEventListener("mousedown", handleClose);
    window.addEventListener("scroll", handleClose, true);
    return () => {
      document.removeEventListener("mousedown", handleClose);
      window.removeEventListener("scroll", handleClose, true);
    };
  }, []);

  // Filtrado por período
  const reportsByPeriod = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    return reports.filter((r) => {
      const fecha = new Date(r.fecha);
      if (periodoFilter === "HOY") return fecha >= todayStart;
      if (periodoFilter === "7DIAS") {
        const since = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
        return fecha >= since;
      }
      if (periodoFilter === "RANGO") {
        if (fechaDesde && fecha < new Date(fechaDesde)) return false;
        if (fechaHasta) {
          const hasta = new Date(fechaHasta);
          hasta.setHours(23, 59, 59, 999);
          if (fecha > hasta) return false;
        }
        return true;
      }
      return true;
    });
  }, [reports, periodoFilter, fechaDesde, fechaHasta]);

  // Filtrado por búsqueda
  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return reportsByPeriod;
    const q = searchQuery.toLowerCase().trim();
    return reportsByPeriod.filter(
      (r) =>
        r.descripcion?.toLowerCase().includes(q) ||
        r.usuario?.toLowerCase().includes(q) ||
        r.localidad?.toLowerCase().includes(q) ||
        r.direccion?.toLowerCase().includes(q) ||
        r.barrio?.toLowerCase().includes(q) ||
        TIPO_LABELS[r.tipo]?.toLowerCase().includes(q) ||
        (estadosMap.get(r.id) || "").toLowerCase().includes(q)
    );
  }, [reportsByPeriod, searchQuery, estadosMap]);

  // Columns — fecha es oculta (sólo para sorting)
  const columns = useMemo<ColumnDef<typeof tableFeaturesConfig, Report>[]>(
    () => [
      ...(showCheckboxes ? [{ id: "select", header: "" }] : []),
      {
        id: "fecha",
        accessorFn: (row: Report) => new Date(row.fecha).getTime(),
        header: "",
        sortFn: sortFn_alphanumeric,
        enableSorting: true,
      },
      {
        id: "descripcion",
        accessorFn: (row: Report) => row.descripcion || "",
        header: "Descripción",
        sortFn: sortFn_text,
      },
      {
        id: "direccion",
        accessorFn: (row: Report) => row.direccion || "",
        header: "Dirección",
        sortFn: sortFn_text,
      },
      {
        id: "localidad",
        accessorFn: (row: Report) => row.localidad || row.barrio || "",
        header: "Localidad",
        sortFn: sortFn_text,
      },
      {
        id: "region",
        accessorFn: (row: Report) => row.barrio || row.departamento || "",
        header: "Región",
        sortFn: sortFn_text,
      },
      {
        id: "tipo",
        accessorFn: (row: Report) => TIPO_LABELS[row.tipo] || row.tipo,
        header: "Tipo de incidente",
        sortFn: sortFn_text,
      },
      {
        id: "estado",
        accessorFn: (row: Report) => estadosMap.get(row.id) || "",
        header: "Estado",
        sortFn: sortFn_text,
      },
      { id: "acciones", header: "", enableSorting: false },
    ],
    [showCheckboxes, estadosMap]
  );

  const table = useTable({
    key: "reportes-table",
    features: tableFeaturesConfig,
    data: filteredReports,
    columns,
    getRowId: (row: Report) => row.id,
    initialState: { sorting: [{ id: "fecha", desc: true }] },
  });

  const sortedReports = table
    .getRowModel()
    .rows.map(
      (row: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) =>
        row.original as Report
    );

  // Checkboxes
  const isAllSelected =
    sortedReports.length > 0 &&
    sortedReports.every((r) => selectedRowIds.has(r.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(sortedReports.map((r) => r.id)));
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

  // ─── Delete mode ─────────────────────────────────────────────
  const handleTrashButtonClick = () => {
    if (!isDeleteMode) {
      setIsDeleteMode(true);
      setIsTagMode(false);
      setSelectedRowIds(new Set());
    } else {
      if (selectedRowIds.size === 0) {
        alert("Selecciona al menos un reporte para eliminar.");
        return;
      }
      setShowConfirmDeleteModal(true);
    }
  };

  const handleCancelDeleteMode = () => {
    setIsDeleteMode(false);
    setSelectedRowIds(new Set());
  };

  const handleDeleteConfirm = async () => {
    const ids = Array.from(selectedRowIds);
    if (ids.length === 0) return;
    try {
      await onDeleteReports(ids);
      setSelectedRowIds(new Set());
      setIsDeleteMode(false);
      setShowConfirmDeleteModal(false);
    } catch (e) {
      console.error(e);
      alert("Error eliminando los reportes seleccionados.");
    }
  };

  // ─── Tag mode ─────────────────────────────────────────────────
  const handleTagButtonClick = () => {
    if (!isTagMode) {
      setIsTagMode(true);
      setIsDeleteMode(false);
      setSelectedRowIds(new Set());
    } else {
      if (selectedRowIds.size === 0) {
        alert("Selecciona al menos un reporte para asignar estado.");
        return;
      }
      setShowTagEstadoModal(true);
    }
  };

  const handleCancelTagMode = () => {
    setIsTagMode(false);
    setSelectedRowIds(new Set());
  };

  const handleBulkAssignEstado = (estado: string) => {
    selectedRowIds.forEach((id) => onAssignEstado(id, estado));
    setSelectedRowIds(new Set());
    setIsTagMode(false);
    setShowTagEstadoModal(false);
  };

  // ─── Export CSV ───────────────────────────────────────────────
  const handleExportCSV = () => {
    if (sortedReports.length === 0) {
      alert("No hay reportes para exportar.");
      return;
    }
    const headers = [
      "Descripción",
      "Dirección",
      "Localidad",
      "Región",
      "Tipo de incidente",
      "Estado",
      "Usuario",
      "Fecha",
    ];
    const rows = sortedReports.map((r) => {
      const estado = estadosMap.get(r.id) || "";
      return [
        `"${(r.descripcion || "").replace(/"/g, '""')}"`,
        `"${(r.direccion || "").replace(/"/g, '""')}"`,
        `"${(r.localidad || r.barrio || "").replace(/"/g, '""')}"`,
        `"${(r.barrio || r.departamento || "").replace(/"/g, '""')}"`,
        `"${(TIPO_LABELS[r.tipo] || r.tipo || "").replace(/"/g, '""')}"`,
        `"${estado.replace(/"/g, '""')}"`,
        `"${(r.usuario || "").replace(/"/g, '""')}"`,
        `"${new Date(r.fecha).toLocaleDateString("es-AR")}"`,
      ].join(";");
    });
    const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `reportes_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const tableGridTemplateColumns = [
    ...(showCheckboxes ? ["48px"] : []),
    "minmax(200px, 2fr)",
    "minmax(150px, 1.2fr)",
    "minmax(130px, 1fr)",
    "minmax(130px, 1fr)",
    "minmax(150px, 1.2fr)",
    "minmax(130px, 1fr)",
    "64px",
  ].join(" ");

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Controles */}
      <div className="flex flex-wrap items-center justify-between gap-4 w-full py-1">
        {/* Izquierda — filtro período */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-zinc-600 dark:text-slate-200">
            Periodo:
          </span>
          <div className="relative">
            <Switch
              value={periodoFilter}
              onValueChange={(val) => {
                const p = val as PeriodoFilter;
                setPeriodoFilter(p);
                if (p === "RANGO") {
                  setShowCalendarModal(true);
                } else {
                  setShowCalendarModal(false);
                }
              }}
            >
              <Switch.Option value="HOY">Hoy</Switch.Option>
              <Switch.Option value="7DIAS">Últimos 7 días</Switch.Option>
              <Switch.Option value="RANGO">Desde - Hasta</Switch.Option>
            </Switch>

            <RangeCalendarModal
              isOpen={periodoFilter === "RANGO" && showCalendarModal}
              onClose={() => setShowCalendarModal(false)}
              startDate={fechaDesde}
              endDate={fechaHasta}
              onSelectRange={(s, e) => {
                setFechaDesde(s);
                setFechaHasta(e);
              }}
            />
          </div>
        </div>

        {/* Derecha — buscador, tag, basura, exportar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Buscador */}
          <div className="relative flex items-center h-9">
            <input
              type="text"
              placeholder="Buscar reporte..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 rounded-full border border-gray-200/60 dark:border-[#2b395b] bg-white/50 dark:bg-[#161f36] shadow-[0_7px_50px_0px_rgb(0,0,0,0.1)] dark:shadow-none backdrop-blur-md pl-3.5 pr-8 text-xs text-zinc-800 dark:text-slate-100 placeholder:text-zinc-400 dark:placeholder:text-slate-400 outline-none focus:border-zinc-400 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-[#1c2744] transition-all w-36 sm:w-48"
            />
            <button
              type="button"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            >
              <Search className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Botón Tag — asignación masiva */}
          <div className="flex items-center gap-1.5 transition-all duration-200">
            <TooltipSign
              label="Asignar estado a múltiples reportes"
              position="top"
              delayMs={500}
            >
              <button
                type="button"
                onClick={handleTagButtonClick}
                className={`flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-200 cursor-pointer shadow-[0_7px_50px_0px_rgb(0,0,0,0.1)] dark:shadow-none backdrop-blur-md active:scale-95 shrink-0 ${
                  isTagMode
                    ? "border-blue-200 dark:border-[#5270d8]/60 bg-blue-50/90 dark:bg-[#233154] text-blue-600 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-[#2a3d6b]"
                    : "border-gray-200/60 dark:border-[#2b395b] bg-white/50 dark:bg-[#161f36] text-zinc-700 dark:text-slate-200 hover:bg-white dark:hover:bg-[#1e2a4a] hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                {isTagMode && selectedRowIds.size > 0 ? (
                  <span className="text-[11px] font-bold">
                    {selectedRowIds.size}
                  </span>
                ) : (
                  <Tag className="h-3.5 w-3.5" />
                )}
              </button>
            </TooltipSign>

            {isTagMode && (
              <button
                type="button"
                onClick={handleCancelTagMode}
                className="h-9 rounded-xl border border-red-200/80 dark:border-[#f87171]/40 bg-white dark:bg-[#1e2a4a] px-3.5 text-xs font-bold text-red-600 dark:text-[#f87171] shadow-2xs backdrop-blur-md hover:bg-red-50/60 dark:hover:bg-[#25355d] hover:border-red-300 dark:hover:border-[#f87171]/70 dark:hover:text-[#fca5a5] transition-all duration-150 active:scale-95 cursor-pointer flex items-center"
              >
                Cancelar
              </button>
            )}
          </div>

          {/* Botón Basura */}
          <div className="flex items-center gap-1.5 transition-all duration-200">
            <TooltipSign label="Eliminar reportes" position="top" delayMs={500}>
              <button
                type="button"
                onClick={handleTrashButtonClick}
                className={`flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-200 cursor-pointer shadow-[0_7px_50px_0px_rgb(0,0,0,0.1)] dark:shadow-none backdrop-blur-md active:scale-95 shrink-0 ${
                  isDeleteMode
                    ? "border-red-200 dark:border-blue-400/60 bg-red-50/90 dark:bg-[#314677] text-red-600 dark:text-blue-100 hover:bg-red-100 dark:hover:bg-[#3d5691]"
                    : "border-gray-200/60 dark:border-[#2b395b] bg-white/50 dark:bg-[#161f36] text-zinc-700 dark:text-slate-200 hover:bg-white dark:hover:bg-[#1e2a4a] hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                {isDeleteMode && selectedRowIds.size > 0 ? (
                  <span className="text-[11px] font-bold">
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
                className="h-9 rounded-xl border border-red-200/80 dark:border-[#f87171]/40 bg-white dark:bg-[#1e2a4a] px-3.5 text-xs font-bold text-red-600 dark:text-[#f87171] shadow-2xs backdrop-blur-md hover:bg-red-50/60 dark:hover:bg-[#25355d] hover:border-red-300 dark:hover:border-[#f87171]/70 dark:hover:text-[#fca5a5] transition-all duration-150 active:scale-95 cursor-pointer flex items-center"
              >
                Cancelar
              </button>
            )}
          </div>

          {/* Botón Exportar */}
          <TooltipSign label="Exportar listado" position="top" delayMs={500}>
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200/60 dark:border-[#2b395b] bg-white/50 dark:bg-[#161f36] text-zinc-700 dark:text-slate-200 shadow-[0_7px_50px_0px_rgb(0,0,0,0.1)] dark:shadow-none backdrop-blur-md hover:bg-white dark:hover:bg-[#1e2a4a] hover:text-zinc-900 dark:hover:text-white transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
          </TooltipSign>
        </div>
      </div>

      {/* Tabla */}
      <div className="w-full rounded-xl border border-gray-200/80 dark:border-[#2b395b] bg-white dark:bg-[#161f36] overflow-hidden shadow-xs dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)] animate-list-slide-left">
        <div className="overflow-x-auto">
          <table className="block w-full min-w-[960px] text-left text-xs relative border-separate border-spacing-0">
            <thead className="table w-full table-fixed bg-zinc-50/95 dark:bg-[#1c2744] shadow-2xs">
              {table
                .getHeaderGroups()
                .map(
                  (
                    headerGroup: any /* eslint-disable-line @typescript-eslint/no-explicit-any */
                  ) => (
                    <tr
                      key={headerGroup.id}
                      style={{ gridTemplateColumns: tableGridTemplateColumns }}
                      className="grid w-full items-stretch border-b border-gray-200 dark:border-[#2b395b] select-none"
                    >
                      {headerGroup.headers.map(
                        (
                          header: any /* eslint-disable-line @typescript-eslint/no-explicit-any */
                        ) => {
                          if (header.column.id === "fecha") return null;

                          const isSortable = header.column.getCanSort();
                          const isSorted = header.column.getIsSorted();
                          const isSelection = header.column.id === "select";
                          const isActions = header.column.id === "acciones";

                          return (
                            <th
                              key={header.id}
                              colSpan={header.colSpan}
                              onClick={
                                isSortable
                                  ? header.column.getToggleSortingHandler()
                                  : undefined
                              }
                              className={`sticky top-0 z-30 bg-zinc-50/95 dark:bg-[#1c2744] ${
                                isSelection
                                  ? "w-12 px-4"
                                  : isActions
                                    ? "w-16 px-3"
                                    : "px-5"
                              } py-3.5 text-xs font-bold transition-none text-left ${
                                isSortable
                                  ? "cursor-pointer group hover:bg-zinc-100/80 dark:hover:bg-[#233154]"
                                  : "hover:bg-zinc-100/80 dark:hover:bg-[#233154]"
                              } ${
                                isSorted
                                  ? "text-zinc-900 dark:text-white bg-zinc-100/40 dark:bg-[#233154]"
                                  : "text-zinc-600 dark:text-slate-200 hover:text-zinc-900 dark:hover:text-white"
                              }`}
                            >
                              {isSelection ? (
                                <div className="flex items-center h-full">
                                  <input
                                    type="checkbox"
                                    checked={isAllSelected}
                                    onChange={toggleSelectAll}
                                    onClick={(e) => e.stopPropagation()}
                                    className="h-3.5 w-3.5 rounded border-gray-300 dark:border-slate-500 text-zinc-900 focus:ring-zinc-500 cursor-pointer"
                                  />
                                </div>
                              ) : isActions ? null : (
                                <div className="flex items-center justify-start gap-1.5 h-full">
                                  <span className="leading-snug">
                                    {header.column.columnDef.header as string}
                                  </span>
                                  {isSortable &&
                                    (isSorted === "asc" ? (
                                      <ArrowDown className="h-3 w-3 text-zinc-900 dark:text-white shrink-0" />
                                    ) : isSorted === "desc" ? (
                                      <ArrowUp className="h-3 w-3 text-zinc-900 dark:text-white shrink-0" />
                                    ) : (
                                      <ArrowUpDown className="h-3 w-3 text-zinc-400 dark:text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
                                    ))}
                                </div>
                              )}
                            </th>
                          );
                        }
                      )}
                    </tr>
                  )
                )}
            </thead>
          </table>

          <OverlayScrollbarsComponent
            defer
            className="min-w-[960px] max-h-[520px]"
            options={{
              overflow: { x: "hidden", y: "scroll" },
              scrollbars: {
                theme: "inu-table-scrollbar",
                autoHide: "never",
                visibility: "auto",
              },
            }}
          >
            <table className="block w-full min-w-[960px] text-left text-xs relative border-separate border-spacing-0">
              <tbody className="block divide-y divide-gray-100 dark:divide-[#222e4d] bg-white dark:bg-[#161f36]">
                {sortedReports.length === 0 ? (
                  <tr
                    style={{ gridTemplateColumns: tableGridTemplateColumns }}
                    className="grid w-full items-center"
                  >
                    <td
                      colSpan={(showCheckboxes ? 1 : 0) + 7}
                      className="py-12 text-center text-xs text-zinc-400 dark:text-slate-400 font-medium"
                    >
                      No se encontraron reportes.
                    </td>
                  </tr>
                ) : (
                  table
                    .getRowModel()
                    .rows.map(
                      (
                        row: any /* eslint-disable-line @typescript-eslint/no-explicit-any */
                      ) => {
                        const report = row.original as Report;
                        const isChecked = selectedRowIds.has(report.id);
                        const estadoLabel = estadosMap.get(report.id) || null;
                        const estadoPreset = estadosPreset.find(
                          (p) => p.label === estadoLabel
                        );
                        const estadoColor =
                          estadoPreset?.color ??
                          "bg-zinc-100 dark:bg-zinc-800/60 text-zinc-500 dark:text-slate-400 border-zinc-200 dark:border-zinc-600/50";

                        return (
                          <tr
                            key={report.id}
                            onClick={() => {
                              if (showCheckboxes) toggleSelectRow(report.id);
                            }}
                            style={{
                              gridTemplateColumns: tableGridTemplateColumns,
                            }}
                            className={`grid w-full items-center group transition-colors ${
                              showCheckboxes
                                ? "cursor-pointer"
                                : "cursor-default"
                            } ${
                              isChecked
                                ? isTagMode
                                  ? "bg-blue-50/50 dark:bg-blue-950/20"
                                  : "bg-red-50/50 dark:bg-red-950/30"
                                : "hover:bg-zinc-50/80 dark:hover:bg-[#1e2a4a]"
                            }`}
                          >
                            {showCheckboxes && (
                              <td
                                className="px-4 py-3 text-left"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleSelectRow(report.id)}
                                  className="h-3.5 w-3.5 rounded border-gray-300 dark:border-slate-600 text-zinc-900 focus:ring-zinc-500 cursor-pointer"
                                />
                              </td>
                            )}

                            {/* Descripción */}
                            <td className="px-5 py-3 font-medium text-zinc-800 dark:text-slate-100 text-left">
                              <span className="line-clamp-2 leading-relaxed">
                                {report.descripcion || "-"}
                              </span>
                            </td>

                            {/* Dirección */}
                            <td className="px-5 py-3 text-zinc-600 dark:text-slate-300 font-medium text-left">
                              {report.direccion || "-"}
                            </td>

                            {/* Localidad */}
                            <td className="px-5 py-3 text-zinc-600 dark:text-slate-300 font-medium text-left">
                              {report.localidad || report.barrio || "-"}
                            </td>

                            {/* Región */}
                            <td className="px-5 py-3 text-zinc-600 dark:text-slate-300 font-medium text-left">
                              {report.barrio || report.departamento || "-"}
                            </td>

                            {/* Tipo */}
                            <td className="px-5 py-3 text-zinc-600 dark:text-slate-300 font-medium text-left">
                              {TIPO_LABELS[report.tipo] || report.tipo || "-"}
                            </td>

                            {/* Estado */}
                            <td className="px-5 py-3 text-left">
                              {estadoLabel ? (
                                <span
                                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${estadoColor}`}
                                >
                                  {estadoLabel}
                                </span>
                              ) : (
                                <span className="text-zinc-300 dark:text-slate-600 italic text-xs">
                                  Sin estado
                                </span>
                              )}
                            </td>

                            {/* Acciones */}
                            <td
                              className="px-3 py-3 text-center relative"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const rect =
                                    e.currentTarget.getBoundingClientRect();
                                  if (activeMenuData?.report.id === report.id) {
                                    setActiveMenuData(null);
                                  } else {
                                    const spaceBelow =
                                      window.innerHeight - rect.bottom;
                                    const showAbove = spaceBelow < 120;
                                    setActiveMenuData({
                                      report,
                                      top: showAbove
                                        ? rect.top - 100
                                        : rect.bottom + 4,
                                      right: window.innerWidth - rect.right,
                                    });
                                  }
                                }}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-[#1e2a4a] hover:text-zinc-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                              >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      }
                    )
                )}
              </tbody>
            </table>
          </OverlayScrollbarsComponent>
        </div>
      </div>

      {/* Menú contextual flotante */}
      {activeMenuData && (
        <div
          ref={rowMenuRef}
          style={{
            position: "fixed",
            top: `${activeMenuData.top}px`,
            right: `${activeMenuData.right}px`,
            zIndex: 9999,
          }}
          className="w-40 rounded-xl border border-gray-200 dark:border-[#2b395b] bg-white dark:bg-[#161f36] p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setEstadoModalData({
                reportId: activeMenuData.report.id,
                currentEstado: estadosMap.get(activeMenuData.report.id) ?? null,
              });
              setActiveMenuData(null);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-slate-200 hover:bg-zinc-50 dark:hover:bg-[#1e2a4a] transition-colors cursor-pointer"
          >
            <Tag className="h-3.5 w-3.5 text-zinc-500 dark:text-slate-400" />
            <span>Asignar estado</span>
          </button>
          <button
            onClick={async () => {
              const id = activeMenuData.report.id;
              setActiveMenuData(null);
              await onDeleteReports([id]);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Eliminar</span>
          </button>
        </div>
      )}

      {/* Modal Asignar Estado — individual (desde menú ⋯) */}
      {estadoModalData && (
        <AsignarEstadoModal
          isOpen={true}
          currentEstado={estadoModalData.currentEstado}
          onClose={() => setEstadoModalData(null)}
          onConfirm={(estado) => {
            onAssignEstado(estadoModalData.reportId, estado);
            setEstadoModalData(null);
          }}
          estadosPreset={estadosPreset}
          onAddEstadoPreset={handleAddEstadoPreset}
          onDeleteEstadoPresets={handleDeleteEstadoPresets}
        />
      )}

      {/* Modal Asignar Estado — masivo (desde botón tag) */}
      <AsignarEstadoModal
        isOpen={showTagEstadoModal}
        currentEstado={null}
        onClose={() => setShowTagEstadoModal(false)}
        onConfirm={handleBulkAssignEstado}
        estadosPreset={estadosPreset}
        onAddEstadoPreset={handleAddEstadoPreset}
        onDeleteEstadoPresets={handleDeleteEstadoPresets}
      />

      {/* Modal confirmación eliminación */}
      {showConfirmDeleteModal && (
        <div className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/30 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-[#161f36] p-6 shadow-2xl border border-gray-200 dark:border-[#2b395b] animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-3">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              ¿Eliminar reportes?
            </h3>
            <p className="text-xs text-zinc-600 dark:text-slate-300 leading-relaxed">
              Estás por eliminar{" "}
              <strong className="text-zinc-900 dark:text-white">
                {selectedRowIds.size}{" "}
                {selectedRowIds.size === 1 ? "reporte" : "reportes"}
              </strong>{" "}
              seleccionados. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2.5 mt-2">
              {/* Cancelar — estilo neutro igual que modal de estado */}
              <button
                type="button"
                onClick={() => setShowConfirmDeleteModal(false)}
                className="flex w-1/2 items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-[#2b395b] bg-white dark:bg-[#1e2a4a] px-4 py-2 text-xs font-bold text-zinc-600 dark:text-slate-200 shadow-2xs hover:bg-zinc-50 dark:hover:bg-[#25355d] transition-all active:scale-95 cursor-pointer"
              >
                Cancelar
              </button>
              {/* Confirmar — crimson oscuro atenuado (picture 2) */}
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="flex w-1/2 items-center justify-center gap-2 rounded-xl border border-red-800/50 dark:border-red-900/60 bg-[#5c1010] dark:bg-[#450a0a] px-4 py-2 text-xs font-bold text-red-200 shadow-2xs hover:bg-[#6b1515] dark:hover:bg-[#5c1010] transition-all active:scale-95 cursor-pointer"
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
