import { createClient } from "@supabase/supabase-js";

// Overpass API endpoints (fallback si el primero falla)
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://z.overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

// Query OverpassQL: todos los nodos y ways con amenity/healthcare de salud en la provincia de Corrientes
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

interface OsmElement {
  type: "node" | "way";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags: Record<string, string>;
}

interface HealthCenterRow {
  osm_id: number;
  nombre: string;
  tipo: "SAPS" | "CAPS" | "HOSPITAL";
  localidad: string | null;
  departamento: string | null;
  direccion: string | null;
  lat: number | null;
  lon: number | null;
  location: string | null;
  codigo_postal: string | null;
  sitio_web: string | null;
  updated_at: string;
}

function mapAmenityToTipo(
  amenity: string | undefined,
  healthcare: string | undefined
): "SAPS" | "CAPS" | "HOSPITAL" {
  const tag = amenity || healthcare || "";
  switch (tag) {
    case "hospital":
      return "HOSPITAL";
    case "health_post":
      return "SAPS";
    case "centre":
    case "clinic":
    case "doctors":
    default:
      return "CAPS";
  }
}

function buildDireccion(tags: Record<string, string>): string | null {
  const street = tags["addr:street"] ?? null;
  const number = tags["addr:housenumber"] ?? null;
  if (street && number) return `${street} ${number}`;
  if (street) return street;
  return null;
}

function mapOsmElement(el: OsmElement): HealthCenterRow | null {
  const tags = el.tags ?? {};
  const nombre = tags["name"] ?? tags["official_name"] ?? null;
  if (!nombre) return null; // Sin nombre no tiene sentido agregar el registro

  const lat = el.lat ?? el.center?.lat ?? null;
  const lon = el.lon ?? el.center?.lon ?? null;

  // Validar que las coordenadas sean razonables para Corrientes (NE Argentina)
  const hasValidCoords =
    lat !== null &&
    lon !== null &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -30.5 &&
    lat <= -26.5 &&
    lon >= -60.5 &&
    lon <= -56.5;

  const location =
    hasValidCoords && lat !== null && lon !== null
      ? `POINT(${lon} ${lat})`
      : null;

  return {
    osm_id: el.id,
    nombre,
    tipo: mapAmenityToTipo(tags["amenity"], tags["healthcare"]),
    localidad:
      tags["addr:city"] ??
      tags["addr:suburb"] ??
      tags["addr:town"] ??
      tags["addr:village"] ??
      null,
    departamento: tags["addr:state"] ?? null,
    direccion: buildDireccion(tags),
    lat: hasValidCoords ? lat : null,
    lon: hasValidCoords ? lon : null,
    location,
    codigo_postal: tags["addr:postcode"] ?? null,
    sitio_web: tags["website"] ?? tags["contact:website"] ?? null,
    updated_at: new Date().toISOString(),
  };
}

async function fetchOverpass(): Promise<OsmElement[]> {
  const body = `data=${encodeURIComponent(OVERPASS_QUERY)}`;
  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": "hackIAthon-2026-nkc/1.0 (crisis dashboard)",
  };

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      console.log(`Consultando Overpass: ${endpoint}`);
      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body,
      });
      if (!res.ok) {
        console.warn(`Overpass ${endpoint} respondió ${res.status}`);
        continue;
      }
      const data = await res.json();
      if (!Array.isArray(data.elements)) {
        console.warn(`Overpass ${endpoint} sin campo elements`);
        continue;
      }
      console.log(
        `Overpass OK: ${data.elements.length} elementos desde ${endpoint}`
      );
      return data.elements as OsmElement[];
    } catch (e) {
      console.warn(`Overpass ${endpoint} falló: ${e}`);
    }
  }
  throw new Error("Todos los endpoints de Overpass fallaron");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({
        error: "Variables de entorno de Supabase no configuradas",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 1. Obtener elementos de OSM via Overpass
    const elements = await fetchOverpass();

    // 2. Mapear elementos a filas de la tabla
    const osmIds = new Set<number>();
    const rows: HealthCenterRow[] = [];

    for (const el of elements) {
      if (osmIds.has(el.id)) continue; // deduplicar por osm_id
      const row = mapOsmElement(el);
      if (!row) continue;
      osmIds.add(el.id);
      rows.push(row);
    }

    if (rows.length === 0) {
      throw new Error(
        "No se encontraron centros de salud con nombre en Corrientes via Overpass"
      );
    }

    console.log(`Registros a sincronizar: ${rows.length}`);

    // 3. Obtener osm_ids actuales para calcular bajas
    const { data: currentRows, error: fetchErr } = await supabase
      .from("health_centers")
      .select("osm_id");

    if (fetchErr) throw fetchErr;

    const currentOsmIds = new Set(
      (currentRows ?? [])
        .map((r: { osm_id: number | null }) => r.osm_id)
        .filter((id): id is number => id !== null)
    );

    // 4. UPSERT de nuevos y modificados
    const BATCH_SIZE = 100;
    let upsertedCount = 0;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const { error: upsertErr } = await supabase
        .from("health_centers")
        .upsert(batch, { onConflict: "osm_id" });
      if (upsertErr) throw upsertErr;
      upsertedCount += batch.length;
    }

    // 5. Eliminar centros que ya no están en OSM
    const newOsmIds = new Set(rows.map((r) => r.osm_id));
    const idsToDelete = [...currentOsmIds].filter((id) => !newOsmIds.has(id));

    let deletedCount = 0;
    if (idsToDelete.length > 0) {
      const { error: deleteErr } = await supabase
        .from("health_centers")
        .delete()
        .in("osm_id", idsToDelete);
      if (deleteErr) throw deleteErr;
      deletedCount = idsToDelete.length;
    }

    const insertedCount = rows.filter(
      (r) => !currentOsmIds.has(r.osm_id)
    ).length;
    const updatedCount = upsertedCount - insertedCount;

    return new Response(
      JSON.stringify({
        success: true,
        source: "OpenStreetMap (Overpass API)",
        total: rows.length,
        inserted: insertedCount,
        updated: updatedCount,
        deleted: deletedCount,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Error en sincronización OSM:", errorMsg);
    return new Response(JSON.stringify({ success: false, error: errorMsg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
