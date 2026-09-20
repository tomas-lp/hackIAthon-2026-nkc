"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SafeZone, SafeZoneType } from "@/types/safeZone";
import { HealthCenter } from "@/types/healthCenter";
import {
  SAFE_ZONE_TYPE_LABELS,
  HEALTH_CENTER_TYPE_LABELS,
} from "@/types/marker";
import { Search, X, MapPin, ShieldCheck, SquarePlus } from "lucide-react";

interface MobileHeaderProps {
  safeZones?: SafeZone[];
  healthCenters?: HealthCenter[];
  onSelectSafeZone?: (zone: SafeZone) => void;
  onSelectHealthCenter?: (center: HealthCenter) => void;
  isHidden?: boolean;
}

export function MobileHeader({
  safeZones = [],
  healthCenters = [],
  onSelectSafeZone,
  onSelectHealthCenter,
  isHidden = false,
}: MobileHeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [markerSearchQuery, setMarkerSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchFocused(false);
        if (!markerSearchQuery) setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [markerSearchQuery]);

  // Focus input when search opens
  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isSearchOpen]);

  const searchableMarkers = useMemo(() => {
    const res: Array<{
      id: string;
      nombre: string;
      tipo: string;
      category: "EVACUACION" | "SALUD";
      ubicacion: string;
      lat: number;
      lon: number;
      rawSafeZone?: SafeZone;
      rawHealthCenter?: HealthCenter;
    }> = [];

    for (const sz of safeZones) {
      res.push({
        id: `sz-${sz.id}`,
        nombre: sz.nombre,
        tipo:
          (sz.tipo && (sz.tipo as SafeZoneType) in SAFE_ZONE_TYPE_LABELS
            ? SAFE_ZONE_TYPE_LABELS[sz.tipo as SafeZoneType]
            : null) || "Centro de Evacuación",
        category: "EVACUACION",
        ubicacion: sz.direccion || sz.localidad || "Corrientes Capital",
        lat: sz.latitud,
        lon: sz.longitud,
        rawSafeZone: sz,
      });
    }

    for (const hc of healthCenters) {
      if (hc.lat !== null && hc.lon !== null) {
        res.push({
          id: `hc-${hc.id}`,
          nombre: hc.nombre,
          tipo: HEALTH_CENTER_TYPE_LABELS[hc.tipo] || hc.tipo,
          category: "SALUD",
          ubicacion: hc.direccion || hc.localidad || "Corrientes Capital",
          lat: hc.lat,
          lon: hc.lon,
          rawHealthCenter: hc,
        });
      }
    }

    return res;
  }, [safeZones, healthCenters]);

  const searchResults = useMemo(() => {
    const q = markerSearchQuery.trim().toLowerCase();
    if (!q) return [];
    return searchableMarkers
      .filter(
        (m) =>
          m.nombre.toLowerCase().includes(q) ||
          m.tipo.toLowerCase().includes(q) ||
          m.ubicacion.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [markerSearchQuery, searchableMarkers]);

  const handleSelectSearchResult = (item: (typeof searchableMarkers)[0]) => {
    if (
      item.category === "EVACUACION" &&
      item.rawSafeZone &&
      onSelectSafeZone
    ) {
      onSelectSafeZone(item.rawSafeZone);
    } else if (
      item.category === "SALUD" &&
      item.rawHealthCenter &&
      onSelectHealthCenter
    ) {
      onSelectHealthCenter(item.rawHealthCenter);
    }
    setMarkerSearchQuery("");
    setIsSearchOpen(false);
    setIsSearchFocused(false);
  };

  const showSearchResults =
    isSearchOpen && isSearchFocused && markerSearchQuery.trim().length > 0;

  if (isHidden) return null;

  return (
    <div className="sm:hidden absolute top-0 left-0 right-0 z-9999 pointer-events-none">
      {/* Header bar */}
      <motion.div
        ref={searchContainerRef}
        animate={{ height: showSearchResults ? "auto" : 52 }}
        transition={{ type: "spring", stiffness: 360, damping: 24 }}
        className="pointer-events-auto relative mx-4 mt-4 flex flex-col overflow-visible rounded-3xl border border-gray-200/80 dark:border-[#2b395b]/80 bg-white/50 dark:bg-[#0b101d]/85 px-2 py-2 backdrop-blur-md shadow-xl"
      >
        <div className="flex h-9 min-w-0 w-full items-center justify-between gap-3">
          <AnimatePresence initial={false}>
            {!isSearchOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 72, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="shrink-0 overflow-hidden ml-1"
              >
                <Image
                  src="/logo_primary.svg"
                  alt="INU - Sistema de Alerta para Inundaciones"
                  width={72}
                  height={24}
                  className="block dark:hidden"
                  priority
                />
                <Image
                  src="/logo_white.svg"
                  alt="INU - Sistema de Alerta para Inundaciones"
                  width={72}
                  height={24}
                  className="hidden dark:block"
                  priority
                />
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            initial={false}
            animate={{ width: isSearchOpen ? "100%" : 36 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className={`min-w-0 shrink-0 ${isSearchOpen ? "flex-1" : ""}`}
          >
            {isSearchOpen ? (
              <div className="flex h-9 w-full items-center gap-2 rounded-full bg-white pl-3 pr-2 py-1.5 shadow-xs dark:bg-[#161f36]">
                <Search className="h-4 w-4 text-zinc-400 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Buscar centros o marcadores..."
                  value={markerSearchQuery}
                  onChange={(e) => {
                    setMarkerSearchQuery(e.target.value);
                    setIsSearchFocused(true);
                  }}
                  onFocus={() => setIsSearchFocused(true)}
                  className="flex-1 bg-transparent text-sm font-semibold text-zinc-800 dark:text-slate-100 placeholder:text-zinc-400 dark:placeholder:text-slate-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    setMarkerSearchQuery("");
                    setIsSearchOpen(false);
                    setIsSearchFocused(false);
                  }}
                  aria-label="Cerrar búsqueda"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-400 dark:text-slate-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-[#1e2a4a] transition-colors cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                id="mobile-search-btn"
                onClick={() => setIsSearchOpen(true)}
                aria-label="Buscar marcadores"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200/90 dark:border-[#2b395b] bg-white/90 dark:bg-[#161f36]/90 text-zinc-500 dark:text-slate-400 transition-all duration-300 hover:bg-white dark:hover:bg-[#1e2a4a] hover:text-zinc-700 dark:hover:text-slate-200 cursor-pointer shadow-xs"
              >
                <Search className="h-4 w-4" />
              </button>
            )}
          </motion.div>
        </div>

        {/* Results dropdown inside the header, without a full-screen overlay */}
        {showSearchResults && (
          <div className="mt-2 rounded-2xl border border-gray-200/50 dark:border-[#2b395b]/80 bg-white dark:bg-[#0b101d] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex flex-col w-full divide-y divide-gray-100 dark:divide-[#222e4d] max-h-80 overflow-y-auto">
              {searchResults.length > 0 ? (
                searchResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelectSearchResult(item)}
                    className="flex items-center gap-3 p-3 text-left transition-colors cursor-pointer bg-transparent hover:bg-zinc-50/80 dark:hover:bg-[#1e2a4a] group"
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center ${
                        item.category === "EVACUACION"
                          ? "text-emerald-600 dark:text-emerald-500"
                          : "text-red-500 dark:text-red-400"
                      }`}
                    >
                      {item.category === "EVACUACION" ? (
                        <ShieldCheck className="h-5 w-5" />
                      ) : (
                        <SquarePlus className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-zinc-900 dark:text-slate-100 group-hover:text-black dark:group-hover:text-white truncate">
                        {item.nombre}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-slate-400 font-medium truncate mt-0.5">
                        <MapPin className="h-3 w-3 shrink-0 text-zinc-400 dark:text-slate-500" />
                        <span className="truncate">{item.ubicacion}</span>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-3 py-6 text-center text-xs text-zinc-400 dark:text-slate-500 font-medium">
                  No se encontraron marcadores para &quot;
                  {markerSearchQuery}&quot;
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
