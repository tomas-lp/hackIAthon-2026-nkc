"use client";

import { RegionPersonalizada } from "@/types/region";
import { formatDate } from "@/lib/utils";
import { Plus, ChevronLeft, Trash2 } from "lucide-react";
import Link from "next/link";

interface RegionsSidebarProps {
  regiones: RegionPersonalizada[];
  onDeleteRegion: (id: string) => void;
  onCreateRegion: () => void;
  onCollapse: () => void;
  isCreating: boolean;
}

function RegionCard({
  region,
  onDelete,
}: {
  region: RegionPersonalizada;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="shrink-0 w-full rounded-2xl border border-gray-200 bg-white/80 transition overflow-hidden">
      <div className="flex items-start justify-between gap-2 p-3">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-black">
            {region.nombre}
          </span>
          <span
            className="text-xs font-medium text-black/50"
            suppressHydrationWarning
          >
            {formatDate(region.created_at)}
          </span>
          <span className="text-[10px] text-zinc-400 mt-1">
            {region.points.length} puntos en el polígono
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(region.id);
          }}
          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
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
  isCreating,
}: RegionsSidebarProps) {
  return (
    <aside className="flex flex-col gap-4 m-4 z-100 w-md max-w-md rounded-2xl border border-gray-200 bg-white/50 p-3 backdrop-blur-xs max-h-[85vh]">
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
          className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600 cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col flex-1 w-full gap-4 min-h-0">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-md font-medium text-black text-nowrap">
              Mis Regiones
            </span>
            <button
              onClick={onCreateRegion}
              disabled={isCreating}
              className="flex items-center justify-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 cursor-pointer disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Nueva región
            </button>
          </div>

          <div className="flex flex-col rounded-2xl border border-gray-200 bg-white p-2 overflow-hidden h-[50vh]">
            {regiones.length === 0 && (
              <div className="rounded-2xl border border-dashed border-zinc-300 px-3 py-20 text-center text-xs text-zinc-500">
                No tienes regiones personalizadas.
                <br />
                Haz clic en &quot;Nueva región&quot; para crear una.
              </div>
            )}

            {regiones.length > 0 && (
              <div className="gap-2 flex flex-col overflow-auto pr-2">
                {regiones.map((r) => (
                  <RegionCard key={r.id} region={r} onDelete={onDeleteRegion} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
