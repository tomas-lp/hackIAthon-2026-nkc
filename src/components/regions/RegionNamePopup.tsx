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

      <div className="flex flex-col gap-1.5 relative">
        <label className="text-sm font-medium text-zinc-700">Lista</label>
        <div ref={dropdownRef} className="relative w-full">
          <button
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-300 transition-all cursor-pointer"
          >
            <span>{selectedListObj.nombre}</span>
            <ChevronDown className="h-4 w-4 text-zinc-500" />
          </button>

          {isDropdownOpen && (
            <div className="absolute left-0 top-full mt-1 z-50 w-full max-h-48 overflow-y-auto rounded-2xl border border-gray-200 bg-white/95 backdrop-blur-md p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
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
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-left transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-zinc-100 font-bold text-zinc-900"
                        : "text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    <span>{l.nombre}</span>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-zinc-900" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 mt-2">
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
          className="rounded-full bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 text-sm font-medium transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          Guardar
        </button>
      </div>
    </div>
  );
}
