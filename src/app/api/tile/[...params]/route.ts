import { NextRequest, NextResponse } from "next/server";

const IGN_TMS_BASE =
  "https://wms.ign.gob.ar/geoserver/gwc/service/tms/1.0.0/mapabase_gris@EPSG%3A3857@png";

const CACHE_MAX_AGE = 60 * 60 * 24; // 86400 s — tiles del mapa base son estables

// Si el IGN se cuelga, antes el Route Handler quedaba colgado hasta el
// timeout de Next/Vercel y el navegador mostraba 504 con el mapa en gris.
// Con timeout propio devolvemos 504 rápido para que Leaflet dispare
// `tileerror` y el frontend pueda caer al siguiente proveedor (ESRI).
const UPSTREAM_TIMEOUT_MS = 8000;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ params: string[] }> }
) {
  try {
    const { params: segments } = await params;

    if (!segments || segments.length < 3) {
      return new NextResponse("Bad request", { status: 400 });
    }

    const tileUrl = `${IGN_TMS_BASE}/${segments.join("/")}`;

    // --- CF Cache API (no-op silencioso si no está disponible) ---
    let cfCache: Cache | null = null;
    try {
      if (typeof caches !== "undefined") {
        cfCache = await caches.open("ign-tiles-v1");
        const cached = await cfCache.match(req.url);
        if (cached) return cached;
      }
    } catch {
      cfCache = null; // fuera de CF Workers o error de inicialización
    }

    // --- Fetch upstream (con timeout para no colgar el mapa) ---
    const upstream = await fetch(tileUrl, {
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    if (!upstream.ok) {
      return new NextResponse("Upstream error", { status: upstream.status });
    }

    const body = await upstream.arrayBuffer();

    const response = new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": `public, max-age=${CACHE_MAX_AGE}, stale-while-revalidate=3600`,
        "Access-Control-Allow-Origin": "*",
      },
    });

    // Guardar en CF Cache (silencioso si falla)
    try {
      if (cfCache) await cfCache.put(req.url, response.clone());
    } catch {
      // ignorar — la respuesta ya está lista igual
    }

    return response;
  } catch (err) {
    console.error("[tile-proxy] error:", err);
    const isTimeout = err instanceof Error && err.name === "TimeoutError";
    return new NextResponse(
      isTimeout ? "Upstream timeout" : "Internal server error",
      {
        status: isTimeout ? 504 : 500,
      }
    );
  }
}
