import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || searchParams.get("address");
    const lang = searchParams.get("lang") || "es";

    if (!query || !query.trim()) {
      return NextResponse.json(
        { error: "Falta el parámetro 'q' con la dirección a geocodificar." },
        { status: 400 }
      );
    }

    const cleanQuery = query.trim();

    async function searchNominatim(
      searchTerm: string,
      useViewbox: boolean = true
    ) {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("q", searchTerm);
      url.searchParams.set("addressdetails", "1");
      url.searchParams.set("limit", "1");
      url.searchParams.set("countrycodes", "ar");
      if (useViewbox) {
        // Bounding box aproximado de Corrientes / Gran Corrientes / Resistencia
        url.searchParams.set("viewbox", "-59.10,-27.30,-58.60,-27.65");
        url.searchParams.set("bounded", "0");
      }

      const res = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          "Accept-Language": lang,
          "User-Agent": "INU-Corrientes-App/1.0 (info@inu.corrientes.gob.ar)",
        },
      });

      if (!res.ok) return null;
      const results = await res.json();
      if (Array.isArray(results) && results.length > 0) {
        return results[0];
      }
      return null;
    }

    // Estrategia 1: Consulta directa con contexto de Corrientes
    let result = await searchNominatim(
      `${cleanQuery}, Corrientes, Argentina`,
      true
    );

    // Estrategia 2: Consulta sin sufijo pero con viewbox
    if (!result) {
      result = await searchNominatim(cleanQuery, true);
    }

    // Estrategia 3: Consulta general en Argentina
    if (!result) {
      result = await searchNominatim(`${cleanQuery}, Argentina`, false);
    }

    // Estrategia 4: Si tiene número de calle y falló, intentar con la calle sola
    if (!result) {
      const withoutNumbers = cleanQuery.replace(/\b\d+\b/g, "").trim();
      if (withoutNumbers.length >= 3 && withoutNumbers !== cleanQuery) {
        result = await searchNominatim(
          `${withoutNumbers}, Corrientes, Argentina`,
          true
        );
      }
    }

    if (!result) {
      return NextResponse.json(
        { error: "No se encontraron coordenadas para la dirección ingresada." },
        { status: 404 }
      );
    }

    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    const addr = result.address || {};

    const street =
      addr.road ||
      addr.pedestrian ||
      addr.path ||
      addr.footway ||
      addr.street ||
      addr.avenue ||
      addr.residential ||
      "";
    const houseNumber = addr.house_number || "";
    const loc =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.municipality ||
      addr.suburb ||
      addr.county ||
      "Corrientes Capital";
    const dep = addr.county || addr.state_district || "Capital";

    return NextResponse.json(
      {
        lat,
        lon,
        display_name: result.display_name,
        direccion:
          street && houseNumber
            ? `${street} ${houseNumber}`
            : street || cleanQuery,
        localidad: loc,
        departamento: dep,
        address: addr,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=86400, s-maxage=86400",
        },
      }
    );
  } catch (error) {
    console.error("Error en geocoding /api/geocode:", error);
    return NextResponse.json(
      { error: "Error interno al geocodificar dirección" },
      { status: 500 }
    );
  }
}
