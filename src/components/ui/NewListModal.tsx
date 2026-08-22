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

  const showX = !!onSave;

  return (
    <div
      className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/25 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl bg-white/95 backdrop-blur-md p-6 shadow-2xl border border-gray-200/80 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-zinc-900">
            {onSave ? "Nueva lista" : "Nombre de la nueva lista"}
          </h3>
          {showX ? (
            <button
              type="button"
              onClick={handleClose}
              className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            {onSave && (
              <label className="text-sm font-medium text-zinc-700">
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
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-300 transition-all placeholder:text-zinc-400"
            />
          </div>

          <div className="flex items-center justify-end gap-3 mt-1">
            <button
              type="button"
              onClick={handleClose}
              className={
                onSave
                  ? "rounded-full border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-zinc-800 transition hover:bg-gray-50 active:scale-95 cursor-pointer"
                  : "px-5 py-2 rounded-full bg-[#4a4a4a] hover:bg-[#666666] text-white font-medium text-xs transition-colors duration-200 cursor-pointer active:scale-95 select-none"
              }
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className={
                onSave
                  ? "rounded-full border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-zinc-800 transition hover:bg-gray-50 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  : "px-5 py-2 rounded-full bg-[#4a4a4a] hover:bg-[#666666] text-white font-medium text-xs transition-colors duration-200 cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed select-none"
              }
            >
              {isSubmitting ? "Guardando..." : onSave ? "Guardar" : "Aceptar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
