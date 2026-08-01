import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Report,
  ReportFilters,
  ReportStats,
  ReportType,
  RiskLevel,
} from "@/types/report";

export function useReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const [filters, setFilters] = useState<ReportFilters>({
    tipo: "TODOS",
    riesgo: "TODOS",
    estado: "TODOS",
    busqueda: "",
    ocultarDesestimados: false,
  });

  // Pure async fetcher for manual refetching
  const fetchReports = useCallback(async () => {
    try {
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

      const response = await fetch(`/api/reports?${params.toString()}`);
      if (!response.ok) {
        throw new Error(
          `Error ${response.status}: No se pudieron cargar los reportes de Inu.`
        );
      }
      const data: Report[] = await response.json();
      setReports(data);
      setError(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Synchronize reports data with filters without calling setState synchronously in effect body
  useEffect(() => {
    let isSubscribed = true;

    const queryParams = new URLSearchParams();
    if (filters.tipo && filters.tipo !== "TODOS")
      queryParams.append("tipo", filters.tipo);
    if (filters.riesgo && filters.riesgo !== "TODOS")
      queryParams.append("riesgo", filters.riesgo);
    if (filters.estado && filters.estado !== "TODOS")
      queryParams.append("estado", filters.estado);
    if (filters.busqueda) queryParams.append("busqueda", filters.busqueda);
    if (filters.ocultarDesestimados)
      queryParams.append("ocultarDesestimados", "true");

    fetch(`/api/reports?${queryParams.toString()}`)
      .then((res) => {
        if (!res.ok)
          throw new Error(`Error ${res.status}: Error al obtener reportes`);
        return res.json();
      })
      .then((data: Report[]) => {
        if (isSubscribed) {
          setReports(data);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isSubscribed) {
          const message =
            err instanceof Error ? err.message : "Error al conectar con la API";
          setError(message);
          setLoading(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [filters]);

  const stats: ReportStats = useMemo(() => {
    const initialStats: ReportStats = {
      total: reports.length,
      validadosClima: 0,
      pendientes: 0,
      desestimadosSinAlerta: 0,
      desestimadosIrrelevantes: 0,
      porTipo: {
        INUNDACION_URBANA: 0,
        LLUVIAS_FUERTES: 0,
        GRANIZO: 0,
        ANEGAMIENTO_VIVIENDA: 0,
      },
      porRiesgo: {
        BAJO: 0,
        MEDIO: 0,
        ALTO: 0,
        CRITICO: 0,
      },
    };

    reports.forEach((report) => {
      if (report.estado === "VALIDADO_CLIMA") initialStats.validadosClima++;
      else if (report.estado === "PENDIENTE_VALIDACION")
        initialStats.pendientes++;
      else if (report.estado === "DESESTIMADO_SIN_ALERTA")
        initialStats.desestimadosSinAlerta++;
      else if (report.estado === "DESESTIMADO_IRRELEVANTE")
        initialStats.desestimadosIrrelevantes++;

      if (report.tipo in initialStats.porTipo) {
        initialStats.porTipo[report.tipo as ReportType]++;
      }
      if (report.riesgo in initialStats.porRiesgo) {
        initialStats.porRiesgo[report.riesgo as RiskLevel]++;
      }
    });

    return initialStats;
  }, [reports]);

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
    stats,
    selectedReport,
    setSelectedReport,
    updateFilter,
    resetFilters,
    refetch: fetchReports,
  };
}
