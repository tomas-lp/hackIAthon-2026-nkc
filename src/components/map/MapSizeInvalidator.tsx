"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";

export function MapSizeInvalidator() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    if (!container) return;

    let animFrameId: number;

    const invalidate = () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
      animFrameId = requestAnimationFrame(() => {
        try {
          map.invalidateSize({ animate: false });
        } catch {
          // Ignorar
        }
      });
    };

    // 1. Invalidar inmediatamente
    invalidate();

    // 2. ResizeObserver para detectar cambios de dimensiones en tiempo real (sidebar colapsable/expandible)
    const observer = new ResizeObserver(() => {
      invalidate();
    });
    observer.observe(container);

    // 3. Escuchar resize de ventana y finalización de transiciones CSS
    window.addEventListener("resize", invalidate);
    document.addEventListener("transitionend", invalidate);

    // 4. Intervalo suave durante los primeros 500ms para animaciones CSS de transición
    const interval = setInterval(invalidate, 40);
    const timeout = setTimeout(() => clearInterval(interval), 500);

    return () => {
      observer.disconnect();
      if (animFrameId) cancelAnimationFrame(animFrameId);
      window.removeEventListener("resize", invalidate);
      document.removeEventListener("transitionend", invalidate);
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [map]);

  return null;
}
