// Bounding Box para Corrientes Capital + Resistencia
// Lat: -27.55 to -27.40, Lon: -59.05 to -58.70
const VIEWBOX = "-59.05,-27.40,-58.70,-27.55";
const CITIES = ["Corrientes", "Resistencia"];

async function nominatimSearch(
  query: string,
  bounded: boolean
): Promise<{ lat: number; lon: number } | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("viewbox", VIEWBOX);
  url.searchParams.set("bounded", bounded ? "1" : "0");
  url.searchParams.set("countrycodes", "ar");

  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "HackathonBot/1.0" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      // Verificar que caiga dentro de la región ampliada
      if (lat >= -27.6 && lat <= -27.35 && lon >= -59.1 && lon <= -58.65) {
        return { lat, lon };
      }
    }
  } catch (error) {
    console.error("Nominatim search error:", error);
  }
  return null;
}

export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lon: number } | null> {
  if (address.toLowerCase().includes("argentina")) {
    const exact = await nominatimSearch(address, true);
    if (exact) return exact;
    const loose = await nominatimSearch(address, false);
    if (loose) return loose;
  }

  // Estrategia 1: Buscar con cada ciudad, bounded=1 (estricto)
  for (const city of CITIES) {
    const result = await nominatimSearch(
      `${address}, ${city}, Argentina`,
      true
    );
    if (result) return result;
  }

  // Estrategia 2: Buscar con cada ciudad, bounded=0 (biased pero no restringido)
  for (const city of CITIES) {
    const result = await nominatimSearch(
      `${address}, ${city}, Corrientes, Argentina`,
      false
    );
    if (result) return result;
  }

  // Estrategia 3: Buscar solo con "Argentina" como fallback general
  const fallback = await nominatimSearch(`${address}, Argentina`, false);
  if (fallback) return fallback;

  console.warn(`Geocode: No se encontró "${address}" en ninguna estrategia.`);
  return null;
}
