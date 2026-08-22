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
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-800 cursor-pointer"
          disabled={isSubmitting}
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="mb-6 text-xl font-bold text-zinc-900">{title}</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-700">
              Nombre del centro de salud *
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Hospital Escuela"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-700">
              Tipo de centro *
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as HealthCenterType)}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              disabled={isSubmitting}
            >
              {TIPO_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex w-1/2 items-center justify-center gap-2 rounded-full border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-600 shadow-sm transition-all duration-200 hover:bg-red-50 hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!nombre.trim() || isSubmitting}
              className="flex w-1/2 items-center justify-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-3 text-sm font-bold text-blue-700 shadow-sm transition-all duration-200 hover:bg-blue-50 hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
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
