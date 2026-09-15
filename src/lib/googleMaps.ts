/**
 * googleMaps.ts
 *
 * Helpers puros para el handoff de la ruta segura de INU hacia la app de
 * Google Maps con navegación paso a paso (voz).
 *
 * Usa Maps URLs universales (`https://www.google.com/maps/dir/?api=1...`),
 * que son gratuitas, no requieren API key y funcionan en Android, iOS y
 * escritorio (abren la app si está instalada, si no el navegador).
 *
 * Limitación conocida: Google recalcula la ruta con su propio grafo entre
 * origin/destino/waypoints, no acepta una polilínea arbitraria. Por eso se
 * envían hasta 3 waypoints intermedios muestreados de la polilínea segura
 * para "anclar" el recorrido y que rodee los reclamos.
 */

import { haversineM } from "@/lib/routing";

export type LatLng = [number, number];

/** Máximo de waypoints que acepta Google Maps en navegadores móviles. */
export const GOOGLE_MAPS_MAX_MOBILE_WAYPOINTS = 3;

/** Separación mínima entre waypoints para no mandar puntos redundantes. */
const MIN_WAYPOINT_SEPARATION_M = 150;

function isValidCoord([lat, lng]: LatLng): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function roundCoord(n: number): number {
  return Math.round(n * 1e5) / 1e5;
}

/**
 * Elige hasta `maxWaypoints` puntos intermedios de la polilínea para usar
 * como `waypoints` de Google Maps. Muestrea en fracciones (25/50/75%),
 * nunca incluye el origen ni el destino, y descarta puntos muy juntos.
 */
export function pickNavigationWaypoints(
  polyline: LatLng[],
  maxWaypoints: number = GOOGLE_MAPS_MAX_MOBILE_WAYPOINTS
): LatLng[] {
  if (!Array.isArray(polyline) || polyline.length < 3) return [];

  const max = Math.max(
    0,
    Math.min(maxWaypoints, GOOGLE_MAPS_MAX_MOBILE_WAYPOINTS)
  );
  if (max === 0) return [];

  const fractions = [0.25, 0.5, 0.75].slice(0, max);
  const picked: LatLng[] = [];

  for (const frac of fractions) {
    const idx = Math.max(
      1,
      Math.min(polyline.length - 2, Math.floor(polyline.length * frac))
    );
    const pt = polyline[idx];
    if (!isValidCoord(pt)) continue;

    const rounded: LatLng = [roundCoord(pt[0]), roundCoord(pt[1])];

    // Evita duplicados y puntos casi superpuestos (Google los ignoraría igual)
    const tooClose = picked.some(
      (p) => haversineM(p, rounded) < MIN_WAYPOINT_SEPARATION_M
    );
    const isDuplicate = picked.some(
      (p) => p[0] === rounded[0] && p[1] === rounded[1]
    );
    if (tooClose || isDuplicate) continue;

    picked.push(rounded);
  }

  return picked;
}

export interface NavigationRouteInput {
  /** Origen GPS que INU usó para calcular la ruta. Se envía explícito para
   *  que Google no re-geolocalice por su cuenta (en escritorio el "Tu ubicación"
   *  por IP se desfasa cuadras/km del punto real). */
  origin: LatLng;
  polyline: LatLng[];
  zone: { latitud: number; longitud: number };
}

/**
 * Construye la URL universal de Google Maps en modo navegación.
 * Incluye `origin` explícito (= punto que INU usó en el cálculo) para que el
 * inicio coincida con la ruta dibujada. En el celular ese punto ≈ GPS del
 * dispositivo y arranca el turn-by-turn con voz (`dir_action=navigate`); si
 * difiere (p. ej. probando en escritorio), Google muestra vista previa.
 */
export function buildGoogleMapsNavigationUrl(
  route: NavigationRouteInput
): string {
  const destination: LatLng = [
    roundCoord(route.zone.latitud),
    roundCoord(route.zone.longitud),
  ];

  const params = new URLSearchParams();
  params.set("api", "1");
  if (route.origin && isValidCoord(route.origin)) {
    params.set(
      "origin",
      `${roundCoord(route.origin[0])},${roundCoord(route.origin[1])}`
    );
  }
  params.set("destination", `${destination[0]},${destination[1]}`);

  const waypoints = pickNavigationWaypoints(route.polyline);
  if (waypoints.length > 0) {
    params.set(
      "waypoints",
      waypoints.map(([lat, lng]) => `${lat},${lng}`).join("|")
    );
  }

  params.set("travelmode", "driving");
  params.set("dir_action", "navigate");

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
