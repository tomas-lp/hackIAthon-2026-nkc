import { callesResistencia, callesCorrientes } from "./data.ts";

// Función de distancia de Levenshtein
export function levenshteinDistance(a: string, b: string): number {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) == a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function cleanStreetPrefixes(text: string): string {
  let cleaned = text
    .replace(/^(calle|avenida|av|pasaje|pje)\.?\s+/i, "")
    .trim();
  const alMatch = cleaned.match(/\s+al\s+$/i);
  if (alMatch) {
    cleaned = cleaned.replace(/\s+al\s+$/i, "").trim();
  }
  return cleaned;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
    .trim();
}

interface MatchResult {
  matchedStreet: string;
  city: string;
  distance: number;
}

function findBestMatchInList(
  normalizedTarget: string,
  streets: string[],
  city: string,
  rawTarget: string
): MatchResult | null {
  if (streets.length === 0) return null;

  let bestMatch = streets[0];
  let minDistance = Infinity;
  let minOriginalDistance = Infinity;

  const normalizedRawTarget = normalizeText(rawTarget);

  for (const street of streets) {
    // Limpiamos los prefijos ("Avenida", "Pasaje") y normalizamos la calle de la BD
    const cleanedStreet = cleanStreetPrefixes(street);
    const normalizedStreet = normalizeText(cleanedStreet);

    const distance = levenshteinDistance(normalizedTarget, normalizedStreet);

    if (distance < minDistance) {
      minDistance = distance;
      minOriginalDistance = levenshteinDistance(
        normalizedRawTarget,
        normalizeText(street)
      );
      bestMatch = street;
    } else if (distance === minDistance) {
      // Desempate: comparar el string original que escribió el usuario contra el string original de la BD
      const originalDistance = levenshteinDistance(
        normalizedRawTarget,
        normalizeText(street)
      );
      if (originalDistance < minOriginalDistance) {
        minOriginalDistance = originalDistance;
        bestMatch = street;
      }
    }
  }

  return { matchedStreet: bestMatch, city, distance: minDistance };
}

export function findBestStreetMatch(
  rawExtractedText: string,
  phoneNumber?: string
): {
  street: string;
  number: string;
  city: string;
  fullAddress: string;
} | null {
  if (!rawExtractedText || rawExtractedText.trim() === "") return null;

  // Extraemos la altura (número) del final del texto si existe
  const numberMatch = rawExtractedText.trim().match(/(\d+)$/);
  let streetName = rawExtractedText;
  let height = "";

  if (numberMatch) {
    height = numberMatch[1];
    streetName = rawExtractedText
      .trim()
      .replace(/\s*\d+$/, "")
      .trim();
  }

  // Removemos palabras genéricas que a veces extrae la IA (ej: "calle", "avenida") para mejorar el matching
  const cleanStreetName = cleanStreetPrefixes(streetName);

  const normalizedInput = normalizeText(cleanStreetName);

  let targetCity = "unknown";
  if (phoneNumber) {
    const p = phoneNumber;
    // Chequear prefijos argentinos (ignorando el 54)
    if (p.includes("3624") || p.includes("3625")) {
      targetCity = "Resistencia";
    } else if (p.includes("3794") || p.includes("3795")) {
      targetCity = "Corrientes";
    }
  }

  let bestGlobalMatch: MatchResult | null = null;

  if (targetCity === "Resistencia") {
    bestGlobalMatch = findBestMatchInList(
      normalizedInput,
      callesResistencia,
      "Resistencia, Chaco",
      streetName
    );
  } else if (targetCity === "Corrientes") {
    bestGlobalMatch = findBestMatchInList(
      normalizedInput,
      callesCorrientes,
      "Corrientes",
      streetName
    );
  } else {
    // Si no hay ciudad detectada (Telegram) o es desconocida, buscamos en ambas y elegimos la mejor
    const matchRes = findBestMatchInList(
      normalizedInput,
      callesResistencia,
      "Resistencia, Chaco",
      streetName
    );
    const matchCor = findBestMatchInList(
      normalizedInput,
      callesCorrientes,
      "Corrientes",
      streetName
    );

    if (matchRes && matchCor) {
      if (matchRes.distance <= matchCor.distance) {
        bestGlobalMatch = matchRes;
      } else {
        bestGlobalMatch = matchCor;
      }
    } else if (matchRes) {
      bestGlobalMatch = matchRes;
    } else if (matchCor) {
      bestGlobalMatch = matchCor;
    }
  }

  if (!bestGlobalMatch) return null;

  // Tolerancia de distancia: Si la distancia es muy grande, tal vez no es una calle
  // Podría ser un umbral dinámico basado en la longitud de la cadena
  const maxAllowedDistance = Math.max(
    3,
    Math.floor(normalizedInput.length * 0.4)
  );

  if (bestGlobalMatch.distance > maxAllowedDistance) {
    console.warn(
      `Fuzzy match descartado por distancia muy alta (${bestGlobalMatch.distance}): input="${cleanStreetName}", match="${bestGlobalMatch.matchedStreet}"`
    );
    return null;
  }

  let fullAddress = bestGlobalMatch.matchedStreet;
  if (height) {
    fullAddress += ` ${height}`;
  }
  fullAddress += `, ${bestGlobalMatch.city}, Argentina`;

  return {
    street: bestGlobalMatch.matchedStreet,
    number: height,
    city: bestGlobalMatch.city,
    fullAddress,
  };
}
