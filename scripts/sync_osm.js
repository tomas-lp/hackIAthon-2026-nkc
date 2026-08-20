#!/usr/bin/env node
/**
 * sync_osm.js — Carga centros de salud de OpenStreetMap (Overpass API) en Supabase
 *
 * Uso: node scripts/sync_osm.js
 * Requiere: .env con NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Carga manual del .env (sin dotenv como dependencia)
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed
      .slice(eqIdx + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = val;
  }
}

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(
  /^"|"$/g,
  ""
);
const SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").replace(
  /^"|"$/g,
  ""
);

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "❌ Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Overpass endpoints (fallback)
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://z.overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

// Query OverpassQL: hospitales, clínicas y centros de salud en la provincia de Corrientes
// Usamos Bounding Box (south, west, north, east) para respuestas instantáneas sin 504/timeouts
const OVERPASS_QUERY = `
[out:json][timeout:60];
(
  node["amenity"~"^(hospital|clinic|doctors|health_post)$"](-30.85, -59.95, -27.05, -55.50);
  way["amenity"~"^(hospital|clinic|doctors|health_post)$"](-30.85, -59.95, -27.05, -55.50);
  node["healthcare"~"^(centre|clinic|health_post|hospital)$"](-30.85, -59.95, -27.05, -55.50);
  way["healthcare"~"^(centre|clinic|health_post|hospital)$"](-30.85, -59.95, -27.05, -55.50);
);
out center tags;
`.trim();

function mapAmenityToTipo(amenity, healthcare, nombre = "") {
  const n = (nombre || "").toUpperCase();
  if (
    n.includes("SAPS") ||
    n.includes("S.A.P.S") ||
    n.includes("SALUD DE ATENCION PRIMARIA") ||
    n.includes("SALA DE ATENCION PRIMARIA") ||
    n.includes("SALA DE SALUD")
  )
    return "SAPS";
  if (n.includes("CAPS") || n.includes("C.A.P.S")) return "CAPS";
  return "HOSPITAL";
}

/**
 * Normaliza un nombre para comparación: minúsculas, sin tildes, sin
 * caracteres especiales, colapsa espacios.
 */
function normalizeName(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita tildes
    .replace(/[^a-z0-9 ]/g, " ") // quita caracteres especiales
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Puntúa la completitud de un registro (más datos = más puntos).
 * Se usa para elegir el mejor registro entre duplicados.
 */
function completenessScore(row) {
  return (
    (row.lat !== null ? 2 : 0) +
    (row.direccion ? 1 : 0) +
    (row.localidad ? 1 : 0) +
    (row.codigo_postal ? 1 : 0) +
    (row.sitio_web ? 1 : 0) +
    (row.departamento ? 1 : 0)
  );
}

/**
 * Deduplica filas de OSM por proximidad espacial (~50 m) + nombre normalizado.
 * Dentro de cada grupo de duplicados conserva el registro más completo.
 *
 * Estrategia: redondear lat/lon a 3 decimales ≈ 111 m de celda.
 * Si dos registros caen en la misma celda Y tienen nombre normalizado idéntico
 * → son duplicados → nos quedamos con el de mayor completeness score.
 */
function deduplicateRows(rows) {
  // Mapa: clave → mejor registro
  const byKey = new Map();

  for (const row of rows) {
    // Clave espacial: celda de ~111 m x nombre normalizado
    const latBin = row.lat !== null ? row.lat.toFixed(3) : "null";
    const lonBin = row.lon !== null ? row.lon.toFixed(3) : "null";
    const nameKey = normalizeName(row.nombre);
    const key = `${latBin}|${lonBin}|${nameKey}`;

    const existing = byKey.get(key);
    if (!existing || completenessScore(row) > completenessScore(existing)) {
      byKey.set(key, row);
    }
  }

  return [...byKey.values()];
}

function buildDireccion(tags) {
  const street = tags["addr:street"] || null;
  const number = tags["addr:housenumber"] || null;
  if (street && number) return `${street} ${number}`;
  if (street) return street;
  return null;
}

function mapOsmElement(el) {
  const tags = el.tags || {};
  const nombre = tags["name"] || tags["official_name"] || null;
  if (!nombre) return null;

  const lat = el.lat !== undefined ? el.lat : el.center ? el.center.lat : null;
  const lon = el.lon !== undefined ? el.lon : el.center ? el.center.lon : null;

  // Validar coordenadas dentro de Corrientes
  const hasValidCoords =
    lat !== null &&
    lon !== null &&
    isFinite(lat) &&
    isFinite(lon) &&
    lat >= -30.5 &&
    lat <= -26.5 &&
    lon >= -60.5 &&
    lon <= -56.5;

  return {
    osm_id: el.id,
    nombre,
    tipo: mapAmenityToTipo(tags["amenity"], tags["healthcare"], nombre),
    localidad:
      tags["addr:city"] ||
      tags["addr:suburb"] ||
      tags["addr:town"] ||
      tags["addr:village"] ||
      null,
    departamento: tags["addr:state"] || null,
    direccion: buildDireccion(tags),
    lat: hasValidCoords ? lat : null,
    lon: hasValidCoords ? lon : null,
    location: hasValidCoords ? `POINT(${lon} ${lat})` : null,
    codigo_postal: tags["addr:postcode"] || null,
    sitio_web: tags["website"] || tags["contact:website"] || null,
    updated_at: new Date().toISOString(),
  };
}

async function fetchOverpass() {
  const body = `data=${encodeURIComponent(OVERPASS_QUERY)}`;
  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": "hackIAthon-2026-nkc/1.0 (crisis dashboard sync script)",
  };

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      console.log(`→ Consultando: ${endpoint}`);
      const res = await fetch(endpoint, { method: "POST", headers, body });
      if (!res.ok) {
        console.warn(`  ⚠ Respondió ${res.status}`);
        continue;
      }
      const data = await res.json();
      if (!Array.isArray(data.elements)) {
        console.warn(`  ⚠ Sin campo 'elements'`);
        continue;
      }
      console.log(`  ✓ ${data.elements.length} elementos recibidos`);
      return data.elements;
    } catch (e) {
      console.warn(`  ⚠ Error: ${e.message}`);
    }
  }
  throw new Error("Todos los endpoints de Overpass fallaron");
}

