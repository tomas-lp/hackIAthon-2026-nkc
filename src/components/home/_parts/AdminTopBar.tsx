"use client";

import { Switch } from "@/components/ui/Switch";
import { Pencil, X, Check, Trash2 } from "lucide-react";

interface AdminTopBarProps {
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  onAddList: () => void;
  isHidden: boolean;
  showEditButton?: boolean;
  isEditingRegions?: boolean;
  onStartEditing?: () => void;
  onCancelEditing?: () => void;
  onConfirmEditing?: () => void;
  onDeleteList?: () => void;
}

export function AdminTopBar({
  tabs,
  activeTab,
  onTabChange,
  onAddList,
  isHidden,
  showEditButton = false,
  isEditingRegions = false,
  onStartEditing,
  onCancelEditing,
  onConfirmEditing,
  onDeleteList,
}: AdminTopBarProps) {
  return (
    <div
      className={`absolute top-4 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-2 transition-all duration-300 ease-in-out ${
        isHidden
          ? "-translate-y-20 opacity-0 pointer-events-none"
          : "translate-y-0 opacity-100"
      }`}
    >
      <Switch value={activeTab} onValueChange={onTabChange}>
        {tabs.map((tab) => (
          <Switch.Option key={tab} value={tab}>
            {tab}
          </Switch.Option>
        ))}
        <div className="h-3.5 w-px bg-zinc-400/30 mx-0.5 z-10" />
        <button
          onClick={onAddList}
          className="relative z-10 h-7 px-3.5 text-xs font-semibold text-zinc-700 hover:text-zinc-950 transition-colors duration-200 cursor-pointer whitespace-nowrap flex items-center justify-center"
        >
          Nueva +
        </button>
      </Switch>

      {/* Botones de acción normal (Editar y Eliminar) con animación sliding + bounce sin deformación */}
      <div
        className={`flex items-center gap-2 transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-left ${
          showEditButton && !isEditingRegions
            ? "translate-x-0 opacity-100 scale-100 pointer-events-auto"
            : "translate-x-6 opacity-0 scale-90 pointer-events-none w-0 overflow-hidden"
        }`}
      >
        <button
          onClick={onStartEditing}
          title="Editar zonas"
          aria-label="Editar zonas"
          className="h-9 w-9 aspect-square min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full border border-gray-200/60 bg-white/50 shadow-[0_7px_50px_0px_rgb(0,0,0,0.1)] backdrop-blur-md text-zinc-700 transition-colors duration-200 hover:bg-zinc-200/80 active:scale-95 cursor-pointer shrink-0"
        >
          <Pencil className="h-4 w-4 text-zinc-700 shrink-0" />
        </button>

        <button
          onClick={onDeleteList}
          title="Eliminar lista personalizada"
          aria-label="Eliminar lista personalizada"
          className="h-9 w-9 aspect-square min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full border border-gray-200/60 bg-white/50 shadow-[0_7px_50px_0px_rgb(0,0,0,0.1)] backdrop-blur-md text-zinc-700 transition-colors duration-200 hover:bg-zinc-200/80 active:scale-95 cursor-pointer shrink-0"
        >
          <Trash2 className="h-4 w-4 text-zinc-700 hover:text-red-600 shrink-0" />
        </button>
      </div>

      {/* Botones de confirmación/cancelación durante el modo edición con animación sliding + bounce */}
      <div
        className={`flex items-center gap-2 transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-left ${
          isEditingRegions
            ? "translate-x-0 opacity-100 scale-100 pointer-events-auto"
            : "-translate-x-4 opacity-0 scale-90 pointer-events-none w-0 overflow-hidden"
        }`}
      >
        <button
          onClick={onCancelEditing}
          title="Cancelar edición"
          aria-label="Cancelar edición"
          className="h-9 w-9 aspect-square min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full border border-gray-200/60 bg-white/50 shadow-[0_7px_50px_0px_rgb(0,0,0,0.1)] backdrop-blur-md text-zinc-700 transition-colors duration-200 hover:bg-zinc-200/80 active:scale-95 cursor-pointer shrink-0"
        >
          <X className="h-4 w-4 text-red-600 shrink-0" />
        </button>
        <button
          onClick={onConfirmEditing}
          title="Guardar zonas creadas"
          aria-label="Guardar zonas creadas"
          className="h-9 w-9 aspect-square min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full border border-gray-200/60 bg-white/50 shadow-[0_7px_50px_0px_rgb(0,0,0,0.1)] backdrop-blur-md text-zinc-700 transition-colors duration-200 hover:bg-zinc-200/80 active:scale-95 cursor-pointer shrink-0"
        >
          <Check className="h-4 w-4 text-emerald-600 shrink-0" />
        </button>
      </div>
    </div>
  );
}
