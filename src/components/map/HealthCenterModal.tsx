"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { HealthCenterType } from "@/types/healthCenter";

interface HealthCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { nombre: string; tipo: HealthCenterType }) => Promise<void>;
  title?: string;
  initialData?: { nombre: string; tipo: HealthCenterType };
}

const TIPO_OPTIONS: { value: HealthCenterType; label: string }[] = [
  { value: "HOSPITAL", label: "Hospital" },
  { value: "CAPS", label: "CAPS" },
  { value: "SAPS", label: "SAPS" },
  { value: "CLINICA", label: "Clínica" },
  { value: "SANATORIO", label: "Sanatorio" },
  { value: "POLICONSULTORIO", label: "Policonsultorio" },
];

export function HealthCenterModal({
  isOpen,
  onClose,
  onSave,
  title = "Editar Centro de Salud",
  initialData = { nombre: "", tipo: "HOSPITAL" },
}: HealthCenterModalProps) {
  const [nombre, setNombre] = useState(initialData.nombre);
  const [tipo, setTipo] = useState<HealthCenterType>(initialData.tipo);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave({ nombre, tipo });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/30 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-200 font-sans">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-800 cursor-pointer"
          disabled={isSubmitting}
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="mb-4 text-lg font-bold text-zinc-900 tracking-tight">
          {title}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-700">
              Nombre del centro de salud *
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Hospital Escuela"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="rounded-xl border border-gray-200 bg-zinc-50/60 px-3.5 py-2 text-xs text-zinc-900 outline-none focus:bg-white focus:border-zinc-400 focus:ring-1 focus:ring-zinc-300 transition-all placeholder:text-zinc-400"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-700">
              Tipo de centro *
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as HealthCenterType)}
              className="rounded-xl border border-gray-200 bg-zinc-50/60 px-3.5 py-2 text-xs text-zinc-900 outline-none focus:bg-white focus:border-zinc-400 focus:ring-1 focus:ring-zinc-300 transition-all cursor-pointer"
              disabled={isSubmitting}
            >
              {TIPO_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3 flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex w-1/2 items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-zinc-700 shadow-2xs transition-all duration-200 hover:bg-gray-50 hover:border-gray-300 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!nombre.trim() || isSubmitting}
              className="flex w-1/2 items-center justify-center gap-2 rounded-full border border-blue-600 bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-2xs transition-all duration-200 hover:bg-blue-700 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
