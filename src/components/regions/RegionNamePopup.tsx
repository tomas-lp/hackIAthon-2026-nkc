"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { RegionLista } from "@/types/region";
import { ChevronDown, Check } from "lucide-react";

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
  const displayListas = useMemo(() => {
    const seen = new Set<string>();
    const res: RegionLista[] = [];
    for (const l of listas) {
      const key = l.id || l.nombre;
      if (l.nombre && !seen.has(l.nombre) && !seen.has(key)) {
        seen.add(l.nombre);
        if (l.id) seen.add(l.id);
        res.push(l);
      }
    }
    if (res.length === 0) {
      res.push({
        id: "lista-1",
        user_id: "",
        nombre: "Lista 1",
        created_at: "",
      });
    }
    return res;
  }, [listas]);

  const [name, setName] = useState("");
  const [listaId, setListaId] = useState<string>(
    selectedListId || displayListas[0]?.id || displayListas[0]?.nombre || ""
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedListObj =
    displayListas.find((l) => l.id === listaId || l.nombre === listaId) ||
    displayListas[0];

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[2000] bg-white dark:bg-[#161f36] rounded-2xl p-6 shadow-2xl border border-gray-200 dark:border-[#2b395b] w-[340px] flex flex-col gap-3.5 animate-in fade-in zoom-in-95 duration-200 font-sans">
      <h3 className="text-base font-bold text-zinc-900 dark:text-white">
        Nueva zona
      </h3>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-zinc-700 dark:text-slate-300">
          Nombre
        </label>
        <input
          type="text"
          autoFocus
          placeholder="Nombre de la zona"
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
          className="w-full rounded-xl border border-gray-200 dark:border-[#2b395b] bg-zinc-50/60 dark:bg-[#0b101d] px-3.5 py-2 text-xs text-zinc-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#0b101d] focus:border-zinc-400 dark:focus:border-blue-500 focus:ring-1 focus:ring-zinc-300 dark:focus:ring-blue-500/30 transition-all placeholder:text-zinc-400 dark:placeholder:text-slate-500"
        />
      </div>

      <div className="flex flex-col gap-1.5 relative">
        <label className="text-xs font-semibold text-zinc-700 dark:text-slate-300">
          Lista
        </label>
        <div ref={dropdownRef} className="relative w-full">
          <button
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-xl border border-gray-200 dark:border-[#2b395b] bg-zinc-50/60 dark:bg-[#0b101d] px-3.5 py-2 text-xs text-zinc-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#0b101d] focus:border-zinc-400 dark:focus:border-blue-500 focus:ring-1 focus:ring-zinc-300 dark:focus:ring-blue-500/30 transition-all cursor-pointer"
          >
            <span>{selectedListObj.nombre}</span>
            <ChevronDown className="h-3.5 w-3.5 text-zinc-500 dark:text-slate-400" />
          </button>

          {isDropdownOpen && (
            <div className="absolute left-0 top-full mt-1 z-50 w-full max-h-48 overflow-y-auto rounded-xl border border-gray-200 dark:border-[#2b395b] bg-white dark:bg-[#161f36] p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-0.5 custom-scrollbar">
              {displayListas.map((l) => {
                const isSelected = l.id
                  ? l.id === selectedListObj.id
                  : l.nombre === selectedListObj.nombre;
                return (
                  <button
                    key={l.id || l.nombre}
                    type="button"
                    onClick={() => {
                      setListaId(l.id || l.nombre);
                      setIsDropdownOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium text-left transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-zinc-100 dark:bg-[#1e2a4a] font-bold text-zinc-900 dark:text-white"
                        : "text-zinc-700 dark:text-slate-300 hover:bg-zinc-50 dark:hover:bg-[#1e2a4a] hover:text-zinc-900 dark:hover:text-white"
                    }`}
                  >
                    <span>{l.nombre}</span>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-zinc-900 dark:text-white" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2.5 mt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-full border border-gray-200 dark:border-[#2b395b] bg-white dark:bg-[#1e2a4a] px-4 py-2 text-xs font-bold text-zinc-700 dark:text-slate-200 shadow-2xs transition hover:bg-gray-50 dark:hover:bg-[#25355d] hover:border-gray-300 dark:hover:border-slate-500 active:scale-95 cursor-pointer text-center"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => {
            if (name.trim()) onConfirm(name.trim(), listaId || undefined);
          }}
          disabled={!name.trim()}
          className="flex-1 rounded-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-bold shadow-2xs transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-center"
        >
          Guardar
        </button>
      </div>
    </div>
  );
}
