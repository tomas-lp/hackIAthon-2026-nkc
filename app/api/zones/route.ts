import { NextRequest, NextResponse } from "next/server";
import { reportService } from "@/services/reportService";
import { ReportType, ZoneLevel } from "@/types/report";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const tipo = (searchParams.get("tipo") as ReportType | "TODOS") || "TODOS";
    const nivelZona =
      (searchParams.get("nivelZona") as ZoneLevel | "TODOS") || "TODOS";

    const zones = await reportService.getZones({ tipo, nivelZona });

    return NextResponse.json(zones, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error fetching zones from service:", error);
    return NextResponse.json(
      { error: "Error al obtener las zonas de riesgo" },
      { status: 500 }
    );
  }
}