async function main() {
  console.log("=== sync_osm.js: Carga de Centros de Salud desde OSM ===\n");

  // 1. Fetch Overpass
  const elements = await fetchOverpass();

  // 2. Mapear y deduplicar por osm_id
  const seen = new Set();
  const rawRows = [];
  for (const el of elements) {
    if (seen.has(el.id)) continue;
    const row = mapOsmElement(el);
    if (!row) continue;
    seen.add(el.id);
    rawRows.push(row);
  }

  // 2b. Deduplicar por proximidad (~111m) + nombre normalizado
  const rows = deduplicateRows(rawRows);
  const dupCount = rawRows.length - rows.length;

  console.log(`\n✓ Elementos mapeados:         ${rawRows.length}`);
  if (dupCount > 0) {
    console.log(
      `  Duplicados eliminados:      ${dupCount} (mismo lugar + nombre similar)`
    );
  }
  console.log(`  Registros únicos finales:   ${rows.length}`);
  const withCoords = rows.filter((r) => r.lat !== null).length;
  const withoutCoords = rows.length - withCoords;
  console.log(`  Con coordenadas:            ${withCoords}`);
  console.log(
    `  Sin coordenadas:            ${withoutCoords} (no se mostrarán en el mapa)`
  );

  const byTipo = rows.reduce((acc, r) => {
    acc[r.tipo] = (acc[r.tipo] || 0) + 1;
    return acc;
  }, {});
  console.log(`  Por tipo: ${JSON.stringify(byTipo)}\n`);

  if (rows.length === 0) {
    console.error("❌ Sin registros para insertar. Abortando.");
    process.exit(1);
  }

  // 3. Obtener osm_ids actuales para calcular bajas
  const { data: currentRows, error: fetchErr } = await supabase
    .from("health_centers")
    .select("osm_id");

  if (fetchErr) {
    console.error("❌ Error obteniendo datos actuales:", fetchErr.message);
    process.exit(1);
  }

  const currentOsmIds = new Set(
    (currentRows || []).map((r) => r.osm_id).filter((id) => id !== null)
  );
  console.log(`Registros actuales en DB: ${currentOsmIds.size}`);

  // 4. UPSERT por lotes de 100
  const BATCH_SIZE = 100;
  let upserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("health_centers")
      .upsert(batch, { onConflict: "osm_id" });
    if (error) {
      console.error(
        `❌ Error en upsert (lote ${Math.floor(i / BATCH_SIZE) + 1}):`,
        error.message
      );
      process.exit(1);
    }
    upserted += batch.length;
    process.stdout.write(`\r  Procesados: ${upserted}/${rows.length}`);
  }
  console.log("\n  ✓ Upsert completo");

  // 4b. Limpieza de duplicados residuales en la DB (pueden venir de ejecuciones
  //     anteriores antes de esta lógica). Elimina filas donde otra fila más
  //     antigua tiene lat/lon dentro de ~50 m Y nombre normalizado idéntico.
  console.log("\nLimpiando duplicados residuales en la DB...");
  const { error: dedupeErr } = await supabase.rpc(
    "delete_duplicate_health_centers"
  );
  if (dedupeErr) {
    // No abortamos — la función puede no existir aún en instancias nuevas
    console.warn(`  ⚠ No se pudo ejecutar limpieza SQL: ${dedupeErr.message}`);
  } else {
    console.log("  ✓ Limpieza completada");
  }

  // 5. Eliminar centros que ya no están en OSM
  //    GUARDIA DE SEGURIDAD: solo eliminamos si el nuevo dataset tiene AL MENOS
  //    tantos registros como la DB actual. Si tiene menos, Overpass devolvió una
  //    respuesta parcial (timeout/fallback) y no debemos borrar datos válidos.
  const newOsmIds = new Set(rows.map((r) => r.osm_id));
  const toDelete = [...currentOsmIds].filter((id) => !newOsmIds.has(id));

  if (toDelete.length > 0) {
    if (rows.length < currentOsmIds.size) {
      console.warn(
        `\n⚠ GUARDIA: Overpass devolvió ${rows.length} centros únicos pero la DB tiene` +
          ` ${currentOsmIds.size}. Posible respuesta parcial.` +
          ` Eliminación OMITIDA para proteger datos válidos.`
      );
    } else {
      console.log(`\nEliminando ${toDelete.length} centros obsoletos...`);
      const { error } = await supabase
        .from("health_centers")
        .delete()
        .in("osm_id", toDelete);
      if (error) {
        console.warn("⚠ Error al eliminar obsoletos:", error.message);
      } else {
        console.log(`  ✓ Eliminados: ${toDelete.length}`);
      }
    }
  }

  const inserted = rows.filter((r) => !currentOsmIds.has(r.osm_id)).length;
  const updated = upserted - inserted;

  console.log("\n=== Resultado ===");
  console.log(`  Total procesados: ${upserted}`);
  console.log(`  Nuevos:           ${inserted}`);
  console.log(`  Actualizados:     ${updated}`);
  console.log(`  Eliminados:       ${toDelete.length}`);
  console.log("\n✅ Sincronización OSM completada exitosamente.");
}

main().catch((err) => {
  console.error("\n❌ Error fatal:", err.message);
  process.exit(1);
});
