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
        className="relative w-full max-w-sm rounded-3xl bg-white/95 backdrop-blur-md p-6 shadow-2xl border border-gray-200/80 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-bold text-zinc-900 leading-snug pt-0.5">
            ¿Deseas eliminar esta lista personalizada?
          </h3>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition cursor-pointer shrink-0 -mt-2 -mr-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {listName && (
          <p className="text-xs text-zinc-500 font-medium">
            Se eliminará la lista &ldquo;{listName}&rdquo; y todas las zonas
            asociadas.
          </p>
        )}

        <div className="flex items-center justify-center gap-3 mt-2">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-zinc-800 transition hover:bg-gray-50 active:scale-95 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmAction}
            className="rounded-full bg-red-600 hover:bg-red-700 text-white px-5 py-2 text-sm font-medium transition active:scale-95 cursor-pointer"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
