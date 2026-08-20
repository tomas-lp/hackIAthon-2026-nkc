"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";

interface RegionNamePopupProps {
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

export function RegionNamePopup({ onConfirm, onCancel }: RegionNamePopupProps) {
  const [name, setName] = useState("");

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[2000] bg-white rounded-2xl p-4 shadow-2xl border border-gray-200 min-w-[300px] flex flex-col gap-3 animate-in fade-in zoom-in duration-200">
      <h3 className="text-sm font-bold text-gray-800">Nombrar región</h3>
      <input
        type="text"
        autoFocus
        placeholder="Ej: Zona Norte, Barrio Centro..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && name.trim()) {
            onConfirm(name.trim());
          }
          if (e.key === "Escape") {
            onCancel();
          }
        }}
        className="w-full rounded-xl border border-gray-200 bg-zinc-50 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:bg-white transition-colors"
      />
      <div className="flex justify-end gap-2 mt-1">
        <button
          onClick={onCancel}
          className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
          title="Cancelar"
        >
          <X className="w-5 h-5" />
        </button>
        <button
          onClick={() => {
            if (name.trim()) onConfirm(name.trim());
          }}
          disabled={!name.trim()}
          className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors disabled:opacity-50 cursor-pointer"
          title="Confirmar"
        >
          <Check className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
