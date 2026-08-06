import { ReportStats, ReportType, ZoneLevel } from "@/types/report";
import { TYPE_CONFIG, ZONE_CONFIG } from "@/lib/utils";
import { Activity, Camera, CloudRain, MapPin } from "lucide-react";

interface StatsSummaryProps {
  stats: ReportStats;
}

export function StatsSummary({ stats }: StatsSummaryProps) {
  return (
    <div className="space-y-4 font-sans">
      {/* Top 4 Quick Metric Cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 bg-zinc-50  border border-zinc-200  rounded-lg">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">
              Reportes
            </span>
            <CloudRain className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-xl font-bold text-zinc-900  font-mono">
            {stats.total}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">
            Ingresados vía Telegram
          </div>
        </div>

        <div className="p-3 bg-zinc-50  border border-zinc-200  rounded-lg">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">
              Activos 24h
            </span>
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-emerald-600  font-mono">
            {stats.activos}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">
            Reportes con menos de 24 hs
          </div>
        </div>

        <div className="p-3 bg-zinc-50  border border-zinc-200  rounded-lg">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">
              Fotos Validadas
            </span>
            <Camera className="w-3.5 h-3.5 text-violet-500" />
          </div>
          <div className="text-xl font-bold text-violet-600  font-mono">
            {stats.fotosValidadas}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">
            Evidencia fotográfica confirmada por IA
          </div>
        </div>

        <div className="p-3 bg-zinc-50  border border-zinc-200  rounded-lg">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">
              Zonas Activas
            </span>
            <MapPin className="w-3.5 h-3.5 text-orange-500" />
          </div>
          <div className="text-xl font-bold text-orange-600  font-mono">
            {stats.zonasActivas}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">
            Celdas de la grilla con reportes
          </div>
        </div>
      </div>

      {/* Breakdown by Zone Level */}
      <div className="p-3 bg-zinc-50  border border-zinc-200  rounded-lg">
        <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 block mb-2">
          Distribución por Nivel de Zona
        </span>
        <div className="space-y-1.5">
          {(Object.keys(ZONE_CONFIG) as ZoneLevel[]).map((zone) => {
            const count = stats.porNivelZona[zone] || 0;
            const cfg = ZONE_CONFIG[zone];
            const percentage =
              stats.zonasActivas > 0
                ? Math.round((count / stats.zonasActivas) * 100)
                : 0;

            return (
              <div key={zone} className="text-xs space-y-0.5">
                <div className="flex justify-between text-[11px] text-zinc-600 ">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ backgroundColor: cfg.color }}
                    />
                    {cfg.label}
                  </span>
                  <span className="font-mono text-zinc-500">
                    {count} ({percentage}%)
                  </span>
                </div>
                <div className="h-1.5 w-full bg-zinc-200  rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: cfg.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Breakdown by Type */}
      <div className="p-3 bg-zinc-50  border border-zinc-200  rounded-lg">
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
                <div className="flex justify-between text-[11px] text-zinc-600 ">
                  <span>{label}</span>
                  <span className="font-mono text-zinc-500">
                    {count} ({percentage}%)
                  </span>
                </div>
                <div className="h-1.5 w-full bg-zinc-200  rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600  rounded-full transition-all duration-300"
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
