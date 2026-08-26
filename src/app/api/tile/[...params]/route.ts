import { NextRequest, NextResponse } from "next/server";

// Necesario para compatibilidad con Cloudflare Workers / Pages
export const runtime = "edge";

const IGN_TMS_BASE =
  "https://wms.ign.gob.ar/geoserver/gwc/service/tms/1.0.0/mapabase_gris@EPSG%3A3857@png";

// Cache de 24 horas — las tiles del mapa base no cambian frecuentemente
const CACHE_MAX_AGE = 60 * 60 * 24; // 86400 s

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ params: string[] }> }
) {
  const { params: segments } = await params;

  // segments = [z, x, "-y.png"]  (Leaflet TMS con {-y})
  if (!segments || segments.length < 3) {
    return new NextResponse("Bad request", { status: 400 });
  }

  const tileUrl = `${IGN_TMS_BASE}/${segments.join("/")}`;

  // Usar CF Cache API cuando está disponible (Workers/Pages)
  // En desarrollo o Node.js runtime, `caches` no existe — se omite silenciosamente
  const cache =
    typeof caches !== "undefined" ? await caches.open("ign-tiles-v1") : null;

  if (cache) {
    const cached = await cache.match(req.url);
    if (cached) return cached;
  }

  try {
    const upstream = await fetch(tileUrl);

    if (!upstream.ok) {
      return new NextResponse("Upstream error", { status: upstream.status });
    }

    const blob = await upstream.arrayBuffer();

    const response = new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": `public, max-age=${CACHE_MAX_AGE}, stale-while-revalidate=3600`,
        "Access-Control-Allow-Origin": "*",
      },
    });

    // Guardar en CF Cache para requests subsiguientes en el mismo edge node
    if (cache) {
      await cache.put(req.url, response.clone());
    }

    return response;
  } catch {
    return new NextResponse("Failed to fetch tile", { status: 502 });
  }
}
