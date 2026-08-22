export type HealthCenterType =
  "SAPS" | "CAPS" | "HOSPITAL" | "CLINICA" | "SANATORIO" | "POLICONSULTORIO";

export interface HealthCenter {
  id: string;
  osm_id: number | null;
  nombre: string;
  tipo: HealthCenterType;
  localidad: string | null;
  departamento: string | null;
  direccion: string | null;
  lat: number | null;
  lon: number | null;
  codigo_postal: string | null;
  sitio_web: string | null;
  updated_at: string;
}
