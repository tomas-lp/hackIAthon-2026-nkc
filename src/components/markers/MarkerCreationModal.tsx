"use client";

import { useState, useEffect } from "react";
import { X, Loader2, ShieldCheck, PlusSquare, MapPin } from "lucide-react";
import { SafeZoneType } from "@/types/safeZone";
import { HealthCenterType } from "@/types/healthCenter";
import {
  MarkerCategory,
  SAFE_ZONE_TYPE_LABELS,
  HEALTH_CENTER_TYPE_LABELS,
} from "@/types/marker";

export interface MarkerFormData {
  category: MarkerCategory;
  nombre: string;
  tipoEvacuacion: SafeZoneType;
  tipoSalud: HealthCenterType;
  direccion: string;
  localidad: string;
  departamento: string;
  descripcion: string;
  capacidadMaxima: string;
}

interface MarkerCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: MarkerFormData) => Promise<void>;
  initialCategory?: MarkerCategory;
  initialLocation?: {
    lat: number;
    lng: number;
    localidad?: string;
    departamento?: string;
    direccion?: string;
    fullAddress?: string;
  } | null;
}

const SAFE_ZONE_OPTIONS: { value: SafeZoneType; label: string }[] = (
  Object.keys(SAFE_ZONE_TYPE_LABELS) as SafeZoneType[]
).map((key) => ({
  value: key,
  label: SAFE_ZONE_TYPE_LABELS[key],
}));

const HEALTH_CENTER_OPTIONS: { value: HealthCenterType; label: string }[] = (
  Object.keys(HEALTH_CENTER_TYPE_LABELS) as HealthCenterType[]
).map((key) => ({
  value: key,
  label: HEALTH_CENTER_TYPE_LABELS[key],
}));

export function MarkerCreationModal({
  isOpen,
  onClose,
  onSave,
  initialCategory = "EVACUACION",
  initialLocation = null,
}: MarkerCreationModalProps) {
  const [category, setCategory] = useState<MarkerCategory>(initialCategory);
  const [nombre, setNombre] = useState("");
  const [tipoEvacuacion, setTipoEvacuacion] =
    useState<SafeZoneType>("REFUGIO_MUNICIPAL");
  const [tipoSalud, setTipoSalud] = useState<HealthCenterType>("HOSPITAL");
  const [descripcion, setDescripcion] = useState("");
  const [capacidadMaxima, setCapacidadMaxima] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCategory(initialCategory);
      setNombre("");
      setTipoEvacuacion("REFUGIO_MUNICIPAL");
      setTipoSalud("HOSPITAL");
      setDescripcion("");
      setCapacidadMaxima("");
    }
  }, [isOpen, initialCategory, initialLocation]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave({
        category,
        nombre: nombre.trim(),
        tipoEvacuacion,
        tipoSalud,
        direccion: initialLocation?.direccion || "",
        localidad: initialLocation?.localidad || "Corrientes",
        departamento: initialLocation?.departamento || "Capital",
        descripcion: descripcion.trim(),
        capacidadMaxima: capacidadMaxima.trim(),
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const detectedLocationText =
    initialLocation?.direccion ||
    initialLocation?.fullAddress ||
    (initialLocation
      ? `Lat ${initialLocation.lat.toFixed(4)}, Lng ${initialLocation.lng.toFixed(4)}`
      : "Ubicación seleccionada en el mapa");

  const detectedLocalityText = [
    initialLocation?.localidad,
    initialLocation?.departamento,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto font-sans">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-800 cursor-pointer"
          disabled={isSubmitting}
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="mb-4 text-xl font-bold text-zinc-900">Nuevo Marcador</h2>

        {/* Category selector pills */}
        <div className="flex gap-2 p-1 bg-zinc-100 rounded-xl mb-4">
          <button
            type="button"
            onClick={() => setCategory("EVACUACION")}
            disabled={isSubmitting}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              category === "EVACUACION"
                ? "bg-white text-emerald-700 shadow-xs font-bold"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Centro de Evacuación</span>
          </button>
          <button
            type="button"
            onClick={() => setCategory("SALUD")}
            disabled={isSubmitting}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              category === "SALUD"
                ? "bg-white text-red-700 shadow-xs font-bold"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <PlusSquare className="h-4 w-4 text-red-600" />
            <span>Atención Médica</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-700">
              Nombre del centro *
            </label>
            <input
              type="text"
              required
              placeholder={
                category === "EVACUACION"
                  ? "Ej. Escuela Primaria N° 12"
                  : "Ej. Hospital de Campaña"
              }
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
              disabled={isSubmitting}
            />
          </div>

          {/* Subtype dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-700">
              Tipo de{" "}
              {category === "EVACUACION" ? "evacuación" : "centro de salud"} *
            </label>
            {category === "EVACUACION" ? (
              <select
                value={tipoEvacuacion}
                onChange={(e) =>
                  setTipoEvacuacion(e.target.value as SafeZoneType)
                }
                className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                disabled={isSubmitting}
              >
                {SAFE_ZONE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={tipoSalud}
                onChange={(e) =>
                  setTipoSalud(e.target.value as HealthCenterType)
                }
                className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                disabled={isSubmitting}
              >
                {HEALTH_CENTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Capacidad máxima (solo en evacuación) */}
          {category === "EVACUACION" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700">
                Capacidad máxima de personas (Opcional)
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
          )}

          {/* Descripción (evacuación) */}
          {category === "EVACUACION" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700">
                Descripción / Observaciones (Opcional)
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
          )}

          {/* Ubicación calculada automáticamente */}
          {initialLocation && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-50 border border-zinc-200/80 text-xs">
              <MapPin className="h-4 w-4 text-zinc-500 mt-0.5 shrink-0" />
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-zinc-800">
                  {detectedLocationText}
                </span>
                {detectedLocalityText && (
                  <span className="text-[11px] text-zinc-500">
                    {detectedLocalityText}
                  </span>
                )}
                <span className="text-[10px] text-zinc-400 mt-0.5">
                  Ubicación calculada automáticamente según las coordenadas
                </span>
              </div>
            </div>
          )}

          <div className="mt-3 flex gap-2">
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
