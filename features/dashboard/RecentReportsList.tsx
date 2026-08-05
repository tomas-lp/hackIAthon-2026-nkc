import { Report } from "@/types/report";
import { TYPE_CONFIG } from "@/lib/utils";

interface RecentReportsListProps {
  reports: Report[];
  selectedReport: Report | null;
  onSelectReport: (report: Report) => void;
}

export function RecentReportsList({
  reports,
  selectedReport,
  onSelectReport,
}: RecentReportsListProps) {
  const sortedReports = [...reports].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  );

  if (sortedReports.length === 0) {
    return (
      <div className="p-6 text-center text-zinc-400 bg-zinc-50  border border-zinc-200  rounded-lg">
        <p className="text-xs">
          No se encontraron reportes con los filtros seleccionados.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 font-sans">
      <div className="flex items-center justify-between text-xs text-zinc-500 font-medium px-1">
        <span>Reportes Telegram ({reports.length})</span>
        <span className="text-[10px] text-zinc-400">
          Click para enfocar en mapa
        </span>
      </div>

      <div className="space-y-2 max-h-[390px] overflow-y-auto pr-1">
        {sortedReports.map((report) => {
          const isSelected = selectedReport?.id === report.id;
          const typeCfg = TYPE_CONFIG[report.tipo];

          return (
            <div
              key={report.id}
              onClick={() => onSelectReport(report)}
              className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                isSelected
                  ? "bg-blue-50/50  border-blue-600 "
                  : "bg-white  border-zinc-200  hover:border-zinc-400 "
              }`}
            >
              <div className="space-y-2">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-zinc-400 mb-1">
                    Tipo
                  </p>
                  <p className="font-semibold text-zinc-900 ">
                    {typeCfg.label}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wide text-zinc-400 mb-1">
                    Puntaje de evidencia
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex px-2 py-1 rounded border text-[10px] font-semibold bg-blue-50  text-blue-700  border-blue-200 ">
                      {report.puntajeBase} pts
                    </span>
                    {report.fotoValida && (
                      <span className="text-[10px] text-zinc-400">
                        con foto validada
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wide text-zinc-400 mb-1">
                    Desglose
                  </p>
                  <p className="text-sm font-medium text-zinc-700 ">
                    {report.puntajeDescripcion} desc · {report.puntajeFoto} foto
                    · {report.puntajeClima} clima
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
