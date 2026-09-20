import { NextRequest, NextResponse } from "next/server";
import { reportService } from "@/services/reportService";
import { ReportType } from "@/types/report";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const all = searchParams.get("all") === "true";
    const tipo = (searchParams.get("tipo") as ReportType | "TODOS") || "TODOS";
    const busqueda = searchParams.get("busqueda") || "";

    const reports = all
      ? await reportService.getAllReports()
      : await reportService.getReports({
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

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const ids: string[] = body?.ids;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Se requiere un array de IDs para eliminar" },
        { status: 400 }
      );
    }

    const success = await reportService.deleteReports(ids);
    if (!success) {
      return NextResponse.json(
        { error: "Error al eliminar los reportes de la base de datos" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, count: ids.length },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting reports:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud de eliminación" },
      { status: 500 }
    );
  }
}
