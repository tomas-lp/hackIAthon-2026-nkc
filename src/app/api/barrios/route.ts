import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");
    const address = searchParams.get("address");
    const save = searchParams.get("save");

    let finalLat = lat;
    let finalLon = lon;
    let barrio = "Desconocido";

    if (address && (!lat || !lon)) {
      const geocodeUrl = new URL("https://nominatim.openstreetmap.org/search");
      geocodeUrl.searchParams.set(
        "q",
        `${address}, Resistencia, Chaco, Argentina`
      );
      geocodeUrl.searchParams.set("format", "json");
      geocodeUrl.searchParams.set("limit", "1");
      geocodeUrl.searchParams.set("addressdetails", "1");

      const res = await fetch(geocodeUrl.toString(), {
        headers: { "User-Agent": "HackathonBot/1.0" },
      });
      const data = await res.json();
      if (data && data.length > 0) {
        finalLat = data[0].lat;
        finalLon = data[0].lon;
        const addrDetails = data[0].address;
        if (addrDetails) {
          barrio =
            addrDetails.neighbourhood ||
            addrDetails.suburb ||
            addrDetails.residential ||
            addrDetails.city_district ||
            barrio;
        }
      }
    } else if (finalLat && finalLon) {
      const reverseUrl = new URL("https://nominatim.openstreetmap.org/reverse");
      reverseUrl.searchParams.set("format", "json");
      reverseUrl.searchParams.set("lat", finalLat);
      reverseUrl.searchParams.set("lon", finalLon);
      reverseUrl.searchParams.set("addressdetails", "1");

      const res = await fetch(reverseUrl.toString(), {
        headers: { "User-Agent": "HackathonBot/1.0", "Accept-Language": "es" },
      });
      const data = await res.json();
      if (data && data.address) {
        const addrDetails = data.address;
        barrio =
          addrDetails.neighbourhood ||
          addrDetails.suburb ||
          addrDetails.residential ||
          addrDetails.city_district ||
          barrio;
      }
    } else {
      return NextResponse.json(
        { error: "Faltan parametros lat/lon o address" },
        { status: 400 }
      );
    }

    let dbResult = null;
    if (save === "true" && finalLat && finalLon) {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data: newReport, error } = await supabaseAdmin
        .from("reports")
        .insert({
          chat_id: 123456789,
          descripcion: `Reporte de prueba desde /api/barrios - ${address || "GPS"}`,
          lat: parseFloat(finalLat as string),
          lon: parseFloat(finalLon as string),
          location: `POINT(${finalLon} ${finalLat})`,
          tipo: "INUNDACION_URBANA",
          criticidad: "ALTA",
          barrio: barrio,
        })
        .select()
        .single();

      if (error) {
        dbResult = { error: error.message };
      } else {
        dbResult = newReport;
      }
    }

    return NextResponse.json({
      success: true,
      input: { address, lat, lon },
      resolved: { lat: finalLat, lon: finalLon, barrio },
      dbResult,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
