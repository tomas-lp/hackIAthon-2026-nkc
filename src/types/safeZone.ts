import { HealthCenterType } from "./healthCenter";

export type SafeZoneType =
  | "ESCUELA"
  | "POLIDEPORTIVO"
  | "SUM_COMUNITARIO"
  | "REFUGIO_MUNICIPAL"
  | "IGLESIA"
  | "OTRO";

export interface SafeZone {
  id: string;
  nombre: string;
  tipo?: SafeZoneType | HealthCenterType | string;
  descripcion?: string | null;
  localidad?: string | null;
  departamento?: string | null;
  provincia?: string | null;
  direccion?: string | null;
  capacidad_maxima?: number | null;
  latitud: number;
  longitud: number;
  created_at: string;
}

export type CreateSafeZoneDto = Omit<SafeZone, "id" | "created_at">;
export type UpdateSafeZoneDto = Partial<CreateSafeZoneDto>;
