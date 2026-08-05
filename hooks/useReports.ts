import { useCallback, useEffect, useRef, useState } from "react";
import { Report, ReportFilters, ReportType } from "@/types/report";
import { createClient } from "@/utils/supabase/client";

const SEARCH_DEBOUNCE_MS = 300;
const REALTIME_DEBOUNCE_MS = 500;

function buildQueryParams(
  tipo: ReportType | "TODOS",
  busqueda: string
): URLSearchParams {
  const params = new URLSearchParams();
  if (tipo && tipo !== "TODOS") params.append("tipo", tipo);
  if (busqueda) params.append("busqueda", busqueda);
  return params;
}

export function useReports(initialReports: Report[] = []) {
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const [filters, setFilters] = useState<ReportFilters>({
    tipo: "TODOS",
    nivelZona: "TODOS",
    busqueda: "",
  });

  const isFirstRender = useRef(true);
  const prevQueryKey = useRef("");
  const filtersRef = useRef(filters);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const tipo = filters.tipo ?? "TODOS";
  const busqueda = filters.busqueda ?? "";
  const queryKey = `${tipo}|${busqueda}`;

  const fetchReports = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    const { tipo: currentTipo, busqueda: currentBusqueda } = filtersRef.current;
    const params = buildQueryParams(
      currentTipo ?? "TODOS",
      currentBusqueda ?? ""
    );

    try {
      const res = await fetch(`/api/reports?${params.toString()}`, { signal });
      if (!res.ok)
        throw new Error(`Error ${res.status}: Error al obtener reportes`);
      const data: Report[] = await res.json();
      if (!signal?.aborted) {
        setReports(data);
        setError(null);
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      if (!signal?.aborted) {
        const message =
          err instanceof Error ? err.message : "Error al conectar con la API";
        setError(message);
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const previous = prevQueryKey.current;
    prevQueryKey.current = queryKey;

    const controller = new AbortController();
    const searchOnlyChanged = previous.split("|")[0] === tipo;

    if (searchOnlyChanged) {
      const timer = setTimeout(
        () => fetchReports(controller.signal),
        SEARCH_DEBOUNCE_MS
      );
      return () => {
        controller.abort();
        clearTimeout(timer);
      };
    }

    fetchReports(controller.signal);
    return () => {
      controller.abort();
    };
  }, [queryKey, tipo, busqueda, fetchReports]);

  useEffect(() => {
    const supabase = createClient();
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    const channel = supabase
      .channel("reports-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reports" },
        () => {
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(
            () => fetchReports(),
            REALTIME_DEBOUNCE_MS
          );
        }
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [fetchReports]);

  const updateFilter = useCallback(
    <K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const resetFilters = useCallback(() => {
    setFilters({ tipo: "TODOS", nivelZona: "TODOS", busqueda: "" });
  }, []);

  return {
    reports,
    loading,
    error,
    filters,
    selectedReport,
    setSelectedReport,
    updateFilter,
    resetFilters,
  };
}
