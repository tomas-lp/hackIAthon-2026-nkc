import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ReportType, ZoneLevel } from "@/types/report";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return isoString;
  }
}

export const ZONE_CONFIG: Record<
  ZoneLevel,
  { label: string; rango: string; color: string }
> = {
  GRIS: { label: "Sin evidencia suficiente", rango: "0-15", color: "#6b7280" },
  VERDE: { label: "Riesgo muy bajo", rango: "16-35", color: "#22c55e" },
  AMARILLO: { label: "Riesgo moderado", rango: "36-60", color: "#eab308" },
  NARANJA: { label: "Riesgo alto", rango: "61-85", color: "#f97316" },
  ROJO: { label: "Riesgo crítico", rango: ">85", color: "#ef4444" },
};

export const TYPE_CONFIG: Record<ReportType, { label: string }> = {
  INUNDACION_URBANA: { label: "Calle Inundada / Anegamiento" },
  LLUVIAS_FUERTES: { label: "Lluvias Torrenciales" },
  GRANIZO: { label: "Caída de Granizo" },
  ANEGAMIENTO_VIVIENDA: { label: "Agua en Vivienda" },
};
