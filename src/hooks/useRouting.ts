"use client";

/**
 * useRouting
 *
 * Hook que gestiona el ciclo de vida completo de la navegación segura:
 *   idle → loading → active | error
 *
 * Expone:
 *   - routingState   estado actual
 *   - startRouting   inicia la navegación (a zona específica o a la más segura)
 *   - clearRoute     cancela/limpia la ruta activa
 */

import { useState, useCallback } from "react";
import { SafeZone } from "@/types/safeZone";
import { HeatPoint } from "@/lib/heatmap";
import { RouteResult, findSafestRoute, routeToZone } from "@/lib/routing";

// ─── Tipos ─────────────────────────────────────────────────────────────────────

export type RoutingStatus = "idle" | "loading" | "active" | "error";

export interface RoutingState {
  status: RoutingStatus;
  activeRoute: RouteResult | null;
  error: string | null;
}

const INITIAL_STATE: RoutingState = {
  status: "idle",
  activeRoute: null,
  error: null,
};

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useRouting(safeZones: SafeZone[], heatPoints: HeatPoint[]) {
  const [routingState, setRoutingState] = useState<RoutingState>(INITIAL_STATE);

  /**
   * Solicita la posición GPS del usuario.
   * Resuelve con [lat, lng] o rechaza con un mensaje de error amigable.
   */
  const getUserLocation = useCallback((): Promise<[number, number]> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject("Tu navegador no soporta geolocalización.");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve([pos.coords.latitude, pos.coords.longitude]),
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            reject(
              "Permiso de ubicación denegado. Habilítalo en la configuración del navegador."
            );
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            reject("No se pudo obtener tu ubicación. Inténtalo de nuevo.");
          } else {
            reject("Tiempo de espera agotado al obtener ubicación.");
          }
        },
        { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 }
      );
    });
  }, []);

  /**
   * Inicia la navegación:
   * - Si `targetZone` es null/undefined → calcula la ruta a la zona más segura
   *   considerando el riesgo del camino.
   * - Si `targetZone` es una SafeZone concreta → calcula la ruta sólo a esa zona.
   */
  const startRouting = useCallback(
    async (targetZone?: SafeZone | null, zonesOverride?: SafeZone[]) => {
      setRoutingState({ status: "loading", activeRoute: null, error: null });

      try {
        const userLocation = await getUserLocation();

        let result: RouteResult | null;

        if (targetZone) {
          result = await routeToZone(userLocation, targetZone, heatPoints);
        } else {
          const candidateZones =
            zonesOverride && zonesOverride.length > 0
              ? zonesOverride
              : safeZones;
          result = await findSafestRoute(
            userLocation,
            candidateZones,
            heatPoints
          );
        }

        if (!result) {
          setRoutingState({
            status: "error",
            activeRoute: null,
            error: "No se encontraron rutas a ubicaciones disponibles.",
          });
          return;
        }

        setRoutingState({ status: "active", activeRoute: result, error: null });
      } catch (err) {
        const message =
          typeof err === "string"
            ? err
            : "Ocurrió un error al calcular la ruta. Inténtalo de nuevo.";
        setRoutingState({ status: "error", activeRoute: null, error: message });
      }
    },
    [getUserLocation, safeZones, heatPoints]
  );

  /**
   * Cancela la ruta activa y regresa al estado idle.
   */
  const clearRoute = useCallback(() => {
    setRoutingState(INITIAL_STATE);
  }, []);

  return { routingState, startRouting, clearRoute };
}
