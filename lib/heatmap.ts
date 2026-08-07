import { ageMultiplier } from "@/lib/zones";
import { Report } from "@/types/report";

export type HeatPoint = [number, number, number];

export interface HeatmapConfig {
  radius: number;
  blur: number;
  maxZoom: number;
  minOpacity: number;
  gradient: Record<string, string>;
  maxIntensity: number;
}

export const HEATMAP_CONFIG: HeatmapConfig = {
  radius: 30,
  blur: 20,
  maxZoom: 12,
  minOpacity: 0.05,
  gradient: {
    0.2: "#3b82f6",
    0.4: "#22c55e",
    0.6: "#eab308",
    0.8: "#f97316",
    1.0: "#ef4444",
  },
  maxIntensity: 60,
};

export function normalizeIntensity(
  intensidad: number,
  maxIntensidad: number
): number {
  if (!Number.isFinite(intensidad) || intensidad <= 0) return 0;
  return Math.min(intensidad / maxIntensidad, 1);
}

interface BuildHeatPointsOptions {
  ahora?: Date;
  maxIntensidad?: number;
}

export function buildHeatPoints(
  reports: Report[],
  options: BuildHeatPointsOptions = {}
): HeatPoint[] {
  const { ahora = new Date(), maxIntensidad = HEATMAP_CONFIG.maxIntensity } =
    options;

  const points: HeatPoint[] = [];
  for (const report of reports) {
    if (!Number.isFinite(report.latitud) || !Number.isFinite(report.longitud)) {
      continue;
    }

    const horas =
      (ahora.getTime() - new Date(report.fecha).getTime()) / 3600000;
    const multiplicador = ageMultiplier(horas);
    if (multiplicador === null) continue;

    const intensidad = report.puntajeBase * multiplicador;
    if (intensidad <= 0) continue;

    points.push([
      report.latitud,
      report.longitud,
      normalizeIntensity(intensidad, maxIntensidad),
    ]);
  }

  return points;
}
