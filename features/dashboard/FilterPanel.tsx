import { ReportFilters, ReportType, ZoneLevel } from "@/types/report";
import { TYPE_CONFIG, ZONE_CONFIG } from "@/lib/utils";
import { Filter, Search, RotateCcw, MapPin } from "lucide-react";

interface FilterPanelProps {
  filters: ReportFilters;
  onUpdateFilter: <K extends keyof ReportFilters>(
    key: K,
    value: ReportFilters[K]
  ) => void;
  onResetFilters: () => void;
}

export function FilterPanel({
  filters,
  onUpdateFilter,
  onResetFilters,
}: FilterPanelProps) {
  const isFiltered =
    filters.tipo !== "TODOS" ||
    filters.nivelZona !== "TODOS" ||
    Boolean(filters.busqueda && filters.busqueda.trim() !== "");

  return (
    <div className="p-3 bg-zinc-50  border border-zinc-200  rounded-lg space-y-3 font-sans">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-700  flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-blue-500" /> Filtros Inu
        </span>
        {isFiltered && (
          <button
            onClick={onResetFilters}
            className="text-[11px] text-zinc-500 hover:text-zinc-900  flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> Limpiar
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
        <input
          type="text"
          placeholder="Buscar por localidad, mensaje Telegram o usuario..."
          value={filters.busqueda || ""}
          onChange={(e) => onUpdateFilter("busqueda", e.target.value)}
          className="w-full text-xs pl-8 pr-3 py-1.5 bg-white  border border-zinc-200  rounded text-zinc-800  placeholder:text-zinc-400 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Select Grids */}
      <div className="grid grid-cols-1 gap-2">
        {/* Tipo */}
        <div>
          <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider block mb-1">
            Problemática de Lluvia
          </label>
          <select
            value={filters.tipo || "TODOS"}
            onChange={(e) =>
              onUpdateFilter("tipo", e.target.value as ReportType | "TODOS")
            }
            className="w-full text-xs px-2.5 py-1.5 bg-white  border border-zinc-200  rounded text-zinc-800  focus:outline-none focus:border-blue-500"
          >
            <option value="TODOS">Todas las problemáticas</option>
            {(Object.keys(TYPE_CONFIG) as ReportType[]).map((type) => (
              <option key={type} value={type}>
                {TYPE_CONFIG[type].label}
              </option>
            ))}
          </select>
        </div>

        {/* Nivel de zona */}
        <div>
          <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider block mb-1">
            Nivel de Zona
          </label>
          <select
            value={filters.nivelZona || "TODOS"}
            onChange={(e) =>
              onUpdateFilter("nivelZona", e.target.value as ZoneLevel | "TODOS")
            }
            className="w-full text-xs px-2.5 py-1.5 bg-white  border border-zinc-200  rounded text-zinc-800  focus:outline-none focus:border-blue-500"
          >
            <option value="TODOS">Todas las zonas</option>
            {(Object.keys(ZONE_CONFIG) as ZoneLevel[]).map((zone) => (
              <option key={zone} value={zone}>
                {ZONE_CONFIG[zone].label}
              </option>
            ))}
          </select>
        </div>

        {/* Resumen por nivel */}
        <div className="flex items-center gap-2 px-1 pt-1">
          <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {(Object.keys(ZONE_CONFIG) as ZoneLevel[]).map((zone) => (
              <span
                key={zone}
                className="flex items-center gap-1 text-[10px] text-zinc-500"
              >
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: ZONE_CONFIG[zone].color }}
                />
                {ZONE_CONFIG[zone].rango}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
