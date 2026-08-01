import { ReportStats, ReportType, RiskLevel } from "@/types/report";
import { RISK_CONFIG, TYPE_CONFIG } from "@/lib/utils";
import { CloudRain, CheckCircle2, ShieldAlert, XCircle } from "lucide-react";

interface StatsSummaryProps {
  stats: ReportStats;
}

export function StatsSummary({ stats }: StatsSummaryProps) {
  const validatedPercent =
    stats.total > 0
      ? Math.round((stats.validadosClima / stats.total) * 100)
      : 0;

  return (
    <div className="space-y-4 font-sans">
      {/* Top 4 Quick Metric Cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">
              Reportes Lluvia
            </span>
            <CloudRain className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100 font-mono">
            {stats.total}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">
            Ingresados vía Telegram
          </div>
        </div>

        <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">
              Validados API Clima
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            {stats.validadosClima}{" "}
            <span className="text-xs font-normal text-zinc-400">
              ({validatedPercent}%)
            </span>
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">
            Coincide con Alerta Meteorológica
          </div>
        </div>

        <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">
              Sin Alerta Clima
            </span>
            <XCircle className="w-3.5 h-3.5 text-red-500" />
          </div>
          <div className="text-xl font-bold text-red-600 dark:text-red-400 font-mono">
            {stats.desestimadosSinAlerta}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">
            Desestimados por API Clima
          </div>
        </div>

        <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">
              No Climáticos
            </span>
            <ShieldAlert className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div className="text-xl font-bold text-zinc-600 dark:text-zinc-400 font-mono">
            {stats.desestimadosIrrelevantes}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">
            Desestimados por Grok NLP
          </div>
        </div>
      </div>

      {/* Breakdown by Risk */}
      <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
        <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 block mb-2">
          Criticidad de Inundación
        </span>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          {(Object.keys(RISK_CONFIG) as RiskLevel[]).map((risk) => {
            const count = stats.porRiesgo[risk] || 0;
            const cfg = RISK_CONFIG[risk];
            return (
              <div
                key={risk}
                className="p-1.5 bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700/50 rounded"
              >
                <div className={`text-[10px] font-bold ${cfg.text}`}>
                  {risk}
                </div>
                <div className="text-sm font-bold font-mono text-zinc-800 dark:text-zinc-200">
                  {count}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Breakdown by Type */}
      <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
        <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 block mb-2">
          Problemáticas por Lluvia
        </span>
        <div className="space-y-1.5">
          {(Object.keys(TYPE_CONFIG) as ReportType[]).map((type) => {
            const count = stats.porTipo[type] || 0;
            const percentage =
              stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
            const label = TYPE_CONFIG[type].label;

            return (
              <div key={type} className="text-xs space-y-0.5">
                <div className="flex justify-between text-[11px] text-zinc-600 dark:text-zinc-400">
                  <span>{label}</span>
                  <span className="font-mono text-zinc-500">
                    {count} ({percentage}%)
                  </span>
                </div>
                <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 dark:bg-blue-400 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
