"use client";

import { useState } from "react";
import { RegionLista } from "@/types/region";
import { ChevronDown } from "lucide-react";

interface RegionNamePopupProps {
  listas: RegionLista[];
  selectedListId?: string;
  onConfirm: (name: string, listaId?: string) => void;
  onCancel: () => void;
}

export function RegionNamePopup({
  listas,
  selectedListId,
  onConfirm,
  onCancel,
}: RegionNamePopupProps) {
  const displayListas =
    listas.length > 0
      ? listas
      : [{ id: "", user_id: "", nombre: "Lista 1", created_at: "" }];

  const [name, setName] = useState("");
  const [listaId, setListaId] = useState<string>(
    selectedListId || displayListas[0]?.id || ""
  );

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[2000] bg-white/95 backdrop-blur-md rounded-3xl p-6 shadow-2xl border border-gray-200/80 w-[340px] flex flex-col gap-4 animate-in fade-in zoom-in duration-200">
      <h3 className="text-base font-semibold text-zinc-900">Nueva zona</h3>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-700">Nombre</label>
        <input
          type="text"
          autoFocus
          placeholder="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) {
              onConfirm(name.trim(), listaId || undefined);
            }
            if (e.key === "Escape") {
              onCancel();
            }
          }}
          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-300 transition-all placeholder:text-zinc-400"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-700">Lista</label>
        <div className="relative w-full">
          <select
            value={listaId}
            onChange={(e) => setListaId(e.target.value)}
            className="w-full appearance-none rounded-2xl border border-gray-200 bg-white px-4 py-2.5 pr-10 text-sm text-zinc-900 outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-300 transition-all cursor-pointer"
          >
            {displayListas.map((l) => (
              <option key={l.id || l.nombre} value={l.id}>
                {l.nombre}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 mt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-zinc-800 transition hover:bg-gray-50 active:scale-95 cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => {
            if (name.trim()) onConfirm(name.trim(), listaId || undefined);
          }}
          disabled={!name.trim()}
          className="rounded-full border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-zinc-800 transition hover:bg-gray-50 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          Guardar
        </button>
      </div>
    </div>
  );
}
