import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");
    const lang = searchParams.get("lang") || "es";

    if (!lat || !lon) {
      return NextResponse.json(
        { error: "Faltan los parámetros lat o lon" },
        { status: 400 }
      );
    }

    const upstreamUrl = new URL("https://nominatim.openstreetmap.org/reverse");
    upstreamUrl.searchParams.set("format", "jsonv2");
    upstreamUrl.searchParams.set("lat", lat);
    upstreamUrl.searchParams.set("lon", lon);
    upstreamUrl.searchParams.set("addressdetails", "1");

    const response = await fetch(upstreamUrl, {
      headers: {
        Accept: "application/json",
        "Accept-Language": lang,
        "User-Agent": "hakIA-grupo-11/1.0",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "No se pudo resolver la dirección" },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch (error) {
    console.error("Error resolving address via reverse geocoding:", error);
    return NextResponse.json(
      { error: "No se pudo resolver la dirección" },
      { status: 500 }
    );
  }
}
