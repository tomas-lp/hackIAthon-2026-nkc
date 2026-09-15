"use client";

import { useEffect, useCallback } from "react";
import { X } from "lucide-react";

interface DeleteListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  listName?: string;
}

export function DeleteListModal({
  isOpen,
  onClose,
  onConfirm,
  listName,
}: DeleteListModalProps) {
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) handleClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const handleConfirmAction = async () => {
    await onConfirm();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/25 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl bg-white/95 dark:bg-[#161f36] backdrop-blur-md p-6 shadow-2xl border border-gray-200/80 dark:border-[#2b395b] flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-bold text-zinc-900 dark:text-white leading-snug pt-0.5">
            ¿Deseas eliminar esta lista personalizada?
          </h3>
        </div>

        {listName && (
          <p className="text-xs text-zinc-500 dark:text-slate-300 font-medium">
            Se eliminará la lista &ldquo;{listName}&rdquo; y todas las zonas
            asociadas.
          </p>
        )}

        <div className="flex items-center justify-center gap-3 mt-2">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl border border-red-200/80 dark:border-[#f87171]/40 bg-white dark:bg-[#1e2a4a] px-5 py-2 text-xs font-bold text-red-600 dark:text-[#f87171] shadow-2xs transition hover:bg-red-50/60 dark:hover:bg-[#25355d] hover:border-red-300 dark:hover:border-[#f87171]/70 dark:hover:text-[#fca5a5] active:scale-95 cursor-pointer text-center"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmAction}
            className="rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-5 py-2 text-xs font-bold shadow-2xs transition active:scale-95 cursor-pointer text-center"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
