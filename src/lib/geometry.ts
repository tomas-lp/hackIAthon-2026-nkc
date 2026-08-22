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
