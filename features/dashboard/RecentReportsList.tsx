import { Report } from "@/types/report";
import {
  RISK_CONFIG,
  TYPE_CONFIG,
  STATUS_CONFIG,
  formatDate,
} from "@/lib/utils";
import {
  MapPin,
  ArrowRight,
  MessageSquare,
  CloudCheck,
  CloudOff,
} from "lucide-react";

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
  if (reports.length === 0) {
    return (
      <div className="p-6 text-center text-zinc-400 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
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
        {reports.map((report) => {
          const isSelected = selectedReport?.id === report.id;
          const riskCfg = RISK_CONFIG[report.riesgo];
          const typeCfg = TYPE_CONFIG[report.tipo];
          const statusCfg = STATUS_CONFIG[report.estado];
          const weatherAlertDetails = report.grokPayload?.weatherAlertDetails;
          const isDismissed =
            report.estado === "DESESTIMADO_SIN_ALERTA" ||
            report.estado === "DESESTIMADO_IRRELEVANTE";

          return (
            <div
              key={report.id}
              onClick={() => onSelectReport(report)}
              className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                isSelected
                  ? "bg-blue-50/50 dark:bg-zinc-800 border-blue-600 dark:border-blue-400"
                  : isDismissed
                    ? "bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 opacity-75 hover:opacity-100"
                    : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700"
              }`}
            >
              {/* Header: ID, Localidad, Risk Badge */}
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] text-zinc-400 font-semibold">
                    {report.id}
                  </span>
                  {report.localidad && (
                    <span className="font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-0.5">
                      <MapPin className="w-3 h-3 text-blue-500" />{" "}
                      {report.localidad}
                    </span>
                  )}
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${riskCfg.bg} ${riskCfg.text} ${riskCfg.border}`}
                >
                  {riskCfg.label}
                </span>
              </div>

              {/* Title & Weather Validation Status */}
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {typeCfg.label}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded border text-[9px] font-medium flex items-center gap-1 ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                >
                  {isDismissed ? (
                    <CloudOff className="w-2.5 h-2.5 text-red-500" />
                  ) : (
                    <CloudCheck className="w-2.5 h-2.5 text-emerald-500" />
                  )}
                  {statusCfg.label}
                </span>
              </div>

              {/* Telegram Raw Message snippet */}
              <div className="p-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800/80 rounded mb-1.5">
                <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-medium mb-0.5">
                  <MessageSquare className="w-2.5 h-2.5 text-zinc-400" />{" "}
                  Telegram ({report.usuario}):
                </div>
                <p className="text-zinc-700 dark:text-zinc-300 text-xs italic line-clamp-2 leading-relaxed">
                  &quot;{report.descripcion}&quot;
                </p>
              </div>

              {/* Weather API match note */}
              {weatherAlertDetails && (
                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono bg-zinc-100/70 dark:bg-zinc-800/50 px-2 py-1 rounded mb-1.5 truncate">
                  ⚡ {weatherAlertDetails}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                <span>Grok NLP Tagged</span>
                <div className="flex items-center gap-1 text-zinc-500 font-mono">
                  <span>{formatDate(report.fecha)}</span>
                  <ArrowRight className="w-3 h-3 text-zinc-300" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
