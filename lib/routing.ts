/**
 * routing.ts
 *
 * Motor de rutas seguras basado en OSRM (API pública gratuita).
 *
 * Arquitectura:
 *   1. fetchOsrmRoute     — obtiene polilínea desde OSRM
 *   2. computeRouteRisk   — calcula el riesgo acumulado de una ruta usando el mapa de calor
 *   3. computeRouteCost   — Costo = Distancia × (1 + Riesgo × Factor)
 *   4. findSafestRoute    — evalúa todas las zonas seguras y devuelve la de menor costo
 */

import { SafeZone } from "@/types/safeZone";
import { HeatPoint } from "@/lib/heatmap";

// ─── Tipos públicos ────────────────────────────────────────────────────────────

export interface RouteResult {
  zone: SafeZone;
  /** Coordenadas [lat, lng] de la polilínea */
  polyline: [number, number][];
  /** Distancia total en metros */
  distanceM: number;
  /** Duración estimada en segundos */
  durationSec: number;
  /** Puntuación de riesgo acumulado normalizada [0, ∞) */
  riskScore: number;
  /** Costo ponderado: distanceM × (1 + riskScore × RISK_FACTOR) */
  cost: number;
}

// ─── Constantes ────────────────────────────────────────────────────────────────

/** Radio en metros dentro del cual un punto de calor "contamina" un tramo de ruta */
const RISK_RADIUS_M = 150;

const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";

// ─── Utilidades geográficas ───────────────────────────────────────────────────

/**
 * Distancia haversine en metros entre dos puntos [lat, lng].
 */
export function haversineM(
  [lat1, lng1]: [number, number],
  [lat2, lng2]: [number, number]
): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Distancia mínima en metros de un punto P al segmento AB.
 * Usada para determinar si un punto de calor "toca" un tramo de ruta.
 */
function pointToSegmentDistanceM(
  p: [number, number],
  a: [number, number],
  b: [number, number]
): number {
  const abLen = haversineM(a, b);
  if (abLen < 1) return haversineM(p, a);

  // Proyección escalar de AP sobre AB (aproximación lineal suficiente para radios pequeños)
  const apLat = p[0] - a[0];
  const apLng = p[1] - a[1];
  const abLat = b[0] - a[0];
  const abLng = b[1] - a[1];

  const t = Math.max(
    0,
    Math.min(1, (apLat * abLat + apLng * abLng) / (abLat ** 2 + abLng ** 2))
  );

  const closest: [number, number] = [a[0] + t * abLat, a[1] + t * abLng];
  return haversineM(p, closest);
}

// ─── 1. fetchOsrmRoutes ──────────────────────────────────────────────────────

/**
 * Llama a la API pública de OSRM solicitando alternativas y opcionalmente puntos intermedios (waypoints).
 * Retorna un array con todas las rutas candidatas encontradas.
 */
export async function fetchOsrmRoutes(
  origin: [number, number],
  destination: [number, number],
  waypoints: [number, number][] = []
): Promise<
  Array<{
    polyline: [number, number][];
    distanceM: number;
    durationSec: number;
  }>
