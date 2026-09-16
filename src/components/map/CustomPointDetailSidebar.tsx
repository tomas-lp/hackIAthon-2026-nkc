"use client";

import { useEffect, useState } from "react";
import { MapPin, Navigation, Loader2 } from "lucide-react";
import { resolveAddress } from "@/lib/geocode";
import { MapDetailRow } from "@/components/map/MapDetailRow";
import { MapDetailShell } from "@/components/map/MapDetailShell";

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
    <MapDetailShell
      title="Ubicación seleccionada"
      isOpen={isOpen}
      isClosing={isClosing}
      onClose={handleClose}
      footer={
        onNavigate ? (
          <button
            type="button"
            onClick={() =>
              onNavigate({
                lat: activePoint.lat,
                lng: activePoint.lng,
                address: displayAddress,
              })
            }
            disabled={isNavigating}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-3 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-blue-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            {isNavigating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
            {isNavigating ? "Calculando…" : "Cómo llegar"}
          </button>
        ) : undefined
      }
    >
      <dl className="flex flex-col">
        <MapDetailRow icon={<MapPin className="h-4 w-4" />} label="Ubicación">
          <span className="block text-zinc-800 dark:text-slate-100">
            {displayAddress}
          </span>
          <span className="mt-1 block font-mono text-[10px] font-normal text-zinc-400 dark:text-slate-500">
            {activePoint.lat.toFixed(5)}, {activePoint.lng.toFixed(5)}
          </span>
        </MapDetailRow>
      </dl>
    </MapDetailShell>
  );
}
