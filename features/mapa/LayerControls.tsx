"use client";

import { useState } from "react";
import { Layers, Info, Plus } from "lucide-react";

interface LayerControlsProps {
  showEvacuationCenters: boolean;
  setShowEvacuationCenters: React.Dispatch<React.SetStateAction<boolean>>;
  showMedicalCenters: boolean;
  setShowMedicalCenters: React.Dispatch<React.SetStateAction<boolean>>;
  onCreateEvacuationCenter?: () => void;
  onCreateMedicalCenter?: () => void;
  isHidden?: boolean;
}

export function LayerControls({
  showEvacuationCenters,
  setShowEvacuationCenters,
  showMedicalCenters,
  setShowMedicalCenters,
  onCreateEvacuationCenter,
  onCreateMedicalCenter,
  isHidden,
}: LayerControlsProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  return (
    <div
      className={`absolute bottom-4 left-4 z-[1000] flex items-center gap-3 transition-all duration-300 ease-in-out ${
        isHidden
          ? "translate-y-20 opacity-0 pointer-events-none"
          : "translate-y-0 opacity-100"
      }`}
    >
      {/* Container for Layer Button & Popover */}
      <div className="relative">
        {/* Layer Toggle Floating Button */}
        <button
          onClick={() => setIsPopoverOpen((prev) => !prev)}
          title="Capas del mapa"
          className={`flex items-center justify-center rounded-full border p-2.5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-md transition-all duration-200 cursor-pointer ${
            isPopoverOpen
              ? "bg-zinc-200/90 text-zinc-950 border-zinc-300 shadow-sm"
              : "bg-white/70 text-zinc-700 hover:bg-white/90 border-white/50"
          }`}
        >
          <Layers className="h-5 w-5" />
        </button>

        {/* Popover Panel with Spring Bounce Slide Animation */}
        <div
          className={`absolute bottom-14 left-0 w-72 rounded-2xl border border-gray-200/80 bg-white/60 p-3.5 shadow-xl backdrop-blur-md flex flex-col gap-3 z-50 transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            isPopoverOpen
              ? "translate-y-0 opacity-100 scale-100 pointer-events-auto"
              : "translate-y-8 opacity-0 scale-95 pointer-events-none"
          }`}
        >
          {/* Centros de Evacuación */}
          <div className="flex items-center justify-between gap-2 p-1">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Info className="h-3.5 w-3.5 stroke-[2.5]" />
              </div>
              <span className="text-xs font-semibold text-zinc-800">
                Centros de evacuación
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Toggle Switch */}
              <button
                type="button"
                onClick={() => setShowEvacuationCenters((prev) => !prev)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  showEvacuationCenters ? "bg-emerald-500" : "bg-zinc-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    showEvacuationCenters ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
              {/* Plus Button */}
              <button
                onClick={() => {
                  onCreateEvacuationCenter?.();
                }}
                title="Agregar centro de evacuación"
                className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="h-[1px] w-full bg-gray-100" />

          {/* Centros de At. Médica */}
          <div className="flex items-center justify-between gap-2 p-1">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-600">
                {/* Medical Cross Icon */}
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-3.5 w-3.5"
                >
                  <path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7V2z" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-zinc-800">
                Centros de at. médica
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Toggle Switch */}
              <button
                type="button"
                onClick={() => setShowMedicalCenters((prev) => !prev)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  showMedicalCenters ? "bg-red-500" : "bg-zinc-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    showMedicalCenters ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
              {/* Plus Button */}
              <button
                onClick={() => {
                  onCreateMedicalCenter?.();
                }}
                title="Agregar centro de atención médica"
                className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* References Legend Capsule */}
      <div className="flex items-center gap-3 rounded-full border border-white/50 bg-white/70 px-4 py-2 text-xs font-bold text-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-md">
        <span className="text-zinc-900 font-extrabold">Referencias</span>

        <div className="flex items-center gap-1.5">
          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white">
            <Info className="h-2.5 w-2.5 stroke-[3]" />
          </div>
          <span className="text-[11px] font-medium text-zinc-700">
            Centros de evacuación
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white">
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-2.5 w-2.5"
            >
              <path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7V2z" />
            </svg>
          </div>
          <span className="text-[11px] font-medium text-zinc-700">
            Centros de at. médica
          </span>
        </div>
      </div>
    </div>
  );
}
