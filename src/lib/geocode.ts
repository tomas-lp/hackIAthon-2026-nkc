const addressCache = new Map<string, string>();
const inFlight = new Map<string, Promise<string>>();

const MAX_CONCURRENT_REQUESTS = 4;
let activeRequests = 0;
const pendingQueue: Array<() => void> = [];

function acquire(): Promise<void> {
  if (activeRequests < MAX_CONCURRENT_REQUESTS) {
    activeRequests++;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    pendingQueue.push(resolve);
  });
}

function release(): void {
  activeRequests--;
  const next = pendingQueue.shift();
  if (next) {
    next();
  }
}

async function fetchAddress(lat: number, lon: number): Promise<string> {
  const response = await fetch(
    `/api/reverse-geocode?lat=${lat}&lon=${lon}&lang=es`
  );

  if (!response.ok) {
    throw new Error("No se pudo resolver la dirección");
  }

  const data = await response.json();
  const address = data.address ?? {};
  const street =
    address.road || address.pedestrian || address.path || address.footway;
  const houseNumber = address.house_number;
  const locality =
    address.city || address.town || address.village || address.suburb;
  const state = address.state || address.province;
  const country = address.country;

  const formattedAddress = [
    street && houseNumber ? `${street} ${houseNumber}` : street || houseNumber,
    locality,
    state,
    country,
  ].filter(Boolean);

  return (
    formattedAddress.join(", ") ||
    data.display_name ||
    "Ubicación no disponible"
  );
}

export interface ResolvedLocationDetails {
  direccion: string;
  localidad: string;
  departamento: string;
  fullAddress: string;
}

export async function resolveLocationDetails(
  lat: number,
  lon: number
): Promise<ResolvedLocationDetails> {
  try {
    const response = await fetch(
      `/api/reverse-geocode?lat=${lat}&lon=${lon}&lang=es`
    );

    if (!response.ok) {
      return {
        direccion: "Corrientes Capital",
        localidad: "Corrientes",
        departamento: "Capital",
        fullAddress: "Corrientes, Capital, Argentina",
      };
    }

    const data = await response.json();
    const address = data.address ?? {};

    const street =
      address.road ||
      address.pedestrian ||
      address.path ||
      address.footway ||
      address.street ||
      address.avenue ||
      address.highway ||
      address.residential ||
      "";
    const houseNumber = address.house_number || "";
    const placeName =
      address.amenity ||
      address.building ||
      address.school ||
      address.hospital ||
      address.leisure ||
      address.shop ||
      address.tourism ||
      "";
    const neighborhood =
      address.neighbourhood ||
      address.suburb ||
      address.quarter ||
      address.city_district ||
      "";

    let direccion = "";
    if (street && houseNumber) {
      direccion = `${street} ${houseNumber}`;
    } else if (street && placeName) {
      direccion = `${placeName}, ${street}`;
    } else if (street) {
      direccion = street;
    } else if (placeName) {
      direccion = placeName;
    } else if (neighborhood) {
      direccion = `Barrio ${neighborhood}`;
    } else if (data.display_name) {
      const parts = data.display_name.split(",").map((p: string) => p.trim());
      direccion = parts.slice(0, 2).join(", ");
    } else {
      direccion = "Corrientes";
    }

    const locality =
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      (neighborhood ? `Corrientes (${neighborhood})` : "Corrientes");

    const departamento =
      address.county ||
      address.state_district ||
      (locality.toLowerCase().includes("corrientes") ? "Capital" : "Capital");

    const parts = [direccion, locality, departamento].filter(Boolean);
    const fullAddress = data.display_name || parts.join(", ");

    return {
      direccion,
      localidad: locality,
      departamento,
      fullAddress,
    };
  } catch {
    return {
      direccion: "Corrientes Capital",
      localidad: "Corrientes",
      departamento: "Capital",
      fullAddress: "Corrientes, Capital, Argentina",
    };
  }
}

export async function resolveAddress(
  lat: number,
  lon: number
): Promise<string> {
  const key = `${lat.toFixed(5)},${lon.toFixed(5)}`;

  const cached = addressCache.get(key);
  if (cached) {
    return cached;
  }

  const existing = inFlight.get(key);
  if (existing) {
    return existing;
  }

  const promise = acquire()
    .then(() => fetchAddress(lat, lon))
    .finally(release)
    .then((address) => {
      addressCache.set(key, address);
      return address;
    })
    .catch((error: unknown) => {
      throw error;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}

export interface GeocodeResult {
  lat: number;
  lon: number;
  direccion: string;
  localidad: string;
  departamento: string;
  display_name: string;
}

export async function geocodeAddress(
  address: string
): Promise<GeocodeResult | null> {
  if (!address || !address.trim()) return null;
  try {
    const res = await fetch(
      `/api/geocode?q=${encodeURIComponent(address.trim())}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (Number.isFinite(data.lat) && Number.isFinite(data.lon)) {
      return data as GeocodeResult;
    }
    return null;
  } catch (e) {
    console.error("Error geocoding address:", e);
    return null;
  }
}
