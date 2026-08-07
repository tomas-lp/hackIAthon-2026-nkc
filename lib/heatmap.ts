import { ageMultiplier } from "@/lib/zones";
import { Report } from "@/types/report";

export type HeatPoint = [number, number, number];

export interface HeatmapConfig {
  radius: number;
  blur: number;
  radiusMeters: number;
  maxZoom: number;
  minOpacity: number;
  gradient: Record<string, string>;
  maxIntensity: number;
}

export const HEATMAP_CONFIG: HeatmapConfig = {
  radius: 30,
  blur: 20,
  radiusMeters: 100,
  maxZoom: 12,
  minOpacity: 0.05,
  gradient: {
    0.2: "#3b82f6",
    0.4: "#22c55e",
    0.6: "#eab308",
    0.8: "#f97316",
    1.0: "#ef4444",
  },
  maxIntensity: 80,
};

export function metersToPixels(
  metros: number,
  latitud: number,
  zoom: number
): number {
  const metrosPorPixel =
    (156543.03392 * Math.cos((latitud * Math.PI) / 180)) / Math.pow(2, zoom);
  return metros / metrosPorPixel;
}

export function heatmapRadiusAt(
  zoom: number,
  latitud: number
): { radius: number; blur: number } {
  const { radius, blur, radiusMeters } = HEATMAP_CONFIG;
  if (radiusMeters <= 0) return { radius, blur };

  const px = metersToPixels(radiusMeters, latitud, zoom);

  // Clamped to a minimum of 12px radius and 8px blur to prevent width/height from becoming 0
  // while keeping the circles smaller as requested by the user, and capped to 150px/100px.
  const r = Math.max(12, Math.min(150, Math.round(px)));
  const b = Math.max(8, Math.min(100, Math.round(px * (blur / radius))));

  return { radius: r, blur: b };
}

export function normalizeIntensity(
  intensidad: number,
  maxIntensidad: number
): number {
  if (!Number.isFinite(intensidad) || intensidad <= 0) return 0;
  return Math.min(intensidad / maxIntensidad, 1);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function lerpColor(hexA: string, hexB: string, t: number): string {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

export function heatColor(
  intensidad: number,
  maxIntensidad: number = HEATMAP_CONFIG.maxIntensity
): string {
  const valor = normalizeIntensity(intensidad, maxIntensidad);
  const stops = Object.entries(HEATMAP_CONFIG.gradient)
    .map(([stop, color]) => ({ stop: Number(stop), color }))
    .sort((a, b) => a.stop - b.stop);

  if (stops.length === 0) return "#3b82f6";
  if (valor <= stops[0].stop) return stops[0].color;
  if (valor >= stops[stops.length - 1].stop) {
    return stops[stops.length - 1].color;
  }

  for (let i = 0; i < stops.length - 1; i++) {
    const lower = stops[i];
    const upper = stops[i + 1];
    if (valor >= lower.stop && valor <= upper.stop) {
      const t = (valor - lower.stop) / (upper.stop - lower.stop);
      return lerpColor(lower.color, upper.color, t);
    }
  }

  return stops[stops.length - 1].color;
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
