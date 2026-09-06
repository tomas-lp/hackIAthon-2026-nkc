"use client";

import { RegionPersonalizada } from "@/types/region";
import { formatDate } from "@/lib/format";
import { Plus, ChevronLeft, Trash2, MapPin } from "lucide-react";
import Link from "next/link";

interface RegionsSidebarProps {
  regiones: RegionPersonalizada[];
  onDeleteRegion: (id: string) => void;
  onCreateRegion: () => void;
  onCollapse: () => void;
  onSelectRegion: (id: string) => void;
  selectedRegionId: string | null;
  isCreating: boolean;
}

function RegionCard({
  region,
  isSelected,
  onDelete,
  onSelect,
}: {
  region: RegionPersonalizada;
  isSelected: boolean;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(region.id)}
      onKeyDown={(e) => e.key === "Enter" && onSelect(region.id)}
      className={`shrink-0 w-full rounded-2xl border text-left transition-all overflow-hidden cursor-pointer ${
        isSelected
          ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 ring-1 ring-emerald-300 dark:ring-emerald-800"
          : "border-gray-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 hover:border-gray-300 dark:hover:border-slate-600 hover:bg-white dark:hover:bg-slate-800"
      }`}
    >
      <div className="flex items-start justify-between gap-2 p-3">
        <div className="flex items-start gap-2 min-w-0">
          <MapPin
            className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
              isSelected
                ? "text-emerald-500"
                : "text-gray-400 dark:text-slate-400"
            }`}
          />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-black dark:text-white truncate">
              {region.nombre}
            </span>
            <span
              className="text-xs font-medium text-black/50 dark:text-slate-400"
              suppressHydrationWarning
            >
              {formatDate(region.created_at)}
            </span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
              {region.points.length} puntos
            </span>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(region.id);
          }}
          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer shrink-0"
          title="Eliminar región"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function RegionsSidebar({
  regiones,
  onDeleteRegion,
  onCreateRegion,
  onCollapse,
  onSelectRegion,
  selectedRegionId,
  isCreating,
}: RegionsSidebarProps) {
  return (
    <aside className="flex flex-col gap-4 m-4 z-100 w-md max-w-md rounded-2xl border border-gray-200 dark:border-slate-800 bg-white/70 dark:bg-[#131826]/90 p-3 backdrop-blur-md max-h-[85vh]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2 bg-inu py-2 px-4 rounded-2xl cursor-pointer">
          <Link href="/">
            <div className="flex items-center gap-2">
              <div className="font-black text-4xl leading-8 logo flex justify-center items-center text-white rounded-2xl">
                INU
              </div>
              <span className="text-md text-white/90 leading-4">
                Regiones
                <br />
                Personalizadas
              </span>
            </div>
          </Link>
        </div>
        <button
          onClick={onCollapse}
          title="Ocultar panel"
          className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 text-gray-400 dark:text-slate-400 transition-colors hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-gray-600 dark:hover:text-slate-200 cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col flex-1 w-full gap-4 min-h-0">
        <div className="flex flex-col gap-2 min-h-0">
          <div className="flex items-center justify-between">
            <span className="text-md font-medium text-black dark:text-white text-nowrap">
              Mis Regiones
            </span>
            <button
              onClick={onCreateRegion}
              disabled={isCreating}
              className="flex items-center justify-center gap-1.5 rounded-full border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm font-semibold text-gray-700 dark:text-slate-200 transition hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Nueva región
            </button>
          </div>

          <div className="flex flex-col rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#181f33] p-2 overflow-hidden flex-1 min-h-0 h-[50vh]">
            {regiones.length === 0 && (
              <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-slate-700 px-3 py-20 text-center text-xs text-zinc-500 dark:text-zinc-400">
                No tienes regiones personalizadas.
                <br />
                Haz clic en &quot;Nueva región&quot; para crear una.
              </div>
            )}

            {regiones.length > 0 && (
              <div className="gap-2 flex flex-col overflow-auto pr-1">
                {regiones.map((r) => (
                  <RegionCard
                    key={r.id}
                    region={r}
                    isSelected={selectedRegionId === r.id}
                    onDelete={onDeleteRegion}
                    onSelect={onSelectRegion}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
