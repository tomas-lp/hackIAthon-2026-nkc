import { Report, ReportFilters } from "@/types/report";
import { MOCK_REPORTS } from "@/lib/mockReports";

export interface IReportService {
  getReports(filters?: ReportFilters): Promise<Report[]>;
  getReportById(id: string): Promise<Report | null>;
}

export class MockReportService implements IReportService {
  async getReports(filters?: ReportFilters): Promise<Report[]> {
    let reports = [...MOCK_REPORTS];

    if (!filters) return reports;

    if (filters.ocultarDesestimados) {
      reports = reports.filter(
        (r) =>
          r.estado !== "DESESTIMADO_SIN_ALERTA" &&
          r.estado !== "DESESTIMADO_IRRELEVANTE"
      );
    }

    if (filters.tipo && filters.tipo !== "TODOS") {
      reports = reports.filter((r) => r.tipo === filters.tipo);
    }

    if (filters.riesgo && filters.riesgo !== "TODOS") {
      reports = reports.filter((r) => r.riesgo === filters.riesgo);
    }

    if (filters.estado && filters.estado !== "TODOS") {
      reports = reports.filter((r) => r.estado === filters.estado);
    }

    if (filters.busqueda && filters.busqueda.trim() !== "") {
      const q = filters.busqueda.toLowerCase();
      reports = reports.filter(
        (r) =>
          r.descripcion.toLowerCase().includes(q) ||
          r.usuario.toLowerCase().includes(q) ||
          (r.localidad && r.localidad.toLowerCase().includes(q))
      );
    }

    return reports;
  }

  async getReportById(id: string): Promise<Report | null> {
    const report = MOCK_REPORTS.find((r) => r.id === id);
    return report || null;
  }
}

export class SupabaseReportService implements IReportService {
  async getReports(): Promise<Report[]> {
    throw new Error("Supabase integration is planned for Stage 2.");
  }

  async getReportById(): Promise<Report | null> {
    throw new Error("Supabase integration is planned for Stage 2.");
  }
}

export const reportService: IReportService = new MockReportService();
