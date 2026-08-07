import "server-only";

import {
  MAX_EDAD_REPORTE_HORAS,
  puntajeReal as calcPuntajeReal,
} from "@/lib/zones";
import { Report, ReportFilters } from "@/types/report";
import { createBrowserClient } from "@supabase/ssr";

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

const isReportTipo = (v: string | undefined): v is Report["tipo"] =>
  !!v && (REPORT_TYPES as string[]).includes(v);

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
  usuario_display?: string;
  usuario?: string;
  telegram_username?: string;
  chat_id?: number | string;
  localidad?: string;
  ubicacion?: string;
  lluvia_mm?: number;
  puntaje_descripcion?: number;
  puntaje_foto?: number;
  puntaje_clima?: number;
  puntaje_base?: number;
  foto_valida?: boolean;
  foto_url?: string;
  es_audio?: boolean;
};

export class SupabaseReportService implements IReportService {
  private supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  private supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  private supabase = createBrowserClient(this.supabaseUrl!, this.supabaseKey!);

  private mapDbRowToReport(row: ReportDbRow, ahora = new Date()): Report {
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

    const fecha =
      row.created_at ?? row.creado_en ?? row.fecha ?? new Date().toISOString();
    const edadHoras = (ahora.getTime() - new Date(fecha).getTime()) / 3600000;
    const puntajeBase = Number(row.puntaje_base ?? 0);
    const lluviaMm = Number(row.lluvia_mm ?? 0);

    return {
      id: String(row.id),
      fecha,
      latitud: Number(lat ?? 0),
      longitud: Number(lon ?? 0),
      tipo: isReportTipo(row.tipo) ? row.tipo : mapTipo(tipoInferido),
      descripcion:
        row.descripcion ??
        row.texto_original ??
        row.motivo_fallo ??
        row.clima_fuente ??
        "",
      usuario:
        row.usuario_display ??
        row.usuario ??
        row.telegram_username ??
        row.chat_id?.toString?.() ??
        "",
      localidad:
        row.localidad ?? row.ubicacion ?? row.chat_id?.toString?.() ?? null,
      puntajeBase,
      puntajeDescripcion: Number(row.puntaje_descripcion ?? 0),
      puntajeFoto: Number(row.puntaje_foto ?? 0),
      puntajeClima: Number(row.puntaje_clima ?? 0),
      fotoValida: !!row.foto_valida,
      fotoUrl: row.foto_url ?? null,
      lluviaMm,
      puntajeReal: calcPuntajeReal(puntajeBase, edadHoras),
      es_audio: !!row.es_audio,
    };
  }

  private applyFilters(reports: Report[], filters?: ReportFilters): Report[] {
    let filtered = [...reports];

    if (!filters) return filtered;

    if (filters.tipo && filters.tipo !== "TODOS") {
      filtered = filtered.filter((r) => r.tipo === filters.tipo);
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
    // Reportes >24 hs se excluyen del cálculo y del mapa.
    const since = new Date(
      Date.now() - MAX_EDAD_REPORTE_HORAS * 3600000
    ).toISOString();

    let query = this.supabase
      .from("reports")
      .select("*")
      .gte("created_at", since)
      .order("created_at", { ascending: false });

    if (filters?.tipo && filters.tipo !== "TODOS") {
      query = query.eq("tipo", filters.tipo);
    }
    if (filters?.busqueda && filters.busqueda.trim() !== "") {
      query = query.ilike("descripcion", `%${filters.busqueda.trim()}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase getReports error:", error.message);
      return [];
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
      console.error("Supabase getReportById error:", error?.message);
      return null;
    }
    return this.mapDbRowToReport(data);
  }
}

export const reportService: IReportService = new SupabaseReportService();