> {
  const points = [origin, ...waypoints, destination];
  const waypointsStr = points.map(([lat, lng]) => `${lng},${lat}`).join(";");

  // Si hay waypoints de desvío, no pedimos alternativas para no saturar; si es directo, pedimos alternatives=true
  const altParam =
    waypoints.length === 0
      ? "?overview=full&geometries=geojson&alternatives=true"
      : "?overview=full&geometries=geojson";
  const url = `${OSRM_BASE}/${waypointsStr}${altParam}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return [];

    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.length) return [];

    return data.routes.map(
      (route: {
        geometry: { coordinates: [number, number][] };
        distance: number;
        duration: number;
      }) => ({
        polyline: (route.geometry.coordinates as [number, number][]).map(
          ([lng, lat]) => [lat, lng]
        ),
        distanceM: route.distance,
        durationSec: route.duration,
      })
    );
  } catch (err) {
    console.warn("Error fetching OSRM route:", err);
    return [];
  }
}

/** Compatibilidad: devuelve la primera ruta de OSRM */
export async function fetchOsrmRoute(
  origin: [number, number],
  destination: [number, number]
) {
  const routes = await fetchOsrmRoutes(origin, destination);
  if (routes.length === 0) {
    throw new Error("No se pudo obtener ruta de OSRM.");
  }
  return routes[0];
}

// ─── 2. computeRouteRisk ─────────────────────────────────────────────────────

/**
 * Calcula el riesgo acumulado de una ruta cruzándola con el mapa de calor.
 *
 * Para cada punto de calor verifica si está a menos de RISK_RADIUS_M de algún
 * segmento de la polilínea; si es así, acumula su intensidad.
 *
 * Resultado: número en [0, ∞). A mayor valor, más peligrosa la ruta.
 */
export function computeRouteRisk(
  polyline: [number, number][],
  heatPoints: HeatPoint[]
): number {
  if (polyline.length < 2 || heatPoints.length === 0) return 0;

  let totalRisk = 0;

  for (const [hLat, hLng, intensity] of heatPoints) {
    const hp: [number, number] = [hLat, hLng];
    let minDist = Infinity;

    for (let i = 0; i < polyline.length - 1; i++) {
      const dist = pointToSegmentDistanceM(hp, polyline[i], polyline[i + 1]);
      if (dist < minDist) minDist = dist;
      if (minDist < 1) break; // no puede mejorar más
    }

    if (minDist <= RISK_RADIUS_M) {
      // El riesgo decrece linealmente con la distancia al segmento más cercano
      const proximity = 1 - minDist / RISK_RADIUS_M;
      totalRisk += intensity * proximity;
    }
  }

  return totalRisk;
}

// ─── 3. computeRouteCost ─────────────────────────────────────────────────────

/**
 * Costo ponderado: Distancia × (1 + Riesgo × Factor).
 * Factor elevado (e.g. 30.0) garantiza que esquivar un punto de riesgo
 * sea fuertemente preferido sobre tomar el camino directo inundado.
 */
export function computeRouteCost(
  distanceM: number,
  riskScore: number,
  factor: number = 30.0
): number {
  return distanceM * (1 + riskScore * factor);
}

// ─── 4. Generador de Desvíos (Waypoints para esquivar reclamos) ─────────────

/**
 * Genera coordenadas de desvío (perpendiculares) alrededor de los puntos de calor
 * que interceptan una polilínea para forzar a OSRM a calcular un camino que esquive el reclamo.
 */
function generateDetourWaypoints(
  polyline: [number, number][],
  heatPoints: HeatPoint[]
): [number, number][] {
  const detours: [number, number][] = [];

  for (const [hLat, hLng, intensity] of heatPoints) {
    if (intensity < 0.05) continue;
    const hp: [number, number] = [hLat, hLng];

    // Buscar si el punto de reclamo está cerca de la polilínea
    for (let i = 0; i < polyline.length - 1; i++) {
      const dist = pointToSegmentDistanceM(hp, polyline[i], polyline[i + 1]);
      if (dist <= RISK_RADIUS_M) {
        // Generar puntos de desvío desplazados a la izquierda y derecha a 350m y 600m
        const deltaLat = polyline[i + 1][0] - polyline[i][0];
        const deltaLng = polyline[i + 1][1] - polyline[i][1];
        const len = Math.sqrt(deltaLat * deltaLat + deltaLng * deltaLng);

        if (len > 0) {
          // Offsets en grados (~0.0035 y ~0.006 ≈ 350m y 600m)
          const offsets = [0.0035, 0.006];
          for (const offset of offsets) {
            const perpLat = (-deltaLng / len) * offset;
            const perpLng = (deltaLat / len) * offset;

            detours.push([hLat + perpLat, hLng + perpLng]);
            detours.push([hLat - perpLat, hLng - perpLng]);
          }
        }
        break;
      }
    }
  }

  return detours;
}

// ─── 5. findBestRouteToZone ──────────────────────────────────────────────────

/**
 * Busca y evalúa múltiples rutas (directas, alternativas OSRM y con desvíos)
 * para una zona segura específica y retorna la que tenga menor costo de riesgo.
 */
export async function routeToZone(
  userLocation: [number, number],
  zone: SafeZone,
  heatPoints: HeatPoint[]
): Promise<RouteResult> {
  const destination: [number, number] = [zone.latitud, zone.longitud];

  // 1. Obtener rutas directas y alternativas de OSRM
  const initialCandidates = await fetchOsrmRoutes(userLocation, destination);

  const candidatePool: Array<{
    polyline: [number, number][];
    distanceM: number;
    durationSec: number;
  }> = [...initialCandidates];

  // 2. Si las rutas iniciales pasan por zonas de riesgo, generar desvíos
  for (const candidate of initialCandidates) {
    const risk = computeRouteRisk(candidate.polyline, heatPoints);
    if (risk > 0.01) {
      const detourWaypoints = generateDetourWaypoints(
        candidate.polyline,
        heatPoints
      );

      // Probar cada punto de desvío
      const detourPromises = detourWaypoints
        .slice(0, 8)
        .map((wp) => fetchOsrmRoutes(userLocation, destination, [wp]));

      const detourResults = await Promise.all(detourPromises);
      for (const routes of detourResults) {
        candidatePool.push(...routes);
      }
    }
  }

  if (candidatePool.length === 0) {
    throw new Error(`No se encontró ninguna ruta hacia la zona ${zone.nombre}`);
  }

  // 3. Evaluar cada candidato con el costo ponderado (Distancia × (1 + Riesgo * Factor))
  const evaluated: RouteResult[] = candidatePool.map((c) => {
    const riskScore = computeRouteRisk(c.polyline, heatPoints);
    const cost = computeRouteCost(c.distanceM, riskScore);
    return {
      zone,
      polyline: c.polyline,
      distanceM: c.distanceM,
      durationSec: c.durationSec,
      riskScore,
      cost,
    };
  });

  // Ordenar por menor costo total y devolver la mejor
  evaluated.sort((a, b) => a.cost - b.cost);
  return evaluated[0];
}

// ─── 6. findSafestRoute ──────────────────────────────────────────────────────

/**
 * Evalúa todas las zonas seguras con alternativas y desvíos alrededor de los reclamos,
 * eligiendo la zona y ruta que ofrezcan el menor costo ponderado total.
 */
export async function findSafestRoute(
  userLocation: [number, number],
  safeZones: SafeZone[],
  heatPoints: HeatPoint[]
): Promise<RouteResult | null> {
  if (safeZones.length === 0) return null;

  const settled = await Promise.allSettled(
    safeZones.map((zone) => routeToZone(userLocation, zone, heatPoints))
  );

  const results: RouteResult[] = [];
  for (const result of settled) {
    if (result.status === "fulfilled" && result.value) {
      results.push(result.value);
    }
  }

  if (results.length === 0) return null;

  // Re-evaluar / ordenar por menor costo total
  results.sort((a, b) => a.cost - b.cost);
  return results[0];
}
