"use client";

import { useEffect, useMemo, useState } from "react";
import { Report, ReportFilters, ReportType } from "@/types/report";
import { TYPE_CONFIG } from "@/lib/utils";
import { ListFilter, Sparkles } from "lucide-react";

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
}

export function Sidebar({
  reports,
  filters,
  loading,
  error,
  selectedReport,
  onSelectReport,
  onUpdateFilter,
  onResetFilters,
}: SidebarProps) {
  const visibleReports = useMemo(() => {
    const sortedReports = [...reports].sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );

    if (!filters.tipo || filters.tipo === "TODOS") {
      return sortedReports;
    }

    return sortedReports.filter((report) => report.tipo === filters.tipo);
  }, [filters.tipo, reports]);

  const [addresses, setAddresses] = useState<Record<string, string>>({});

  useEffect(() => {
    let isCancelled = false;

    const pendingReports = visibleReports.filter(
      (report) =>
        !addresses[report.id] &&
        report.latitud != null &&
        report.longitud != null
    );

    if (pendingReports.length === 0) {
      return;
    }

    const resolveReportAddress = async (lat: number, lng: number) => {
      const response = await fetch(
        `/api/reverse-geocode?lat=${lat}&lon=${lng}&lang=es`
      );

      if (!response.ok) {
        throw new Error("No se pudo resolver la dirección");
      }

      const data = await response.json();
      const address = data.address ?? {};
      const street =
        address.road || address.pedestrian || address.path || address.footway;
      const houseNumber = address.house_number;
      const locality =
        address.city || address.town || address.village || address.suburb;
      const state = address.state || address.province;
      const country = address.country;

      const formattedAddress = [
        street && houseNumber
          ? `${street} ${houseNumber}`
          : street || houseNumber,
        locality,
        state,
        country,
      ].filter(Boolean);

      return (
        formattedAddress.join(", ") ||
        data.display_name ||
        "Ubicación no disponible"
      );
    };

    const loadAddresses = async () => {
      for (const report of pendingReports) {
        if (isCancelled) {
          return;
        }

        try {
          const resolvedAddress = await resolveReportAddress(
            report.latitud,
            report.longitud
          );

          if (!isCancelled) {
            setAddresses((prev) => ({
              ...prev,
              [report.id]: resolvedAddress,
            }));
          }
        } catch {
          if (!isCancelled) {
            setAddresses((prev) => ({
              ...prev,
              [report.id]: "Ubicación no disponible",
            }));
          }
        }
      }
    };

    loadAddresses();

    return () => {
      isCancelled = true;
    };
  }, [visibleReports, addresses]);

  return (
    <aside className="absolute left-4 top-4 z-[1000] w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl border border-zinc-200/80 bg-white/95 p-3 shadow-xl backdrop-blur  ">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-600">
            Mapa de inundaciones
          </p>
          <h2 className="text-sm font-semibold text-zinc-900 ">
            Filtra y revisa los puntos
          </h2>
        </div>
        <div className="rounded-full bg-blue-50 p-2 text-blue-600  ">
          <ListFilter className="h-4 w-4" />
        </div>
      </div>

      <label className="mt-3 flex flex-col gap-1 text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500 ">
        <span>Tipo</span>
        <select
          value={filters.tipo || "TODOS"}
          onChange={(event) =>
            onUpdateFilter("tipo", event.target.value as ReportType | "TODOS")
          }
          className="rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-sm text-zinc-800 shadow-sm outline-none transition focus:border-blue-500   "
        >
          <option value="TODOS">Todos los tipos</option>
          {(Object.keys(TYPE_CONFIG) as ReportType[]).map((type) => (
            <option key={type} value={type}>
              {TYPE_CONFIG[type].label}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500">
        <span>{visibleReports.length} puntos</span>
        {(filters.tipo && filters.tipo !== "TODOS") || filters.busqueda ? (
          <button
            onClick={onResetFilters}
            className="font-medium text-blue-600 transition hover:text-blue-700 "
          >
            Limpiar
          </button>
        ) : null}
      </div>

      <div className="mt-2 max-h-[46vh] overflow-y-auto rounded-xl border border-zinc-200/70 bg-zinc-50/70 p-2  ">
        {loading && (
          <div className="rounded-lg border border-dashed border-zinc-300 px-3 py-4 text-center text-xs text-zinc-500  ">
            Cargando puntos de Inu...
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-xs text-red-600   ">
            {error}
          </div>
        )}

        {!loading && !error && visibleReports.length === 0 && (
          <div className="rounded-lg border border-dashed border-zinc-300 px-3 py-4 text-center text-xs text-zinc-500  ">
            No hay puntos para este tipo.
          </div>
        )}

        {!loading && !error && visibleReports.length > 0 && (
          <div className="space-y-2">
            {visibleReports.map((report) => {
              const isSelected = selectedReport?.id === report.id;
              const typeLabel = TYPE_CONFIG[report.tipo].label;

              return (
                <button
                  key={report.id}
                  onClick={() => onSelectReport(report)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                    isSelected
                      ? "border-blue-500 bg-blue-50/80  "
                      : "border-transparent bg-white/80 hover:border-zinc-300 hover:bg-zinc-100  "
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium text-zinc-900 ">
                      {typeLabel}
                    </span>
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500  ">
                      {report.riesgo}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-zinc-500 ">
                    <span
                      className="line-clamp-1"
                      title={
                        addresses[report.id] ||
                        report.localidad ||
                        report.descripcion
                      }
                    >
                      {addresses[report.id] ||
                        report.localidad ||
                        report.descripcion}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-lg bg-zinc-50 px-2.5 py-2 text-[11px] text-zinc-500  ">
        <Sparkles className="h-3.5 w-3.5 text-blue-500" />
        <span>Selecciona un punto para enfocarlo en el mapa.</span>
      </div>
    </aside>
  );
}
