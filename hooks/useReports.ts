import { useCallback, useEffect, useRef, useState } from "react";
import { Report, ReportFilters } from "@/types/report";

export function useReports(initialReports: Report[] = []) {
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const [filters, setFilters] = useState<ReportFilters>({
    tipo: "TODOS",
    riesgo: "TODOS",
    estado: "TODOS",
    busqueda: "",
    ocultarDesestimados: false,
  });

  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const controller = new AbortController();

    const params = new URLSearchParams();
    if (filters.tipo && filters.tipo !== "TODOS")
      params.append("tipo", filters.tipo);
    if (filters.riesgo && filters.riesgo !== "TODOS")
      params.append("riesgo", filters.riesgo);
    if (filters.estado && filters.estado !== "TODOS")
      params.append("estado", filters.estado);
    if (filters.busqueda) params.append("busqueda", filters.busqueda);
    if (filters.ocultarDesestimados)
      params.append("ocultarDesestimados", "true");

    setLoading(true);

    fetch(`/api/reports?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok)
          throw new Error(`Error ${res.status}: Error al obtener reportes`);
        return res.json();
      })
      .then((data: Report[]) => {
        setReports(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        const message =
          err instanceof Error ? err.message : "Error al conectar con la API";
        setError(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [filters]);

  const updateFilter = useCallback(
    <K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const resetFilters = useCallback(() => {
    setFilters({
      tipo: "TODOS",
      riesgo: "TODOS",
      estado: "TODOS",
      busqueda: "",
      ocultarDesestimados: false,
    });
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
