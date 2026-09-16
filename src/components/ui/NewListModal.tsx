"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";

interface NewListModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Sync variant (dashboard) */
  onConfirm?: (listName: string) => void | Promise<void>;
  /** Async variant (regiones) - kept for backward compat */
  onSave?: (name: string) => Promise<void>;
}

export function NewListModal({
  isOpen,
  onClose,
  onConfirm,
  onSave,
}: NewListModalProps) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClose = useCallback(() => {
    setName("");
    setIsSubmitting(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) handleClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || isSubmitting) return;
    try {
      setIsSubmitting(true);
      if (onSave) {
        await onSave(trimmed);
      } else if (onConfirm) {
        await onConfirm(trimmed);
      }
      setName("");
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/30 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-[#161f36] p-6 shadow-2xl border border-gray-200 dark:border-[#2b395b] flex flex-col gap-3.5 animate-in fade-in zoom-in-95 duration-200 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleClose}
          disabled={isSubmitting}
          className="absolute top-5 right-5 rounded-full p-1.5 text-zinc-400 hover:text-zinc-700 dark:text-slate-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-[#0b101d] transition-colors cursor-pointer disabled:opacity-50"
          aria-label="Cerrar modal"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start justify-between gap-3 pr-6">
          <h3 className="text-base font-bold text-zinc-900 dark:text-white leading-snug pt-0.5">
            {onSave ? "Nueva lista" : "Nombre de la nueva lista"}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            {onSave && (
              <label className="text-xs font-semibold text-zinc-700 dark:text-slate-300">
                Nombre de la lista
              </label>
            )}
            <input
              ref={inputRef}
              type="text"
              autoFocus={!!onSave}
              placeholder={
                onSave
                  ? "Ej: Zona Norte, Prioritarias..."
                  : "Escriba el nombre de la lista"
              }
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-[#2b395b] bg-zinc-50/60 dark:bg-[#0b101d] px-3.5 py-2 text-xs text-zinc-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#0b101d] focus:border-zinc-400 dark:focus:border-blue-500 focus:ring-1 focus:ring-zinc-300 dark:focus:ring-blue-500/30 transition-all placeholder:text-zinc-400 dark:placeholder:text-slate-500"
            />
          </div>

          <div className="flex items-center justify-center gap-2.5 mt-1">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 rounded-xl border border-red-200/80 dark:border-[#f87171]/40 bg-white dark:bg-[#1e2a4a] px-4 py-2 text-xs font-bold text-red-600 dark:text-[#f87171] shadow-2xs hover:bg-red-50/60 dark:hover:bg-[#25355d] hover:border-red-300 dark:hover:border-[#f87171]/70 dark:hover:text-[#fca5a5] transition active:scale-95 cursor-pointer text-center"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="flex-1 rounded-xl bg-[#435bb5] hover:bg-[#364ba0] active:bg-[#2d3e84] text-white border border-transparent dark:bg-[#435ebd] dark:hover:bg-[#4f6cd1] dark:active:bg-[#364ea3] dark:border-[#5270d8] dark:text-white px-4 py-2 text-xs font-bold shadow-2xs transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-center"
            >
              {isSubmitting ? "Guardando..." : onSave ? "Guardar" : "Aceptar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
