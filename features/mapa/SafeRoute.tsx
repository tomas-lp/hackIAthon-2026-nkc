"use client";

/**
 * SafeRoute
 *
 * Componente Leaflet que visualiza la ruta segura activa:
 *   - Polilínea animada verde con efecto "hormiga" (dashed, animated offset)
 *   - Línea base sólida verde semitransparente de fondo
 *   - Marcador pulsante en el destino
 *
 * DEBE renderizarse como hijo de <MapContainer> (usa useMap internamente
 * a través de react-leaflet).
 */

import { useEffect, useState } from "react";
import { useMap, Polyline } from "react-leaflet";
import L from "leaflet";
import { RouteResult } from "@/lib/routing";

interface SafeRouteProps {
  route: RouteResult;
  isClosing?: boolean;
}

export function SafeRoute({ route, isClosing }: SafeRouteProps) {
  const map = useMap();
  const { polyline } = route;
  const [fadeOpacity, setFadeOpacity] = useState(0);

  // ── Animación de aparición (fade in) y desvanecimiento (fade out) ────────────
  useEffect(() => {
    let animationFrameId: number;
    let start: number | null = null;
    const duration = 400; // ms

    const initialOpacity = isClosing ? 1 : 0;
    const targetOpacity = isClosing ? 0 : 1;

    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const current =
        initialOpacity + (targetOpacity - initialOpacity) * progress;

      setFadeOpacity(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isClosing, polyline]);

  // ── Centrar el mapa en la ruta ──────────────────────────────────────────────
  useEffect(() => {
    if (!polyline || polyline.length < 2) return;
    const bounds = L.latLngBounds(polyline);
    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [60, 60],
        duration: 0.8,
        animate: true,
      });
    }
  }, [map, polyline]);

  // ── Inyectar CSS de animaciones una sola vez ─────────────────────────────────
  useEffect(() => {
    const STYLE_ID = "safe-route-animations";
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      @keyframes safe-route-dash {
        to { stroke-dashoffset: -30; }
      }
      @keyframes safe-route-pulse {
        0%   { transform: scale(0.6); opacity: 0.8; }
        70%  { transform: scale(1.4); opacity: 0; }
        100% { transform: scale(1.4); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }, []);

  if (polyline.length < 2) return null;

  return (
    <>
      {/* Línea base: sólida, semitransparente, da "grosor" visual */}
      <Polyline
        positions={polyline}
        pathOptions={{
          color: "#10b981",
          weight: 8,
          opacity: 0.25 * fadeOpacity,
          lineCap: "round",
          lineJoin: "round",
        }}
      />

      {/* Línea principal: sólida verde */}
      <Polyline
        positions={polyline}
        pathOptions={{
          color: "#10b981",
          weight: 4,
          opacity: 0.9 * fadeOpacity,
          lineCap: "round",
          lineJoin: "round",
        }}
      />

      {/* Línea animada: efecto "hormiga" blanco */}
      <Polyline
        positions={polyline}
        pathOptions={{
          color: "#ffffff",
          weight: 4,
          opacity: 0.7 * fadeOpacity,
          lineCap: "round",
          lineJoin: "round",
          dashArray: "10, 20",
          dashOffset: "0",
          className: "safe-route-animated",
        }}
      />
    </>
  );
}
