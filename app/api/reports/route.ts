import { NextRequest, NextResponse } from "next/server";
import { reportService } from "@/services/reportService";
import { ReportType } from "@/types/report";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const tipo = (searchParams.get("tipo") as ReportType | "TODOS") || "TODOS";
    const busqueda = searchParams.get("busqueda") || "";

    const reports = await reportService.getReports({
      tipo,
      busqueda,
    });

    return NextResponse.json(reports, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error fetching reports from service:", error);
    return NextResponse.json(
      { error: "Error al obtener los reportes de Inu" },
      { status: 500 }
    );
  }
}
