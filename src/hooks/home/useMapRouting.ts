"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouting } from "@/hooks/useRouting";
import { SafeZone } from "@/types/safeZone";
import { HeatPoint } from "@/lib/heatmap";
import { RouteResult } from "@/lib/routing";
import { buildHeatPoints } from "@/lib/heatmap";
import { Report } from "@/types/report";

interface UseMapRoutingOptions {
  reports: Report[];
  safeZones: SafeZone[];
  selectedSafeZone: SafeZone | null;
  setSelectedSafeZone: (z: SafeZone | null) => void;
}

export function useMapRouting({
  reports,
  safeZones,
  selectedSafeZone,
  setSelectedSafeZone,
}: UseMapRoutingOptions) {
  const heatPoints = useMemo<HeatPoint[]>(
    () => buildHeatPoints(reports),
    [reports]
  );
  const { routingState, startRouting, clearRoute } = useRouting(
    safeZones,
    heatPoints
  );

  const [navigatingTargetId, setNavigatingTargetId] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (routingState.status !== "loading") {
      queueMicrotask(() => setNavigatingTargetId(null));
    }
  }, [routingState.status]);

  const [draftCustomPin, setDraftCustomPin] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [activeRouteCustomPin, setActiveRouteCustomPin] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [closingCustomPin, setClosingCustomPin] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [isClosingDraftCustomPin, setIsClosingDraftCustomPin] = useState(false);

  const [displayRoute, setDisplayRoute] = useState<RouteResult | null>(null);
  const [isClosingRoute, setIsClosingRoute] = useState(false);
  const prevActiveRouteRef = useRef<RouteResult | null>(null);

  useEffect(() => {
    if (
      routingState.activeRoute &&
      routingState.activeRoute !== prevActiveRouteRef.current
    ) {
      prevActiveRouteRef.current = routingState.activeRoute;
      queueMicrotask(() => {
        setDisplayRoute(routingState.activeRoute);
        setIsClosingRoute(false);

        const isNewRouteCustom =
          routingState.activeRoute?.zone?.id === "custom-point";

        if (isNewRouteCustom && draftCustomPin) {
          const newTargetPin = {
            lat: draftCustomPin.lat,
            lng: draftCustomPin.lng,
          };
          if (activeRouteCustomPin) {
            const oldPin = activeRouteCustomPin;
            setClosingCustomPin(oldPin);
            setTimeout(() => {
              setClosingCustomPin((curr) => (curr === oldPin ? null : curr));
            }, 300);
          }
          setActiveRouteCustomPin(newTargetPin);
          setDraftCustomPin(null);
          setIsClosingDraftCustomPin(false);
        } else if (!isNewRouteCustom) {
          if (activeRouteCustomPin) {
            const oldPin = activeRouteCustomPin;
            setClosingCustomPin(oldPin);
            setActiveRouteCustomPin(null);
            setTimeout(() => {
              setClosingCustomPin((curr) => (curr === oldPin ? null : curr));
            }, 300);
          }
          if (draftCustomPin) {
            setDraftCustomPin(null);
            setIsClosingDraftCustomPin(false);
          }
        }

        if (selectedSafeZone) {
          setSelectedSafeZone(null);
        }
      });
    } else if (!routingState.activeRoute) {
      prevActiveRouteRef.current = null;
    }
  }, [
    routingState.activeRoute,
    draftCustomPin,
    activeRouteCustomPin,
    selectedSafeZone,
    setSelectedSafeZone,
  ]);

  const handleCancelRoute = useCallback(() => {
    setIsClosingRoute(true);
    if (activeRouteCustomPin) {
      setClosingCustomPin(activeRouteCustomPin);
      setActiveRouteCustomPin(null);
    }
    setTimeout(() => {
      clearRoute();
      setDisplayRoute(null);
      setIsClosingRoute(false);
      setClosingCustomPin(null);
    }, 300);
  }, [activeRouteCustomPin, clearRoute]);

  const handleCloseDraftCustomPin = useCallback(() => {
    setIsClosingDraftCustomPin(true);
    if (draftCustomPin) {
      const pinToClose = draftCustomPin;
      setDraftCustomPin(null);
      setClosingCustomPin(pinToClose);
      setTimeout(() => {
        setIsClosingDraftCustomPin(false);
        setClosingCustomPin((curr) => (curr === pinToClose ? null : curr));
      }, 300);
    } else {
      setIsClosingDraftCustomPin(false);
    }
  }, [draftCustomPin]);

  const handleNavigateToCustomPoint = useCallback(
    (point: { lat: number; lng: number; address: string }) => {
      const customZone: SafeZone = {
        id: "custom-point",
        nombre: point.address || "Ubicación seleccionada",
        descripcion: "",
        latitud: point.lat,
        longitud: point.lng,
        created_at: new Date().toISOString(),
      };
      setNavigatingTargetId("custom-point");
      startRouting(customZone);
    },
    [startRouting]
  );

  const startNavigation = useCallback(
    (
      target: SafeZone | null,
      targetId: string | null,
      zonesOverride?: SafeZone[]
    ) => {
      if (targetId) setNavigatingTargetId(targetId);
      else setNavigatingTargetId(target?.id ?? "nearest");
      startRouting(target, zonesOverride);
    },
    [startRouting]
  );

  const openDraftPin = useCallback((pin: { lat: number; lng: number }) => {
    setDraftCustomPin(pin);
    setIsClosingDraftCustomPin(false);
  }, []);

  return {
    heatPoints,
    routingState,
    startRouting: startNavigation,
    rawStartRouting: startRouting,
    clearRoute,
    navigatingTargetId,
    setNavigatingTargetId,
    draftCustomPin,
    setDraftCustomPin,
    openDraftPin,
    activeRouteCustomPin,
    closingCustomPin,
    isClosingDraftCustomPin,
    setIsClosingDraftCustomPin,
    displayRoute,
    isClosingRoute,
    handleCancelRoute,
    handleCloseDraftCustomPin,
    handleNavigateToCustomPoint,
  };
}
