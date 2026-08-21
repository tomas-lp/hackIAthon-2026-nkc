"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface NewListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}

export function NewListModal({ isOpen, onClose, onSave }: NewListModalProps) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onSave(name.trim());
      setName("");
      onClose();
    } catch (err) {
      console.error(err);
      alert("Error creando la lista");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/25 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl bg-white/95 backdrop-blur-md p-6 shadow-2xl border border-gray-200/80 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-zinc-900">Nueva lista</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-700">
              Nombre de la lista
            </label>
            <input
              type="text"
              autoFocus
              placeholder="Ej: Zona Norte, Prioritarias..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-300 transition-all placeholder:text-zinc-400"
            />
          </div>

          <div className="flex items-center justify-end gap-3 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-zinc-800 transition hover:bg-gray-50 active:scale-95 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="rounded-full border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-zinc-800 transition hover:bg-gray-50 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
