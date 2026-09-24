"use client";

import { useState } from "react";
import { Layers, Plus, Satellite, Map, Check } from "lucide-react";
import { TooltipSign } from "@/components/ui/TooltipSign";

interface LayerControlsProps {
  showEvacuationCenters: boolean;
  setShowEvacuationCenters: React.Dispatch<React.SetStateAction<boolean>>;
  showMedicalCenters: boolean;
  setShowMedicalCenters: React.Dispatch<React.SetStateAction<boolean>>;
  showSatellite: boolean;
  setShowSatellite: React.Dispatch<React.SetStateAction<boolean>>;
  onCreateEvacuationCenter?: () => void;
  onCreateMedicalCenter?: () => void;
  isHidden?: boolean;
  isAdmin?: boolean;
}

export function LayerControls({
  showEvacuationCenters,
  setShowEvacuationCenters,
  showMedicalCenters,
  setShowMedicalCenters,
  showSatellite,
  setShowSatellite,
  onCreateEvacuationCenter,
  onCreateMedicalCenter,
  isHidden,
  isAdmin = false,
}: LayerControlsProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  return (
    <div
      className={`absolute ${isAdmin ? "bottom-4" : "bottom-[20dvh]"} left-4 w-[calc(100vw-2rem)] sm:bottom-4 sm:w-auto z-1 flex flex-row items-end justify-between sm:items-center gap-3 transition-all duration-300 ease-in-out ${
        isHidden
          ? "translate-y-20 opacity-0 pointer-events-none"
          : "translate-y-0 opacity-100"
      }`}
    >
      {/* Container for Layer Button & Popover */}
      <div className="relative">
        {/* Layer Toggle Floating Button */}
        <TooltipSign label="Mostrar capas" position="top" delayMs={500}>
          <button
            onClick={() => setIsPopoverOpen((prev) => !prev)}
            className={`flex items-center justify-center rounded-full border p-2.5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-md transition-all duration-200 cursor-pointer ${
              isPopoverOpen
                ? "bg-zinc-200/90 dark:bg-[#161f36] text-zinc-950 dark:text-white border-zinc-300 dark:border-[#2b395b] shadow-sm"
                : "bg-white/70 dark:bg-[#0b101d]/80 text-zinc-700 dark:text-slate-200 hover:bg-white/90 dark:hover:bg-[#161f36] border-white/50 dark:border-[#2b395b]/80"
            }`}
          >
            <Layers className="h-5 w-5" />
          </button>
        </TooltipSign>

        {/* Popover Panel with Spring Bounce Slide Animation */}
        <div
          className={`absolute bottom-14 left-0 w-[304px] rounded-2xl border border-gray-200/80 dark:border-[#2b395b]/80 bg-white/60 dark:bg-[#0b101d]/90 p-4 shadow-xl backdrop-blur-md flex flex-col gap-4 z-50 transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            isPopoverOpen
              ? "translate-y-0 opacity-100 scale-100 pointer-events-auto"
              : "translate-y-8 opacity-0 scale-95 pointer-events-none"
          }`}
        >
          {/* Map Type Selector (Google Maps Style) */}
          <div className="flex flex-col gap-2.5">
            <div className="flex justify-center gap-5 w-full">
              {/* Default Button */}
              <button
                type="button"
                onClick={() => setShowSatellite(false)}
                className="flex flex-col items-center gap-2 cursor-pointer group"
              >
                <div
                  className={`w-16 h-16 rounded-[14px] border-[2.5px] flex items-center justify-center transition-all ${
                    !showSatellite
                      ? "border-inu dark:border-white bg-white dark:bg-inu"
                      : "border-transparent bg-gray-100 dark:bg-[#161f36] group-hover:bg-gray-200 dark:group-hover:bg-[#1e2a4a]"
                  }`}
                >
                  <Map
                    className={`h-7 w-7 ${
                      !showSatellite
                        ? "text-inu dark:text-white"
                        : "text-zinc-800 dark:text-slate-200"
                    }`}
                  />
                </div>
                <span
                  className={`text-xs font-semibold ${
                    !showSatellite
                      ? "text-inu dark:text-white"
                      : "text-zinc-800 dark:text-slate-200"
                  }`}
                >
                  Predeterminado
                </span>
              </button>

              {/* Satellite Button */}
              <button
                type="button"
                onClick={() => setShowSatellite(true)}
                className="flex flex-col items-center gap-2 cursor-pointer group"
              >
                <div
                  className={`w-16 h-16 rounded-[14px] border-[2.5px] flex items-center justify-center transition-all ${
                    showSatellite
                      ? "border-inu dark:border-white bg-white dark:bg-inu"
                      : "border-transparent bg-gray-100 dark:bg-[#161f36] group-hover:bg-gray-200 dark:group-hover:bg-[#1e2a4a]"
                  }`}
                >
                  <Satellite
                    className={`h-7 w-7 ${
                      showSatellite
                        ? "text-inu dark:text-white"
                        : "text-zinc-800 dark:text-slate-200"
                    }`}
                  />
                </div>
                <span
                  className={`text-xs font-semibold ${
                    showSatellite
                      ? "text-inu dark:text-white"
                      : "text-zinc-800 dark:text-slate-200"
                  }`}
                >
                  Satelital
                </span>
              </button>
            </div>
          </div>

          <div className="h-[1px] w-full bg-gray-200/80 dark:bg-[#2b395b]/80" />

          {/* Centros de Evacuación */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white shadow-2xs">
                  <Check className="h-3.5 w-3.5" strokeWidth={4} />
                </div>
                <span className="text-xs font-semibold text-zinc-800 dark:text-slate-200">
                  Centros de evacuación
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={() => setShowEvacuationCenters((prev) => !prev)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    showEvacuationCenters ? "bg-emerald-500" : "bg-zinc-300"
                  }`}
                >
                  <span
                    suppressHydrationWarning
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      showEvacuationCenters ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
                {onCreateEvacuationCenter && (
                  <TooltipSign
                    label="Añadir centro de evacuación"
                    position="top"
                    delayMs={500}
                  >
                    <button
                      onClick={() => {
                        onCreateEvacuationCenter();
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-white dark:bg-[#161f36] text-zinc-600 dark:text-slate-200 border border-gray-200/80 dark:border-[#2b395b] hover:bg-zinc-50 dark:hover:bg-[#233154] hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer shadow-xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </TooltipSign>
                )}
              </div>
            </div>

            {/* Centros de At. Médica */}
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-2xs">
                  <Plus className="h-3.5 w-3.5" strokeWidth={3} />
                </div>
                <span className="text-xs font-semibold text-zinc-800 dark:text-slate-200">
                  Centros de at. médica
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={() => setShowMedicalCenters((prev) => !prev)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    showMedicalCenters ? "bg-red-500" : "bg-zinc-300"
                  }`}
                >
                  <span
                    suppressHydrationWarning
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      showMedicalCenters ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
                {onCreateMedicalCenter && (
                  <TooltipSign
                    label="Añadir centro de at. médica"
                    position="top"
                    delayMs={500}
                  >
                    <button
                      onClick={() => {
                        onCreateMedicalCenter();
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-white dark:bg-[#161f36] text-zinc-600 dark:text-slate-200 border border-gray-200/80 dark:border-[#2b395b] hover:bg-zinc-50 dark:hover:bg-[#233154] hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer shadow-xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </TooltipSign>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* References Legend Capsule (Unificada con mapa de calor) */}
      <div className="flex w-fit max-w-full min-w-0 shrink-0 flex-col items-start gap-2 overflow-visible rounded-2xl border border-gray-200/80 dark:border-[#2b395b]/80 bg-white/60 dark:bg-[#0b101d]/90 px-4 py-2 text-xs font-bold whitespace-nowrap text-zinc-800 dark:text-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-md self-auto sm:flex-row sm:items-center sm:gap-3 sm:rounded-full sm:w-auto">
        <span className="shrink-0 text-zinc-900 dark:text-white font-extrabold">
          Referencias
        </span>

        <div className="flex shrink-0 items-center gap-1.5">
          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white shadow-2xs">
            <Check className="h-2.5 w-2.5" strokeWidth={4} />
          </div>
          <span className="shrink-0 text-[11px] font-semibold text-zinc-700 dark:text-slate-300">
            Centros de evacuación
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <svg
            viewBox="0 0 16 16"
            className="h-4 w-4 shrink-0 block shadow-2xs rounded-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="8" cy="8" r="8" fill="#ef4444" />
            <path
              d="M8 4.2v7.6M4.2 8h7.6"
              stroke="#ffffff"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          <span className="text-[11px] font-semibold text-zinc-700 dark:text-slate-300">
            Centros de at. médica
          </span>
        </div>

        {/* Separador vertical */}
        <div className="h-px w-full shrink-0 bg-zinc-300/80 sm:h-3.5 sm:w-px sm:mx-0.5" />

        {/* Escala de Calor / Riesgo */}
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="shrink-0 text-[11px] font-semibold text-zinc-700 dark:text-slate-300">
            Riesgo:
          </span>
          <span className="shrink-0 text-[10px] font-mono font-bold text-zinc-600 dark:text-slate-300">
            Bajo
          </span>
          <div
            className="h-2 w-16 shrink-0 sm:w-20 rounded-full shadow-2xs"
            style={{
              background:
                "linear-gradient(to right, #facc15, #fb923c, #f97316, #ef4444, #dc2626)",
            }}
          />
          <span className="shrink-0 text-[10px] font-mono font-bold text-zinc-600 dark:text-slate-300">
            Alto
          </span>
        </div>
      </div>
    </div>
  );
}
