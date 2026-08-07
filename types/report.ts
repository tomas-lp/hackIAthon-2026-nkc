export type ReportType =
  "LLUVIAS_FUERTES" | "INUNDACION_URBANA" | "GRANIZO" | "ANEGAMIENTO_VIVIENDA";

export type DescriptionLevel =
  "AGUA_CALLE" | "NO_CIRCULAR" | "AGUA_CASAS" | "EVACUADOS";

export interface Report {
  id: string;
  fecha: string;
  latitud: number;
  longitud: number;
  tipo: ReportType;
  descripcion: string;
  usuario: string;
  localidad?: string | null;
  puntajeBase: number;
  puntajeDescripcion: number;
  puntajeFoto: number;
  puntajeClima: number;
  fotoValida: boolean;
  fotoUrl?: string | null;
  lluviaMm: number;
  puntajeReal: number | null;
}

export interface ReportFilters {
  tipo?: ReportType | "TODOS";
  busqueda?: string;
}
