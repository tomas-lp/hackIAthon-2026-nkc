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
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-800 cursor-pointer"
          disabled={isSubmitting}
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="mb-5 text-xl font-bold text-zinc-900">{title}</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-700">
              Nombre de la zona *
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Refugio Escuela N°3"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-700">
              Tipo de centro de evacuación *
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as SafeZoneType)}
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

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-700">
              Capacidad máxima (personas)
            </label>
            <input
              type="number"
              min="1"
              placeholder="Ej. 150"
              value={capacidadMaxima}
              onChange={(e) => setCapacidadMaxima(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-700">
              Dirección
            </label>
            <input
              type="text"
              placeholder="Ej. Av. Sarmiento 1200"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700">
                Localidad
              </label>
              <input
                type="text"
                placeholder="Ej. Corrientes"
                value={localidad}
                onChange={(e) => setLocalidad(e.target.value)}
                className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                disabled={isSubmitting}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700">
                Departamento
              </label>
              <input
                type="text"
                placeholder="Ej. Capital"
                value={departamento}
                onChange={(e) => setDepartamento(e.target.value)}
                className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-700">
              Descripción (Opcional)
            </label>
            <textarea
              placeholder="Detalles sobre el punto de encuentro, servicios disponibles, etc."
              rows={2}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
              disabled={isSubmitting}
            />
          </div>

          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex w-1/2 items-center justify-center gap-2 rounded-full border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-600 shadow-sm transition-all duration-200 hover:bg-red-50 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:active:scale-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!nombre.trim() || isSubmitting}
              className="flex w-1/2 items-center justify-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-3 text-sm font-bold text-blue-700 shadow-sm transition-all duration-200 hover:bg-blue-50 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:active:scale-100 disabled:cursor-not-allowed cursor-pointer"
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
