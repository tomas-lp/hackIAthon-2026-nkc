"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { CreateSafeZoneDto, SafeZoneType } from "@/types/safeZone";
import { SAFE_ZONE_TYPE_LABELS } from "@/types/marker";

interface SafeZoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    dto: Omit<CreateSafeZoneDto, "latitud" | "longitud">
  ) => Promise<void>;
  title?: string;
  initialData?: {
    nombre?: string;
    descripcion?: string | null;
    tipo?: SafeZoneType;
    direccion?: string | null;
    localidad?: string | null;
    departamento?: string | null;
    capacidad_maxima?: number | null;
  };
}

const TIPO_OPTIONS: { value: SafeZoneType; label: string }[] = (
  Object.keys(SAFE_ZONE_TYPE_LABELS) as SafeZoneType[]
).map((key) => ({
  value: key,
  label: SAFE_ZONE_TYPE_LABELS[key],
}));

export function SafeZoneModal({
  isOpen,
  onClose,
  onSave,
  title = "Nuevo Centro de Evacuación",
  initialData = {},
}: SafeZoneModalProps) {
  const [nombre, setNombre] = useState(initialData.nombre || "");
  const [tipo, setTipo] = useState<SafeZoneType>(
    initialData.tipo || "REFUGIO_MUNICIPAL"
  );
  const [capacidadMaxima, setCapacidadMaxima] = useState(
    initialData.capacidad_maxima ? String(initialData.capacidad_maxima) : ""
  );
  const [direccion, setDireccion] = useState(initialData.direccion || "");
  const [localidad, setLocalidad] = useState(initialData.localidad || "");
  const [departamento, setDepartamento] = useState(
    initialData.departamento || ""
  );
  const [descripcion, setDescripcion] = useState(initialData.descripcion || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNombre(initialData.nombre || "");
      setTipo(initialData.tipo || "REFUGIO_MUNICIPAL");
      setCapacidadMaxima(
        initialData.capacidad_maxima ? String(initialData.capacidad_maxima) : ""
      );
      setDireccion(initialData.direccion || "");
      setLocalidad(initialData.localidad || "");
      setDepartamento(initialData.departamento || "");
      setDescripcion(initialData.descripcion || "");
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave({
        nombre: nombre.trim(),
        tipo,
        descripcion: descripcion.trim() || null,
        direccion: direccion.trim() || null,
        localidad: localidad.trim() || null,
        departamento: departamento.trim() || null,
        capacidad_maxima: capacidadMaxima
          ? parseInt(capacidadMaxima, 10)
          : null,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/30 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-[#161f36] p-6 shadow-2xl border border-gray-200 dark:border-[#2b395b] animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto font-sans custom-scrollbar">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-5 right-5 rounded-full p-1.5 text-zinc-400 hover:text-zinc-700 dark:text-slate-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-[#0b101d] transition-colors cursor-pointer disabled:opacity-50"
          aria-label="Cerrar modal"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="mb-4 text-lg font-bold text-zinc-900 dark:text-white tracking-tight pr-6">
          {title}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-slate-300">
              Nombre de la zona *
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Refugio Escuela N°3"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="rounded-xl border border-gray-200 dark:border-[#2b395b] bg-zinc-50/60 dark:bg-[#0b101d] px-3.5 py-2 text-xs text-zinc-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#0b101d] focus:border-zinc-400 dark:focus:border-blue-500 focus:ring-1 focus:ring-zinc-300 dark:focus:ring-blue-500/30 transition-all placeholder:text-zinc-400 dark:placeholder:text-slate-500"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-slate-300">
              Tipo de centro de evacuación *
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as SafeZoneType)}
              className="rounded-xl border border-gray-200 dark:border-[#2b395b] bg-zinc-50/60 dark:bg-[#0b101d] px-3.5 py-2 text-xs text-zinc-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#0b101d] focus:border-zinc-400 dark:focus:border-blue-500 focus:ring-1 focus:ring-zinc-300 dark:focus:ring-blue-500/30 transition-all cursor-pointer"
              disabled={isSubmitting}
            >
              {TIPO_OPTIONS.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  className="dark:bg-[#161f36] dark:text-white"
                >
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-slate-300">
              Capacidad máxima (personas)
            </label>
            <input
              type="number"
              min="1"
              placeholder="Ej. 150"
              value={capacidadMaxima}
              onChange={(e) => setCapacidadMaxima(e.target.value)}
              className="rounded-xl border border-gray-200 dark:border-[#2b395b] bg-zinc-50/60 dark:bg-[#0b101d] px-3.5 py-2 text-xs text-zinc-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#0b101d] focus:border-zinc-400 dark:focus:border-blue-500 focus:ring-1 focus:ring-zinc-300 dark:focus:ring-blue-500/30 transition-all placeholder:text-zinc-400 dark:placeholder:text-slate-500"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-slate-300">
              Dirección
            </label>
            <input
              type="text"
              placeholder="Ej. Av. Sarmiento 1200"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              className="rounded-xl border border-gray-200 dark:border-[#2b395b] bg-zinc-50/60 dark:bg-[#0b101d] px-3.5 py-2 text-xs text-zinc-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#0b101d] focus:border-zinc-400 dark:focus:border-blue-500 focus:ring-1 focus:ring-zinc-300 dark:focus:ring-blue-500/30 transition-all placeholder:text-zinc-400 dark:placeholder:text-slate-500"
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-slate-300">
                Localidad
              </label>
              <input
                type="text"
                placeholder="Ej. Corrientes"
                value={localidad}
                onChange={(e) => setLocalidad(e.target.value)}
                className="rounded-xl border border-gray-200 dark:border-[#2b395b] bg-zinc-50/60 dark:bg-[#0b101d] px-3.5 py-2 text-xs text-zinc-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#0b101d] focus:border-zinc-400 dark:focus:border-blue-500 focus:ring-1 focus:ring-zinc-300 dark:focus:ring-blue-500/30 transition-all placeholder:text-zinc-400 dark:placeholder:text-slate-500"
                disabled={isSubmitting}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-slate-300">
                Departamento
              </label>
              <input
                type="text"
                placeholder="Ej. Capital"
                value={departamento}
                onChange={(e) => setDepartamento(e.target.value)}
                className="rounded-xl border border-gray-200 dark:border-[#2b395b] bg-zinc-50/60 dark:bg-[#0b101d] px-3.5 py-2 text-xs text-zinc-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#0b101d] focus:border-zinc-400 dark:focus:border-blue-500 focus:ring-1 focus:ring-zinc-300 dark:focus:ring-blue-500/30 transition-all placeholder:text-zinc-400 dark:placeholder:text-slate-500"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-slate-300">
              Descripción (Opcional)
            </label>
            <textarea
              placeholder="Detalles sobre el punto de encuentro, servicios disponibles, etc."
              rows={2}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="resize-none rounded-xl border border-gray-200 dark:border-[#2b395b] bg-zinc-50/60 dark:bg-[#0b101d] px-3.5 py-2 text-xs text-zinc-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#0b101d] focus:border-zinc-400 dark:focus:border-blue-500 focus:ring-1 focus:ring-zinc-300 dark:focus:ring-blue-500/30 transition-all placeholder:text-zinc-400 dark:placeholder:text-slate-500"
              disabled={isSubmitting}
            />
          </div>

          <div className="mt-3 flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex w-1/2 items-center justify-center gap-2 rounded-xl border border-red-200/80 dark:border-[#f87171]/40 bg-white dark:bg-[#1e2a4a] px-4 py-2 text-xs font-bold text-red-600 dark:text-[#f87171] shadow-2xs transition-all duration-200 hover:bg-red-50/60 dark:hover:bg-[#25355d] hover:border-red-300 dark:hover:border-[#f87171]/70 dark:hover:text-[#fca5a5] active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!nombre.trim() || isSubmitting}
              className="flex w-1/2 items-center justify-center gap-2 rounded-xl bg-[#435bb5] hover:bg-[#364ba0] active:bg-[#2d3e84] text-white border border-transparent dark:bg-[#435ebd] dark:hover:bg-[#4f6cd1] dark:active:bg-[#364ea3] dark:border-[#5270d8] dark:text-white px-4 py-2 text-xs font-bold shadow-2xs transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
