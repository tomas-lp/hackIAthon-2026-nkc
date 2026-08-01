export type ReportType =
  "LLUVIAS_FUERTES" | "INUNDACION_URBANA" | "GRANIZO" | "ANEGAMIENTO_VIVIENDA";

export type RiskLevel = "BAJO" | "MEDIO" | "ALTO" | "CRITICO";

export type ValidationStatus =
  | "VALIDADO_CLIMA"
  | "PENDIENTE_VALIDACION"
  | "DESESTIMADO_SIN_ALERTA"
  | "DESESTIMADO_IRRELEVANTE";

export interface TelegramGrokPayload {
  rawTelegramMessage: string;
  grokExtractedTags: string[];
  grokConfidence: number;
  weatherApiMatch: boolean;
  weatherAlertDetails?: string;
}

export interface Report {
  id: string;
  fecha: string;
  latitud: number;
  longitud: number;
  tipo: ReportType;
  descripcion: string;
  riesgo: RiskLevel;
  estado: ValidationStatus;
  usuario: string;
  localidad?: string;
  grokPayload?: TelegramGrokPayload;
}

export interface ReportFilters {
  tipo?: ReportType | "TODOS";
  riesgo?: RiskLevel | "TODOS";
  estado?: ValidationStatus | "TODOS";
  busqueda?: string;
  ocultarDesestimados?: boolean;
}

export interface ReportStats {
  total: number;
  validadosClima: number;
  pendientes: number;
  desestimadosSinAlerta: number;
  desestimadosIrrelevantes: number;
  porTipo: Record<ReportType, number>;
  porRiesgo: Record<RiskLevel, number>;
}
