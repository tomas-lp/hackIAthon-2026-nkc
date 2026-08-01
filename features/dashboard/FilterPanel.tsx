import {
  ReportFilters,
  ReportType,
  RiskLevel,
  ValidationStatus,
} from "@/types/report";
import { TYPE_CONFIG, RISK_CONFIG, STATUS_CONFIG } from "@/lib/utils";
import { Filter, Search, RotateCcw, ShieldOff } from "lucide-react";

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
    filters.riesgo !== "TODOS" ||
    filters.estado !== "TODOS" ||
    filters.ocultarDesestimados ||
    Boolean(filters.busqueda && filters.busqueda.trim() !== "");

  return (
    <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg space-y-3 font-sans">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-blue-500" /> Filtros Inu
        </span>
        {isFiltered && (
          <button
            onClick={onResetFilters}
            className="text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1 transition-colors"
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
          className="w-full text-xs pl-8 pr-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:border-blue-500"
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
            className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500"
          >
            <option value="TODOS">Todas las problemáticas</option>
            {(Object.keys(TYPE_CONFIG) as ReportType[]).map((type) => (
              <option key={type} value={type}>
                {TYPE_CONFIG[type].label}
              </option>
            ))}
          </select>
        </div>

        {/* Riesgo & Estado */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider block mb-1">
              Nivel Criticidad
            </label>
            <select
              value={filters.riesgo || "TODOS"}
              onChange={(e) =>
                onUpdateFilter("riesgo", e.target.value as RiskLevel | "TODOS")
              }
              className="w-full text-xs px-2 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500"
            >
              <option value="TODOS">Todos</option>
              {(Object.keys(RISK_CONFIG) as RiskLevel[]).map((risk) => (
                <option key={risk} value={risk}>
                  {RISK_CONFIG[risk].label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider block mb-1">
              Validación Clima/Grok
            </label>
            <select
              value={filters.estado || "TODOS"}
              onChange={(e) =>
                onUpdateFilter(
                  "estado",
                  e.target.value as ValidationStatus | "TODOS"
                )
              }
              className="w-full text-xs px-2 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500"
            >
              <option value="TODOS">Todos</option>
              {(Object.keys(STATUS_CONFIG) as ValidationStatus[]).map((st) => (
                <option key={st} value={st}>
                  {STATUS_CONFIG[st].label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Toggle Checkbox: Ocultar Desestimados */}
        <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 pt-1 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={Boolean(filters.ocultarDesestimados)}
            onChange={(e) =>
              onUpdateFilter("ocultarDesestimados", e.target.checked)
            }
            className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="flex items-center gap-1">
            <ShieldOff className="w-3.5 h-3.5 text-amber-500" /> Ocultar
            reportes desestimados
          </span>
        </label>
      </div>
    </div>
  );
}
