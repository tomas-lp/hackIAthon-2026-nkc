"use client";

import dynamic from "next/dynamic";
import { Report } from "@/types/report";
import { Loader2 } from "lucide-react";

import { SafeZone } from "@/types/safeZone";
import { HealthCenter } from "@/types/healthCenter";
import { RouteResult } from "@/lib/routing";

interface ReportMapProps {
  reports: Report[];
  selectedReport: Report | null;
  onSelectReport: (report: Report | null) => void;
  safeZones?: SafeZone[];
  selectedSafeZone?: SafeZone | null;
  onSelectSafeZone?: (zone: SafeZone | null) => void;
  healthCenters?: HealthCenter[];
  selectedHealthCenter?: HealthCenter | null;
  onSelectHealthCenter?: (center: HealthCenter | null) => void;
  onMapClick?: (lat: number, lng: number) => void;
  isCreatingSafeZone?: boolean;
  draftLocation?: { lat: number; lng: number } | null;
  draftCustomPin?: { lat: number; lng: number } | null;
  activeRouteCustomPin?: { lat: number; lng: number } | null;
  closingCustomPin?: { lat: number; lng: number } | null;
  activeRoute?: RouteResult | null;
  isClosingRoute?: boolean;
}

const ReportMapInternal = dynamic(() => import("./ReportMapInternal"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[500px] flex flex-col items-center justify-center bg-zinc-50  border border-zinc-200  rounded-lg text-zinc-400">
      <Loader2 className="w-8 h-8 animate-spin mb-2 text-zinc-400" />
      <span className="text-xs font-mono">Cargando mapa de Corrientes...</span>
    </div>
  ),
});

import { Component, ReactNode } from "react";

class MapErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: unknown) {
    console.error("Error en mapa Leaflet:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full min-h-[500px] flex flex-col items-center justify-center bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-600 p-6 text-center">
          <p className="font-semibold text-red-600 mb-1">
            Error al renderizar el mapa
          </p>
          <p className="text-xs text-zinc-500 mb-4">
            {this.state.error?.message}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-3 py-1.5 bg-zinc-800 text-white text-xs rounded-md hover:bg-zinc-700 transition cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function ReportMap(props: ReportMapProps) {
  return (
    <MapErrorBoundary>
      <ReportMapInternal {...props} />
    </MapErrorBoundary>
  );
}
