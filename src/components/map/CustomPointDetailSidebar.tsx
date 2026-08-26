"use client";

import { useEffect, useState } from "react";
import { X, MapPin, Navigation, Loader2 } from "lucide-react";
import { resolveAddress } from "@/lib/geocode";

interface CustomPointDetailSidebarProps {
  customPoint: { lat: number; lng: number } | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (point: { lat: number; lng: number; address: string }) => void;
  isNavigating?: boolean;
}

export function CustomPointDetailSidebar({
  customPoint,
  isOpen,
  onClose,
  onNavigate,
  isNavigating = false,
}: CustomPointDetailSidebarProps) {
  const [address, setAddress] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(!isOpen);
  const [activePoint, setActivePoint] = useState<{
    lat: number;
    lng: number;
  } | null>(customPoint);

  useEffect(() => {
    if (customPoint) {
      queueMicrotask(() => {
        setActivePoint(customPoint);
        setIsClosing(false);
      });
    } else {
      queueMicrotask(() => {
        setIsClosing(true);
      });
    }
  }, [customPoint, isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 250);
  };

  useEffect(() => {
    let isCancelled = false;

    if (activePoint?.lat && activePoint?.lng) {
      resolveAddress(activePoint.lat, activePoint.lng)
        .then((resolved) => {
          if (!isCancelled) setAddress(resolved);
        })
        .catch(() => {
          if (!isCancelled) setAddress("Ubicación no disponible");
        });
    }

    return () => {
      isCancelled = true;
    };
  }, [activePoint?.lat, activePoint?.lng]);

  if (!activePoint) return null;

  const displayAddress =
    address ??
    `Lat ${activePoint.lat.toFixed(4)}, Lng ${activePoint.lng.toFixed(4)}`;

  return (
    <aside
      className={`absolute right-4 top-28 z-[1000] w-80 max-w-80 rounded-2xl border border-gray-200 bg-white/50 backdrop-blur-xs p-2.5 transition-all duration-300 ease-in-out ${
        isClosing || !isOpen
          ? "translate-x-[120%] opacity-0 pointer-events-none"
          : "translate-x-0 opacity-100"
      }`}
    >
      <div className="flex items-center justify-between mb-2 px-1.5 pt-1">
        <span className="text-sm font-semibold text-zinc-800 tracking-tight">
          Ubicación seleccionada
        </span>
        <button
          onClick={handleClose}
          className="rounded-full p-1.5 text-zinc-500 transition-colors hover:bg-zinc-200/50 hover:text-zinc-800 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col rounded-[14px] border border-gray-200 bg-white p-3.5 gap-4">
        <div className="flex items-start gap-2.5 text-xs p-3 bg-zinc-50 border border-zinc-100 rounded-xl">
          <MapPin className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-zinc-800 leading-relaxed">
              {displayAddress}
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">
              {activePoint.lat.toFixed(5)}, {activePoint.lng.toFixed(5)}
            </span>
          </div>
        </div>

        {onNavigate && (
          <button
            onClick={() =>
              onNavigate({
                lat: activePoint.lat,
                lng: activePoint.lng,
                address: displayAddress,
              })
            }
            disabled={isNavigating}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-blue-600 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer shadow-sm"
          >
            {isNavigating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
            {isNavigating ? "Calculando…" : "Cómo llegar"}
          </button>
        )}
      </div>
    </aside>
  );
}
