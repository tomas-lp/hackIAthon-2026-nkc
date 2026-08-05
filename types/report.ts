export type ReportType =
  "LLUVIAS_FUERTES" | "INUNDACION_URBANA" | "GRANIZO" | "ANEGAMIENTO_VIVIENDA";

export type DescriptionLevel =
  "AGUA_CALLE" | "NO_CIRCULAR" | "AGUA_CASAS" | "EVACUADOS";

export type ZoneLevel = "GRIS" | "VERDE" | "AMARILLO" | "NARANJA" | "ROJO";

export interface Report {
  id: string;
  fecha: string;
  latitud: number;
  longitud: number;
  tipo: ReportType;
  descripcion: string;
  usuario: string;
  localidad?: string;
  puntajeBase: number;
  puntajeDescripcion: number;
  puntajeFoto: number;
  puntajeClima: number;
  fotoValida: boolean;
  lluviaMm: number;
  puntajeReal: number | null;
}

export interface ReportFilters {
  tipo?: ReportType | "TODOS";
  nivelZona?: ZoneLevel | "TODOS";
  busqueda?: string;
}

export interface Zone {
  id: string;
  bounds: { minLat: number; minLng: number; maxLat: number; maxLng: number };
  nivel: ZoneLevel;
  puntaje: number;
  cantidadReportes: number;
  promedioGravedad: number;
  climaPuntos: number;
  recientesPuntos: number;
}

export interface ReportStats {
  total: number;
  activos: number;
  fotosValidadas: number;
  zonasActivas: number;
  porTipo: Record<ReportType, number>;
  porNivelZona: Record<ZoneLevel, number>;
}
