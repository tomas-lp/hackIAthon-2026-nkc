import { DescriptionLevel, ZoneLevel } from "@/types/report";

export const CELL_LAT_DEG = 0.0036;
export const CELL_LON_DEG = 0.00405;

export const REPORTE_ZONA_PUNTOS = 5;
export const CLIMA_ZONA_PUNTOS = 10;
export const RECIENTES_ZONA_PUNTOS = 10;
export const RECIENTES_ZONA_MIN_REPORTES = 10;
export const CLIMA_ZONA_LLUVIA_MIN_MM = 15;
export const MAX_EDAD_REPORTE_HORAS = 24;

interface Cell {
  gx: number;
  gy: number;
  id: string;
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

export function cellBounds(lat: number, lng: number): Cell {
  const gx = Math.floor(lng / CELL_LON_DEG);
  const gy = Math.floor(lat / CELL_LAT_DEG);
  const minLng = gx * CELL_LON_DEG;
  const maxLng = minLng + CELL_LON_DEG;
  const minLat = gy * CELL_LAT_DEG;
  const maxLat = minLat + CELL_LAT_DEG;
  return { gx, gy, id: `${gx}:${gy}`, minLat, minLng, maxLat, maxLng };
}

export function cellId(lat: number, lng: number): string {
  return cellBounds(lat, lng).id;
}

export function ageMultiplier(horas: number): number | null {
  if (horas < 2) return 1;
  if (horas < 6) return 0.8;
  if (horas < 12) return 0.6;
  if (horas < 24) return 0.4;
  return null;
}

export const DESC_PUNTOS: Record<DescriptionLevel, number> = {
  AGUA_CALLE: 5,
  NO_CIRCULAR: 10,
  AGUA_CASAS: 20,
  EVACUADOS: 35,
};

export function descripcionPuntos(nivel: DescriptionLevel): number {
  return DESC_PUNTOS[nivel];
}

export function climaPuntos(mm: number): number {
  if (mm <= 10) return 0;
  if (mm <= 25) return 5;
  if (mm <= 50) return 10;
  return 20;
}

export function puntajeReal(base: number, horas: number): number | null {
  const mult = ageMultiplier(horas);
  if (mult === null) return null;
  return Math.round(base * mult);
}

export function esReporteActivo(fecha: string, ahora: Date): boolean {
  const edadHoras = (ahora.getTime() - new Date(fecha).getTime()) / 3600000;
  return edadHoras >= 0 && edadHoras < MAX_EDAD_REPORTE_HORAS;
}

export interface ZonaPuntajeInput {
  cantidadReportes: number;
  promedioGravedad: number;
  lluviaMayor15mm: boolean;
  masDe10ReportesUltimaHora: boolean;
}

export function puntajeZona(input: ZonaPuntajeInput): number {
  return (
    input.cantidadReportes * REPORTE_ZONA_PUNTOS +
    input.promedioGravedad +
    (input.lluviaMayor15mm ? CLIMA_ZONA_PUNTOS : 0) +
    (input.masDe10ReportesUltimaHora ? RECIENTES_ZONA_PUNTOS : 0)
  );
}

export function nivelPorPuntaje(puntaje: number): ZoneLevel {
  if (puntaje <= 20) return "GRIS";
  if (puntaje <= 50) return "VERDE";
  if (puntaje <= 70) return "AMARILLO";
  if (puntaje <= 100) return "NARANJA";
  return "ROJO";
}
