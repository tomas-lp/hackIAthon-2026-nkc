export const MAX_EDAD_REPORTE_HORAS = 24;

export function ageMultiplier(horas: number): number | null {
  if (horas < 2) return 1;
  if (horas < 6) return 0.8;
  if (horas < 12) return 0.6;
  if (horas < 24) return 0.4;
  return null;
}

export function puntajeReal(base: number, horas: number): number | null {
  const mult = ageMultiplier(horas);
  if (mult === null) return null;
  return Math.round(base * mult);
}
