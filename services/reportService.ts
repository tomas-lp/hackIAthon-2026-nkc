import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { MOCK_REPORTS } from "@/lib/mockReports";
import { Report, ReportFilters } from "@/types/report";

export interface IReportService {
  getReports(filters?: ReportFilters): Promise<Report[]>;
  getReportById(id: string): Promise<Report | null>;
}

const REPORT_TYPES: Report["tipo"][] = [
  "INUNDACION_URBANA",
  "LLUVIAS_FUERTES",
  "GRANIZO",
  "ANEGAMIENTO_VIVIENDA",
];
const RISK_LEVELS: Report["riesgo"][] = ["BAJO", "MEDIO", "ALTO", "CRITICO"];
const VALIDATION_STATUSES: Report["estado"][] = [
  "VALIDADO_CLIMA",
  "PENDIENTE_VALIDACION",
  "DESESTIMADO_SIN_ALERTA",
  "DESESTIMADO_IRRELEVANTE",
];

// Guards: distinguen un valor tipado real (persistido en SQL) de uno
// heredado/legacy que sigue requiriendo la heurística.
const isReportTipo = (v: string | undefined): v is Report["tipo"] =>
  !!v && (REPORT_TYPES as string[]).includes(v);
const isReportRiesgo = (v: string | undefined): v is Report["riesgo"] =>
  !!v && (RISK_LEVELS as string[]).includes(v);
const isReportEstado = (v: string | undefined): v is Report["estado"] =>
  !!v && (VALIDATION_STATUSES as string[]).includes(v);

type ReportDbRow = {
  id: string | number;
  created_at?: string;
  creado_en?: string;
  fecha?: string;
  latitude?: number;
  longitude?: number;
  lat?: number;
  lon?: number;
  latitud?: number;
  longitud?: number;
  geom_geojson?: string | { coordinates?: Array<number> };
  geom?: string;
  tipo_incidente?: string;
  tipo?: string;
  descripcion?: string;
  texto_original?: string;
  motivo_fallo?: string;
  clima_fuente?: string;
  nivel_riesgo?: string;
  riesgo?: string;
  criticidad?: string;
  estado_validacion?: string;
  estado?: string;
  usuario_display?: string;
  usuario?: string;
  telegram_username?: string;
  chat_id?: number | string;
  localidad?: string;
  ubicacion?: string;
};

export class SupabaseReportService implements IReportService {
  private supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  private mapDbRowToReport(row: ReportDbRow): Report {
    const mapTipo = (t: string) => {
      if (!t) return "INUNDACION_URBANA" as Report["tipo"];
      const lower = t.toLowerCase();
      if (lower.includes("inund")) return "INUNDACION_URBANA" as Report["tipo"];
      if (lower.includes("lluv")) return "LLUVIAS_FUERTES" as Report["tipo"];
      if (lower.includes("graniz")) return "GRANIZO" as Report["tipo"];
      if (lower.includes("aneg"))
        return "ANEGAMIENTO_VIVIENDA" as Report["tipo"];
      if (lower.includes("corte") || lower.includes("ruta"))
        return "INUNDACION_URBANA" as Report["tipo"];
      if (lower.includes("rescat"))
        return "ANEGAMIENTO_VIVIENDA" as Report["tipo"];
      return "INUNDACION_URBANA" as Report["tipo"];
    };

    const mapRiesgo = (r: string | undefined) => {
      if (!r) return "MEDIO" as Report["riesgo"];
      const lower = r.toLowerCase();
      if (lower === "bajo") return "BAJO" as Report["riesgo"];
      if (lower === "medio") return "MEDIO" as Report["riesgo"];
      if (lower === "alto") return "ALTO" as Report["riesgo"];
      if (lower === "critico" || lower === "crítico")
        return "CRITICO" as Report["riesgo"];
      if (lower.includes("amar")) return "BAJO" as Report["riesgo"];
      if (lower.includes("naran")) return "ALTO" as Report["riesgo"];
      if (lower.includes("roj")) return "CRITICO" as Report["riesgo"];
      return "MEDIO" as Report["riesgo"];
    };

    const mapEstado = (estadoRaw: unknown) => {
      const value = String(estadoRaw ?? "").toLowerCase();
      if (!value) return "VALIDADO_CLIMA" as Report["estado"];
      if (value.includes("valid")) return "VALIDADO_CLIMA" as Report["estado"];
      if (value.includes("pend"))
        return "PENDIENTE_VALIDACION" as Report["estado"];
      if (value.includes("sin"))
        return "DESESTIMADO_SIN_ALERTA" as Report["estado"];
      if (value.includes("irrelev"))
        return "DESESTIMADO_IRRELEVANTE" as Report["estado"];
      if (value.includes("amar")) return "VALIDADO_CLIMA" as Report["estado"];
      if (value.includes("naran") || value.includes("roj"))
        return "PENDIENTE_VALIDACION" as Report["estado"];
      return "VALIDADO_CLIMA" as Report["estado"];
    };

    // Try common field names (latitude/longitude) or geojson/wkt from PostGIS
    let lat = row.latitude ?? row.lat ?? row.latitud;
    let lon = row.longitude ?? row.lon ?? row.longitud;
    if ((!lat || !lon) && row.geom_geojson) {
      try {
        const g =
          typeof row.geom_geojson === "string"
            ? JSON.parse(row.geom_geojson)
            : row.geom_geojson;
        if (g && g.coordinates) {
          lon = g.coordinates[0];
          lat = g.coordinates[1];
        }
      } catch {
        // ignore
      }
    }
    if ((!lat || !lon) && typeof row.geom === "string") {
      const match = row.geom.match(
        /POINT\s*\(\s*([\-\d.]+)\s+([\-\d.]+)\s*\)/i
      );
      if (match) {
        lon = Number(match[1]);
        lat = Number(match[2]);
      }
    }

    const tipoInferido =
      row.tipo_incidente ??
      row.tipo ??
      row.descripcion ??
      row.texto_original ??
      row.motivo_fallo ??
      "";

    return {
      id: String(row.id),
      fecha:
        row.created_at ??
        row.creado_en ??
        row.fecha ??
        new Date().toISOString(),
      latitud: Number(lat ?? 0),
      longitud: Number(lon ?? 0),
      // Preferimos las columnas tipadas (si vienen de SQL) y solo usamos la
      // heurística para filas legacy con esos campos en NULL.
      tipo: isReportTipo(row.tipo) ? row.tipo : mapTipo(tipoInferido),
      descripcion:
        row.descripcion ??
        row.texto_original ??
        row.motivo_fallo ??
        row.clima_fuente ??
        "",
      riesgo: isReportRiesgo(row.riesgo)
        ? row.riesgo
        : mapRiesgo(row.nivel_riesgo ?? row.riesgo ?? row.criticidad),
      estado: isReportEstado(row.estado)
        ? row.estado
        : mapEstado(row.estado_validacion ?? row.estado ?? row.criticidad),
      usuario:
        row.usuario_display ??
        row.usuario ??
        row.telegram_username ??
        row.chat_id?.toString?.() ??
        "",
      localidad:
        row.localidad ?? row.ubicacion ?? row.chat_id?.toString?.() ?? null,
      grokPayload: undefined,
    } as Report;
  }

