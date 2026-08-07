import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ReportType } from "@/types/report";

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

export const TYPE_CONFIG: Record<ReportType, { label: string }> = {
  INUNDACION_URBANA: { label: "Calle Inundada / Anegamiento" },
  LLUVIAS_FUERTES: { label: "Lluvias Torrenciales" },
  GRANIZO: { label: "Caída de Granizo" },
  ANEGAMIENTO_VIVIENDA: { label: "Agua en Vivienda" },
};
