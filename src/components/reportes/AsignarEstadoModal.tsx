"use client";

import { useState, useEffect, useRef } from "react";
import { X, Tag, Plus, Trash2 } from "lucide-react";

export interface EstadoPreset {
  label: string;
  color: string;
}

// Colores disponibles para estados personalizados (paleta variada y extensa para evitar repeticiones)
export const CUSTOM_TAG_COLORS = [
  // 1. Purple
  "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700/50",
  // 2. Cyan
  "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-700/50",
  // 3. Rose
  "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-700/50",
  // 4. Indigo
  "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700/50",
  // 5. Teal
  "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-700/50",
  // 6. Orange
  "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700/50",
  // 7. Fuchsia
  "bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-700/50",
  // 8. Lime
  "bg-lime-100 dark:bg-lime-900/40 text-lime-700 dark:text-lime-300 border-lime-200 dark:border-lime-700/50",
  // 9. Sky
  "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-700/50",
  // 10. Pink
  "bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-700/50",
  // 11. Violet
  "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-700/50",
  // 12. Green
  "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700/50",
  // 13. Red
  "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700/50",
  // 14. Yellow
  "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700/50",
  // 15. Stone
  "bg-stone-100 dark:bg-stone-800/60 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700/50",
  // 16. Slate
  "bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/50",
  // 17. Deep Violet
  "bg-violet-200/80 dark:bg-violet-950/70 text-violet-900 dark:text-violet-200 border-violet-300 dark:border-violet-600/50",
  // 18. Deep Teal
  "bg-teal-200/80 dark:bg-teal-950/70 text-teal-900 dark:text-teal-200 border-teal-300 dark:border-teal-600/50",
  // 19. Deep Rose
  "bg-rose-200/80 dark:bg-rose-950/70 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-600/50",
  // 20. Deep Cyan
  "bg-cyan-200/80 dark:bg-cyan-950/70 text-cyan-900 dark:text-cyan-200 border-cyan-300 dark:border-cyan-600/50",
  // 21. Deep Orange
  "bg-orange-200/80 dark:bg-orange-950/70 text-orange-900 dark:text-orange-200 border-orange-300 dark:border-orange-600/50",
  // 22. Deep Lime
  "bg-lime-200/80 dark:bg-lime-950/70 text-lime-900 dark:text-lime-200 border-lime-300 dark:border-lime-600/50",
  // 23. Deep Fuchsia
  "bg-fuchsia-200/80 dark:bg-fuchsia-950/70 text-fuchsia-900 dark:text-fuchsia-200 border-fuchsia-300 dark:border-fuchsia-600/50",
  // 24. Deep Sky
  "bg-sky-200/80 dark:bg-sky-950/70 text-sky-900 dark:text-sky-200 border-sky-300 dark:border-sky-600/50",
  // 25. Deep Indigo
  "bg-indigo-200/80 dark:bg-indigo-950/70 text-indigo-900 dark:text-indigo-200 border-indigo-300 dark:border-indigo-600/50",
  // 26. Deep Green
  "bg-green-200/80 dark:bg-green-950/70 text-green-900 dark:text-green-200 border-green-300 dark:border-green-600/50",
  // 27. Deep Pink
  "bg-pink-200/80 dark:bg-pink-950/70 text-pink-900 dark:text-pink-200 border-pink-300 dark:border-pink-600/50",
  // 28. Deep Red
  "bg-red-200/80 dark:bg-red-950/70 text-red-900 dark:text-red-200 border-red-300 dark:border-red-600/50",
];

export function pickCustomColor(index: number): string {
  return CUSTOM_TAG_COLORS[index % CUSTOM_TAG_COLORS.length];
}

interface AsignarEstadoModalProps {
  isOpen: boolean;
  currentEstado?: string | null;
  onClose: () => void;
  onConfirm: (estado: string) => void;
  estadosPreset: EstadoPreset[];
  onAddEstadoPreset: (preset: EstadoPreset) => void;
  onDeleteEstadoPresets: (labels: string[]) => void;
}

export function AsignarEstadoModal(props: AsignarEstadoModalProps) {
  if (!props.isOpen) return null;
  return (
    <AsignarEstadoModalContent key={props.currentEstado ?? "new"} {...props} />
  );
}