  private applyFilters(reports: Report[], filters?: ReportFilters): Report[] {
    let filtered = [...reports];

    if (!filters) return filtered;

    if (filters.ocultarDesestimados) {
      filtered = filtered.filter(
        (r) =>
          r.estado !== "DESESTIMADO_SIN_ALERTA" &&
          r.estado !== "DESESTIMADO_IRRELEVANTE"
      );
    }

    if (filters.tipo && filters.tipo !== "TODOS") {
      filtered = filtered.filter((r) => r.tipo === filters.tipo);
    }

    if (filters.riesgo && filters.riesgo !== "TODOS") {
      filtered = filtered.filter((r) => r.riesgo === filters.riesgo);
    }

    if (filters.estado && filters.estado !== "TODOS") {
      filtered = filtered.filter((r) => r.estado === filters.estado);
    }

    if (filters.busqueda && filters.busqueda.trim() !== "") {
      const q = filters.busqueda.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.descripcion.toLowerCase().includes(q) ||
          r.usuario.toLowerCase().includes(q) ||
          (r.localidad && r.localidad.toLowerCase().includes(q))
      );
    }

    return filtered;
  }

  async getReports(filters?: ReportFilters): Promise<Report[]> {
    // Push-down de filtros a SQL: los filtros tipados se resuelven en la base
    // (tipo, riesgo, estado) gracias a las columnas agregadas por la migración
    // 20260805050000_add_typed_columns.sql, y la búsqueda con ILIKE sobre
    // descripcion. Los mocks ya no se inyectan en producción: solo se usan
    // como fallback si la conexión a Supabase falla.
    let query = this.supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (filters?.tipo && filters.tipo !== "TODOS") {
      query = query.eq("tipo", filters.tipo);
    }
    if (filters?.riesgo && filters.riesgo !== "TODOS") {
      query = query.eq("riesgo", filters.riesgo);
    }
    if (filters?.estado && filters.estado !== "TODOS") {
      query = query.eq("estado", filters.estado);
    }
    if (filters?.ocultarDesestimados) {
      query = query.in("estado", ["VALIDADO_CLIMA", "PENDIENTE_VALIDACION"]);
    }
    if (filters?.busqueda && filters.busqueda.trim() !== "") {
      query = query.ilike("descripcion", `%${filters.busqueda.trim()}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase getReports error:", error.message);
      return this.applyFilters(MOCK_REPORTS, filters);
    }

    const dbReports = (data || []).map((r) =>
      this.mapDbRowToReport(r as ReportDbRow)
    );

    return this.applyFilters(dbReports, filters);
  }

  async getReportById(id: string): Promise<Report | null> {
    const { data, error } = await this.supabase
      .from("reports")
      .select("*")
      .eq("id", id)
      .limit(1)
      .single();
    if (error || !data) {
      // Fallback solo ante error de conexión: si getReports devolvió mocks
      // porque Supabase no responde, permitimos abrir el detalle del mock.
      return MOCK_REPORTS.find((r) => r.id === id) || null;
    }
    return this.mapDbRowToReport(data);
  }
}

export const reportService: IReportService = new SupabaseReportService();
