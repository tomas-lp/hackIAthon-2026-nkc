import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ReportType, RiskLevel, ValidationStatus } from "@/types/report";

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

export const RISK_CONFIG: Record<
  RiskLevel,
  {
    label: string;
    bg: string;
    text: string;
    border: string;
    weight: number;
    color: string;
  }
> = {
  CRITICO: {
    label: "CRÍTICO",
    bg: "bg-red-500/10",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-500/30",
    weight: 1.0,
    color: "#ef4444",
  },
  ALTO: {
    label: "ALTO",
    bg: "bg-orange-500/10",
    text: "text-orange-600 dark:text-orange-400",
    border: "border-orange-500/30",
    weight: 0.75,
    color: "#f97316",
  },
  MEDIO: {
    label: "MEDIO",
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/30",
    weight: 0.5,
    color: "#eab308",
  },
  BAJO: {
    label: "BAJO",
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/30",
    weight: 0.25,
    color: "#3b82f6",
  },
};

export const TYPE_CONFIG: Record<ReportType, { label: string }> = {
  INUNDACION_URBANA: { label: "Calle Inundada / Anegamiento" },
  LLUVIAS_FUERTES: { label: "Lluvias Torrenciales" },
  GRANIZO: { label: "Caída de Granizo" },
  ANEGAMIENTO_VIVIENDA: { label: "Agua en Vivienda" },
};

export const STATUS_CONFIG: Record<
  ValidationStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  VALIDADO_CLIMA: {
    label: "Validado API Clima",
    bg: "bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-500/30",
  },
  PENDIENTE_VALIDACION: {
    label: "Pendiente Análisis",
    bg: "bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-500/30",
  },
  DESESTIMADO_SIN_ALERTA: {
    label: "Desestimado (Sin Lluvia)",
    bg: "bg-red-500/10",
    text: "text-red-700 dark:text-red-400",
    border: "border-red-500/30",
  },
  DESESTIMADO_IRRELEVANTE: {
    label: "Desestimado (No Lluvia)",
    bg: "bg-zinc-500/10",
    text: "text-zinc-600 dark:text-zinc-400",
    border: "border-zinc-500/30",
  },
};
