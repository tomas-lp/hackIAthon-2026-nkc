export function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return isoString;
  }
}

/**
 * Convierte un texto a Title Case (Primera letra en mayúscula, el resto en minúscula por palabra)
 */
export function formatTitleCase(str?: string | null): string {
  if (!str || typeof str !== "string") return "";
  return str
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) => {
      if (!word) return "";
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

/**
 * Formatea la dirección completa desde campos de BD.
 * Funciona con Report, SafeZone y HealthCenter.
 * Formato: "Calle 123, Ciudad, Provincia, Argentina"
 * Ejemplo: "Güemes 501, Resistencia, Chaco, Argentina"
 */
export function formatLocationAddress(record: {
  direccion?: string | null;
  barrio?: string | null;
  localidad?: string | null;
  provincia?: string | null;
  departamento?: string | null;
}): string | null {
  const street = record.direccion?.trim();
  const barrio = record.barrio?.trim();
  const locality = record.localidad?.trim();
  const prov = record.provincia?.trim();

  // Si no hay ningún dato de ubicación estructurado, devolver null para activar el fallback
  if (!street && !barrio && !locality && !prov) {
    return null;
  }

  const parts: string[] = [];

  if (street) {
    parts.push(street);
  } else if (barrio) {
    parts.push(`Barrio ${barrio}`);
  }

  if (
    locality &&
    !parts.some((p) => p.toLowerCase().includes(locality.toLowerCase()))
  ) {
    parts.push(locality);
  }

  if (
    prov &&
    !parts.some((p) => p.toLowerCase().includes(prov.toLowerCase()))
  ) {
    parts.push(prov);
  }

  if (
    parts.length > 0 &&
    !parts.some((p) => p.toLowerCase().includes("argentina"))
  ) {
    parts.push("Argentina");
  }

  return parts.join(", ");
}

export interface LocationAddressRecord {
  direccion?: string | null;
  barrio?: string | null;
  localidad?: string | null;
  provincia?: string | null;
  departamento?: string | null;
}

function normalizeLocationPart(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Formato corto para los detalles del mapa.
 * Solo muestra "Dirección, Localidad" y omite provincia y país.
 */
export function formatMapLocationAddress(
  record: LocationAddressRecord
): string | null {
  const rawAddress = record.direccion?.trim();
  const barrio = record.barrio?.trim();
  const locality = record.localidad?.trim();
  const province = record.provincia?.trim();

  if (!rawAddress && !barrio && !locality) {
    return null;
  }

  let address = rawAddress || (barrio ? `Barrio ${barrio}` : "");

  // Si la dirección ya viene completa, conserva solo lo anterior a la localidad.
  // Esto evita mostrar nuevamente provincia y país desde datos geocodificados.
  if (rawAddress && locality && rawAddress.includes(",")) {
    const parts = rawAddress.split(",").map((part) => part.trim());
    const localityIndex = parts.findIndex(
      (part, index) =>
        index > 0 &&
        normalizeLocationPart(part) === normalizeLocationPart(locality)
    );

    if (localityIndex > 0) {
      address = parts.slice(0, localityIndex).join(", ");
    } else {
      while (parts.length > 1) {
        const lastPart = normalizeLocationPart(parts[parts.length - 1]);
        const isCountry = lastPart === "argentina";
        const isProvince =
          !!province && lastPart === normalizeLocationPart(province);

        if (!isCountry && !isProvince) break;
        parts.pop();
      }
      address = parts.join(", ");
    }
  }

  const addressPart = address.trim();
  if (!locality) return addressPart || null;

  if (
    addressPart &&
    normalizeLocationPart(addressPart).includes(normalizeLocationPart(locality))
  ) {
    return addressPart;
  }

  return [addressPart, locality].filter(Boolean).join(", ") || null;
}

/** @deprecated Usar formatLocationAddress */
export const formatReportAddress = formatLocationAddress;
