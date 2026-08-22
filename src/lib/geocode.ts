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
