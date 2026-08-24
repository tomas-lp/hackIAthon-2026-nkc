/**
 * Ray-casting algorithm para determinar si un punto esta dentro de un poligono.
 * El poligono se asume como una lista de coordenadas [lat, lng].
 *
 * @param point [lat, lng]
 * @param vs Array de [lat, lng]
 */
export function isPointInPolygon(
  point: [number, number],
  vs: [number, number][]
): boolean {
  const x = point[0];
  const y = point[1];

  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0],
      yi = vs[i][1];
    const xj = vs[j][0],
      yj = vs[j][1];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Evalúa si un punto [lat, lng] cae dentro de una geometría GeoJSON (Polygon o MultiPolygon).
 */
export function isPointInGeoJSONGeometry(
  point: [number, number],
  geometry: GeoJSON.Geometry
): boolean {
  if (!geometry) return false;

  if (geometry.type === "Polygon") {
    const ring = geometry.coordinates[0] || [];
    const vs: [number, number][] = ring.map(([lng, lat]) => [lat, lng]);
    return isPointInPolygon(point, vs);
  }

  if (geometry.type === "MultiPolygon") {
    for (const poly of geometry.coordinates) {
      const ring = poly[0] || [];
      const vs: [number, number][] = ring.map(([lng, lat]) => [lat, lng]);
      if (isPointInPolygon(point, vs)) return true;
    }
  }

  return false;
}

/**
 * Obtiene todos los puntos [lat, lng] de una geometría GeoJSON (Polygon o MultiPolygon)
 * para calcular centroides o bounding box.
 */
export function extractGeoJSONPoints(
  geometry: GeoJSON.Geometry
): [number, number][] {
  const points: [number, number][] = [];
  if (!geometry) return points;

  if (geometry.type === "Polygon") {
    const ring = geometry.coordinates[0] || [];
    for (const [lng, lat] of ring) {
      points.push([lat, lng]);
    }
  } else if (geometry.type === "MultiPolygon") {
    for (const poly of geometry.coordinates) {
      const ring = poly[0] || [];
      for (const [lng, lat] of ring) {
        points.push([lat, lng]);
      }
    }
  }

  return points;
}
