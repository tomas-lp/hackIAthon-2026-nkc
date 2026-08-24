import { HealthCenterType } from "./healthCenter";
import { SafeZoneType } from "./safeZone";

export type MarkerCategory = "EVACUACION" | "SALUD";

export interface MarkerRow {
  id: string;
  category: MarkerCategory;
  nombre: string;
  subtipo: string;
  rawTipo?: string;
  localidad: string | null;
  departamento?: string | null;
  direccion: string | null;
  descripcion?: string | null;
  capacidad_maxima?: number | null;
  lat: number;
  lon: number;
  fecha: string;
}

export const SAFE_ZONE_TYPE_LABELS: Record<SafeZoneType, string> = {
  ESCUELA: "Escuela / Inst. Educativa",
  POLIDEPORTIVO: "Polideportivo / Club",
  SUM_COMUNITARIO: "Centro Comunitario / SUM",
  REFUGIO_MUNICIPAL: "Refugio Municipal",
  IGLESIA: "Iglesia / Templo",
  OTRO: "Otro / Espacio Habilitado",
};

export const HEALTH_CENTER_TYPE_LABELS: Record<HealthCenterType, string> = {
  HOSPITAL: "Hospital",
  CAPS: "CAPS",
  SAPS: "SAPS",
  CLINICA: "Clínica",
  SANATORIO: "Sanatorio",
  POLICONSULTORIO: "Policonsultorio",
};
