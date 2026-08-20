// Bounding Box para Corrientes Capital + Resistencia
// Lat: -27.55 to -27.40, Lon: -59.05 to -58.70
const VIEWBOX = "-59.05,-27.40,-58.70,-27.55";
const CITIES = ["Corrientes", "Resistencia"];

async function nominatimSearch(
  query: string,
  bounded: boolean
): Promise<{ lat: number; lon: number; barrio?: string } | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");
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
      let barrio: string | undefined = undefined;
      const addrDetails = data[0].address;
      if (addrDetails) {
        barrio =
          addrDetails.neighbourhood ||
          addrDetails.suburb ||
          addrDetails.residential ||
          addrDetails.city_district;
      }

      // Verificar que caiga dentro de la región ampliada
      if (lat >= -27.6 && lat <= -27.35 && lon >= -59.1 && lon <= -58.65) {
        return { lat, lon, barrio };
      }
    }
  } catch (error) {
    console.error("Nominatim search error:", error);
  }
  return null;
}

export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lon: number; barrio?: string } | null> {
  const tryGeocode = async (addr: string) => {
    if (addr.toLowerCase().includes("argentina")) {
      const exact = await nominatimSearch(addr, true);
      if (exact) return exact;
      const loose = await nominatimSearch(addr, false);
      if (loose) return loose;
    }

    // Estrategia 1: Buscar con cada ciudad, bounded=1 (estricto)
    for (const city of CITIES) {
      const result = await nominatimSearch(`${addr}, ${city}, Argentina`, true);
      if (result) return result;
    }

    // Estrategia 2: Buscar con cada ciudad, bounded=0 (biased pero no restringido)
    for (const city of CITIES) {
      const result = await nominatimSearch(
        `${addr}, ${city}, Corrientes, Argentina`,
        false
      );
      if (result) return result;
    }

    // Estrategia 3: Buscar solo con "Argentina" como fallback general
    const fallback = await nominatimSearch(`${addr}, Argentina`, false);
    if (fallback) return fallback;

    return null;
  };

  let coords = await tryGeocode(address);
  if (coords) return coords;

  // FALLBACK SEGURO
  const addrWithoutNumber = address
    .replace(/\b\d+\b/g, "")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
  if (addrWithoutNumber !== address && addrWithoutNumber.length > 3) {
    coords = await tryGeocode(addrWithoutNumber);
    if (coords) return coords;
  }

  console.warn(`Geocode: No se encontró "${address}" en ninguna estrategia.`);
  return null;
}

export async function reverseGeocodeAddress(
  lat: number,
  lon: number
): Promise<{ barrio?: string } | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "json");
  url.searchParams.set("lat", lat.toString());
  url.searchParams.set("lon", lon.toString());
  url.searchParams.set("addressdetails", "1");

  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "HackathonBot/1.0", "Accept-Language": "es" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.address) {
      const addrDetails = data.address;
      const barrio =
        addrDetails.neighbourhood ||
        addrDetails.suburb ||
        addrDetails.residential ||
        addrDetails.city_district;
      return { barrio };
    }
  } catch (error) {
    console.error("Nominatim reverse geocode error:", error);
  }
  return null;
}
