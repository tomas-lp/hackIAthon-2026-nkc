"use client";

import { useState, useEffect } from "react";
import {
  X,
  Loader2,
  ShieldCheck,
  PlusSquare,
  MapPin,
  Pencil,
  ChevronDown,
} from "lucide-react";
import { SafeZoneType } from "@/types/safeZone";
import { HealthCenterType } from "@/types/healthCenter";
import {
  MarkerCategory,
  SAFE_ZONE_TYPE_LABELS,
  HEALTH_CENTER_TYPE_LABELS,
} from "@/types/marker";

function CustomSelect({
  value,
  onChange,
  options,
  disabled,
}: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  disabled: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel = options.find((opt) => opt.value === value)?.label || "";

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isOpen) setIsOpen(false);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [isOpen]);

  return (
    <div
      className={`relative w-full ${disabled ? "opacity-50 pointer-events-none" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) setIsOpen(!isOpen);
      }}
    >
      <div className="w-full flex items-center justify-between rounded-xl border border-gray-200 dark:border-[#2b395b] bg-zinc-50/60 dark:bg-[#0b101d] px-3.5 py-2 text-xs text-zinc-900 dark:text-white cursor-pointer hover:bg-zinc-100 dark:hover:bg-[#161f36] transition-all">
        <span className="truncate pr-4">{selectedLabel}</span>
        <ChevronDown className="h-3.5 w-3.5 text-zinc-500 dark:text-slate-400 shrink-0" />
      </div>

      {isOpen && (
        <div className="absolute top-full mt-1.5 left-0 w-full z-50 bg-white dark:bg-[#0b101d] border border-gray-200 dark:border-[#2b395b] rounded-xl shadow-lg overflow-hidden py-1 max-h-60 overflow-y-auto">
          {options.map((opt) => (
            <div
              key={opt.value}
              className={`px-3.5 py-2 text-xs cursor-pointer transition-colors ${
                opt.value === value
                  ? "bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 font-semibold"
                  : "text-zinc-700 dark:text-slate-200 hover:bg-zinc-100 dark:hover:bg-[#161f36]"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onChange(opt.value);
                setIsOpen(false);
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [customDireccion, setCustomDireccion] = useState("");
  const [customLocalidad, setCustomLocalidad] = useState("");
  const [customDepartamento, setCustomDepartamento] = useState("");
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
      setIsEditingLocation(false);
      setCustomDireccion(initialLocation?.direccion || "");
      setCustomLocalidad(initialLocation?.localidad || "Corrientes");
      setCustomDepartamento(initialLocation?.departamento || "Capital");
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
        direccion:
          customDireccion.trim() || initialLocation?.direccion || "Corrientes",
        localidad:
          customLocalidad.trim() || initialLocation?.localidad || "Corrientes",
        departamento:
          customDepartamento.trim() ||
          initialLocation?.departamento ||
          "Capital",
        descripcion: descripcion.trim(),
        capacidadMaxima: capacidadMaxima.trim(),
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const detectedLocationText =
    customDireccion ||
    initialLocation?.direccion ||
    initialLocation?.fullAddress ||
    (initialLocation
      ? `Lat ${initialLocation.lat.toFixed(4)}, Lng ${initialLocation.lng.toFixed(4)}`
      : "Ubicación seleccionada en el mapa");

  const detectedLocalityText = [
    customLocalidad || initialLocation?.localidad,
    customDepartamento || initialLocation?.departamento,
  ]
    .filter(Boolean)
    .join(", ");

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
          Nuevo Marcador
        </h2>

        {/* Category selector pills */}
        <div className="flex gap-1.5 p-1 bg-zinc-100/90 dark:bg-[#0b101d] border border-gray-200/60 dark:border-[#2b395b] rounded-xl mb-4">
          <button
            type="button"
            onClick={() => setCategory("EVACUACION")}
            disabled={isSubmitting}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              category === "EVACUACION"
                ? "bg-white dark:bg-[#161f36] text-emerald-700 dark:text-emerald-400 shadow-2xs font-bold"
                : "text-zinc-600 dark:text-slate-400 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Evacuación</span>
          </button>
          <button
            type="button"
            onClick={() => setCategory("SALUD")}
            disabled={isSubmitting}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              category === "SALUD"
                ? "bg-white dark:bg-[#161f36] text-red-700 dark:text-red-400 shadow-2xs font-bold"
                : "text-zinc-600 dark:text-slate-400 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <PlusSquare className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
            <span>Atención Médica</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-slate-300">
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
              className="rounded-xl border border-gray-200 dark:border-[#2b395b] bg-zinc-50/60 dark:bg-[#0b101d] px-3.5 py-2 text-xs text-zinc-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#0b101d] focus:border-zinc-400 dark:focus:border-blue-500 focus:ring-1 focus:ring-zinc-300 dark:focus:ring-blue-500/30 transition-all placeholder:text-zinc-400 dark:placeholder:text-slate-500"
              disabled={isSubmitting}
            />
          </div>

          {/* Campos específicos por categoría */}
          {category === "EVACUACION" ? (
            <div className="flex gap-3">
              {/* Tipo de evacuación */}
              <div className="flex flex-col gap-1.5 w-[70%]">
                <label className="text-xs font-semibold text-zinc-700 dark:text-slate-300">
                  Tipo de evacuación *
                </label>
                <CustomSelect
                  value={tipoEvacuacion}
                  onChange={(val) => setTipoEvacuacion(val as SafeZoneType)}
                  options={SAFE_ZONE_OPTIONS}
                  disabled={isSubmitting}
                />
              </div>

              {/* Capacidad máxima */}
              <div className="flex flex-col gap-1.5 w-[30%]">
                <label
                  className="text-xs font-semibold text-zinc-700 dark:text-slate-300 truncate"
                  title="Capacidad (Opcional)"
                >
                  Capacidad
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="Ej. 150"
                  value={capacidadMaxima}
                  onChange={(e) => setCapacidadMaxima(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-[#2b395b] bg-zinc-50/60 dark:bg-[#0b101d] px-3.5 py-2 text-xs text-zinc-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#0b101d] focus:border-zinc-400 dark:focus:border-blue-500 focus:ring-1 focus:ring-zinc-300 dark:focus:ring-blue-500/30 transition-all placeholder:text-zinc-400 dark:placeholder:text-slate-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-slate-300">
                Tipo de centro de salud *
              </label>
              <CustomSelect
                value={tipoSalud}
                onChange={(val) => setTipoSalud(val as HealthCenterType)}
                options={HEALTH_CENTER_OPTIONS}
                disabled={isSubmitting}
              />
            </div>
          )}

          {/* Descripción (evacuación) */}
          {category === "EVACUACION" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-slate-300">
                Descripción / Observaciones
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
          )}

          {/* Ubicación calculada automáticamente con botón para editar */}
          {initialLocation && (
            <div className="flex flex-col gap-2">
              {!isEditingLocation ? (
                <div className="flex items-start justify-between gap-2.5 p-3 rounded-xl bg-zinc-50/80 dark:bg-[#0b101d] border border-gray-200/80 dark:border-[#2b395b] text-xs">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <MapPin className="h-4 w-4 text-zinc-500 dark:text-slate-400 mt-0.5 shrink-0" />
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="font-semibold text-zinc-800 dark:text-slate-200 truncate">
                        {detectedLocationText}
                      </span>
                      {detectedLocalityText && (
                        <span className="text-[11px] text-zinc-500 dark:text-slate-400">
                          {detectedLocalityText}
                        </span>
                      )}
                      <span className="text-[10px] text-zinc-400 dark:text-slate-500 mt-0.5">
                        Ubicación calculada automáticamente según coordenadas
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingLocation(true)}
                    className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-[#2b395b] bg-white dark:bg-[#1e2a4a] px-2.5 py-1 text-[11px] font-semibold text-zinc-700 dark:text-slate-200 shadow-2xs hover:bg-zinc-100 dark:hover:bg-[#25355d] hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer shrink-0 mt-0.5"
                    title="Editar ubicación manualmente"
                  >
                    <Pencil className="h-3 w-3" />
                    <span>Editar</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 p-3 rounded-xl bg-zinc-50 dark:bg-[#0b101d] border border-gray-200 dark:border-[#2b395b] text-xs animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-gray-200/70 dark:border-[#2b395b] pb-1.5">
                    <div className="flex items-center gap-1.5 font-semibold text-zinc-800 dark:text-slate-200">
                      <MapPin className="h-3.5 w-3.5 text-zinc-500 dark:text-slate-400" />
                      <span>Editar dirección manualmente</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditingLocation(false)}
                      className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline cursor-pointer"
                    >
                      Listo
                    </button>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-zinc-600 dark:text-slate-300">
                      Dirección / Calle y altura
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Rafael Obligado 1200"
                      value={customDireccion}
                      onChange={(e) => setCustomDireccion(e.target.value)}
                      className="rounded-lg border border-gray-200 dark:border-[#2b395b] bg-white dark:bg-[#161f36] px-3 py-1.5 text-xs text-zinc-900 dark:text-white outline-none focus:border-zinc-400 dark:focus:border-blue-500 focus:ring-1 focus:ring-zinc-300 dark:focus:ring-blue-500/30 placeholder:text-zinc-400 dark:placeholder:text-slate-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-zinc-600 dark:text-slate-300">
                        Localidad
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. Corrientes"
                        value={customLocalidad}
                        onChange={(e) => setCustomLocalidad(e.target.value)}
                        className="rounded-lg border border-gray-200 dark:border-[#2b395b] bg-white dark:bg-[#161f36] px-3 py-1.5 text-xs text-zinc-900 dark:text-white outline-none focus:border-zinc-400 dark:focus:border-blue-500 focus:ring-1 focus:ring-zinc-300 dark:focus:ring-blue-500/30 placeholder:text-zinc-400 dark:placeholder:text-slate-500"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-zinc-600 dark:text-slate-300">
                        Departamento
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. Capital"
                        value={customDepartamento}
                        onChange={(e) => setCustomDepartamento(e.target.value)}
                        className="rounded-lg border border-gray-200 dark:border-[#2b395b] bg-white dark:bg-[#161f36] px-3 py-1.5 text-xs text-zinc-900 dark:text-white outline-none focus:border-zinc-400 dark:focus:border-blue-500 focus:ring-1 focus:ring-zinc-300 dark:focus:ring-blue-500/30 placeholder:text-zinc-400 dark:placeholder:text-slate-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

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
              className="flex w-1/2 items-center justify-center gap-2 rounded-xl bg-[#435bb5] hover:bg-[#364ba0] active:bg-[#2d3e84] text-white border border-transparent dark:bg-[#435ebd] dark:hover:bg-[#4f6cd1] dark:active:bg-[#364ea3] dark:border-[#5270d8] dark:text-white px-4 py-2 text-xs font-bold shadow-2xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
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