function AsignarEstadoModalContent({
  currentEstado,
  onClose,
  onConfirm,
  estadosPreset,
  onAddEstadoPreset,
  onDeleteEstadoPresets,
}: AsignarEstadoModalProps) {
  const [inputValue, setInputValue] = useState(currentEstado ?? "");
  // Delete mode for preset tags
  const [isDeleteTagMode, setIsDeleteTagMode] = useState(false);
  const [tagsToDelete, setTagsToDelete] = useState<Set<string>>(new Set());

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(timer);
  }, []);

  const handleConfirm = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleConfirm();
    if (e.key === "Escape") onClose();
  };

  // Añadir el texto del input como nuevo preset
  const handleAddAsPreset = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (estadosPreset.some((p) => p.label === trimmed)) return;
    const usedColors = new Set(estadosPreset.map((p) => p.color));
    const unusedColor = CUSTOM_TAG_COLORS.find((c) => !usedColors.has(c));
    const colorIndex = Math.max(0, estadosPreset.length - 4);
    onAddEstadoPreset({
      label: trimmed,
      color: unusedColor ?? pickCustomColor(colorIndex),
    });
    // Mantenemos el valor en el input para que el usuario pueda confirmar también
  };

  const alreadyExists = estadosPreset.some(
    (p) => p.label === inputValue.trim()
  );
  const canAddAsPreset = inputValue.trim().length > 0 && !alreadyExists;

  // Toggle tag en modo eliminación
  const toggleTagToDelete = (label: string) => {
    setTagsToDelete((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const handleConfirmDeleteTags = () => {
    if (tagsToDelete.size === 0) return;
    onDeleteEstadoPresets(Array.from(tagsToDelete));
    // Si el valor seleccionado era uno de los eliminados, limpiarlo
    if (tagsToDelete.has(inputValue)) setInputValue("");
    setTagsToDelete(new Set());
    setIsDeleteTagMode(false);
  };

  return (
    <div
      className="fixed inset-0 z-[2200] flex items-center justify-center bg-black/30 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-[#161f36] p-6 shadow-2xl border border-gray-200 dark:border-[#2b395b] animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-zinc-500 dark:text-slate-400" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
              Asignar estado
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 dark:hover:bg-[#1e2a4a] hover:text-zinc-700 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Tags predefinidos */}
        <div className="flex flex-col gap-2">
          {/* Label + botón de gestión */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-slate-400">
              Estado rápido
            </span>
            {!isDeleteTagMode ? (
              <button
                type="button"
                onClick={() => {
                  setIsDeleteTagMode(true);
                  setTagsToDelete(new Set());
                }}
                className="flex items-center gap-1 text-[10px] font-semibold text-zinc-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer"
              >
                <Trash2 className="h-3 w-3" />
                <span>Eliminar</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {tagsToDelete.size > 0 && (
                  <button
                    type="button"
                    onClick={handleConfirmDeleteTags}
                    className="text-[10px] font-bold text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors cursor-pointer"
                  >
                    Eliminar ({tagsToDelete.size})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteTagMode(false);
                    setTagsToDelete(new Set());
                  }}
                  className="text-[10px] font-semibold text-zinc-400 dark:text-slate-500 hover:text-zinc-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {estadosPreset.map((preset) => {
              const isActive = inputValue === preset.label && !isDeleteTagMode;
              const isMarkedForDelete = tagsToDelete.has(preset.label);

              if (isDeleteTagMode) {
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => toggleTagToDelete(preset.label)}
                    className={`relative rounded-full border px-3 py-1 text-xs font-semibold transition-all cursor-pointer select-none ${preset.color} ${
                      isMarkedForDelete
                        ? "opacity-40 ring-1 ring-offset-0 ring-red-500 dark:ring-red-400"
                        : "opacity-80 hover:opacity-60"
                    }`}
                  >
                    {preset.label}
                    {isMarkedForDelete && (
                      <span className="ml-1 inline-flex items-center text-red-500">
                        ×
                      </span>
                    )}
                  </button>
                );
              }

              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setInputValue(isActive ? "" : preset.label)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${preset.color} ${
                    isActive
                      ? "ring-1 ring-offset-0 ring-blue-500 dark:ring-blue-400"
                      : "hover:opacity-80"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}

            {estadosPreset.length === 0 && (
              <span className="text-xs text-zinc-400 dark:text-slate-500 italic">
                No hay estados rápidos
              </span>
            )}
          </div>
        </div>

        {/* Input libre */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-zinc-500 dark:text-slate-400">
            O escribir un estado personalizado
          </span>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ej: En campo, Verificado..."
            className="h-9 rounded-xl border border-gray-200/80 dark:border-[#2b395b] bg-zinc-50 dark:bg-[#1c2744] px-3.5 text-xs text-zinc-800 dark:text-slate-100 placeholder:text-zinc-400 dark:placeholder:text-slate-400 outline-none focus:border-zinc-400 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-[#1e2a4a] transition-all"
          />

          {/* Botón Añadir como estado rápido */}
          {canAddAsPreset && (
            <button
              type="button"
              onClick={handleAddAsPreset}
              className="flex items-center gap-1.5 self-start text-xs font-semibold text-[#435bb5] dark:text-[#8fa5f0] hover:text-[#2d3e84] dark:hover:text-white transition-colors cursor-pointer animate-in fade-in duration-150"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Añadir como estado rápido</span>
            </button>
          )}
        </div>

        {/* Acciones principales */}
        <div className="flex gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex w-1/2 items-center justify-center rounded-xl border border-gray-200 dark:border-[#2b395b] bg-white dark:bg-[#1e2a4a] px-4 py-2 text-xs font-bold text-zinc-600 dark:text-slate-200 shadow-2xs hover:bg-zinc-50 dark:hover:bg-[#25355d] transition-all active:scale-95 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!inputValue.trim()}
            className="flex w-1/2 items-center justify-center rounded-xl bg-[#435bb5] hover:bg-[#364ba0] active:bg-[#2d3e84] text-white border border-transparent dark:bg-[#435ebd] dark:hover:bg-[#4f6cd1] dark:active:bg-[#364ea3] dark:border-[#5270d8] dark:text-white text-xs font-bold px-4 py-2 shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
