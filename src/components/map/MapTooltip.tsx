"use client";

import { ReactNode, useEffect } from "react";
import { Tooltip, useMap } from "react-leaflet";

export type MapTooltipVariant = "marker" | "polygon" | "report";

/**
 * Clase única para todos los tooltips del mapa.
 * El fondo/borde/modo oscuro lo resuelve `.leaflet-tooltip`
 * vía CSS vars (`--map-popup-*` en globals.css).
 */
export const MAP_TOOLTIP_CLASSNAME =
  "custom-tooltip font-sans rounded-xl shadow-xl px-3 py-2";

interface MapTooltipProps {
  children: ReactNode;
  /** marker: anclado arriba del pin · polygon/report: sigue el cursor */
  variant?: MapTooltipVariant;
  direction?: "top" | "bottom" | "left" | "right" | "center" | "auto";
  offset?: [number, number];
  sticky?: boolean;
  opacity?: number;
}

const VARIANT_DEFAULTS: Record<
  MapTooltipVariant,
  {
    sticky: boolean;
    direction?: MapTooltipProps["direction"];
    offset?: [number, number];
  }
> = {
  marker: { sticky: false, direction: "top", offset: [0, -10] },
  polygon: { sticky: true, direction: "top" },
  report: { sticky: false, direction: "top", offset: [0, -10] },
};

/**
 * Wrapper unificado sobre el Tooltip de react-leaflet (Leaflet).
 * Usar SIEMPRE este componente dentro de Marker/Polygon/CircleMarker
 * en lugar de `<Tooltip>` crudo: centraliza direction/offset/sticky/estilo.
 * No usar react-tooltip ni divs custom posicionados a mano: esos no siguen
 * la proyección latLng <-> píxel en pan/zoom.
 */
export function MapTooltip({
  children,
  variant = "marker",
  direction,
  offset,
  sticky,
  opacity = 0.95,
}: MapTooltipProps) {
  const defaults = VARIANT_DEFAULTS[variant];
  const directionProp = direction ?? defaults.direction;
  const offsetProp = offset ?? defaults.offset;
  return (
    // OJO: no pasar direction/offset como undefined explícito: Leaflet
    // setOptions copia la key y pisa su default ([0,0]), y _setPosition
    // revienta en .add(undefined) → el tooltip nunca se muestra.
    <Tooltip
      {...(directionProp !== undefined ? { direction: directionProp } : {})}
      {...(offsetProp !== undefined ? { offset: offsetProp } : {})}
      sticky={sticky ?? defaults.sticky}
      opacity={opacity}
      className={MAP_TOOLTIP_CLASSNAME}
    >
      {children}
    </Tooltip>
  );
}

/** Título en negrita, estándar en todos los tooltips del mapa. */
export function MapTooltipTitle({ children }: { children: ReactNode }) {
  return (
    <p className="font-bold text-sm text-zinc-900 dark:text-white leading-tight">
      {children}
    </p>
  );
}

/** Línea secundaria (tipo, descripción, fecha). */
export function MapTooltipSub({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs text-zinc-600 dark:text-slate-300 leading-tight">
      {children}
    </p>
  );
}

/** Línea de conteo "N reclamos en esta zona". */
export function MapTooltipCount({ count }: { count: number }) {
  return (
    <p className="text-xs text-zinc-600 dark:text-slate-300 leading-tight">
      Reclamos: <span className="font-semibold">{count}</span>
    </p>
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * HTML equivalente para los casos imperativos (`layer.bindTooltip` en
 * GeoJSON `onEachFeature`), donde no se puede montar `<MapTooltip>`
 * declarativo por feature. Mantiene el mismo markup/estilo.
 */
export function buildMapTooltipHtml({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}): string {
  return (
    `<div class="flex flex-col gap-0.5 font-sans p-0.5">` +
    `<span class="font-bold text-sm text-zinc-900 dark:text-slate-100 leading-tight">${escapeHtml(title)}</span>` +
    `<span class="text-xs font-medium text-zinc-600 dark:text-slate-300 leading-tight">${escapeHtml(subtitle)}</span>` +
    `</div>`
  );
}

/** Clase que oculta los tooltips mientras el mapa se arrastra (ver globals.css). */
const DRAGGING_CLASS = "leaflet-tooltip-suppressed";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyLayer = any;

/**
 * Manager global de tooltips: montarlo UNA vez dentro de cada `<MapContainer>`.
 * - Solo un tooltip visible a la vez (al abrirse uno, cierra los demás).
 * - Cierra todo al iniciar pan/zoom y oculta vía CSS mientras se arrastra,
 *   porque en movimientos bruscos se pierden los `mouseout` y se solapan.
 */
export function MapTooltipManager() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    let unsuppressTimer: ReturnType<typeof setTimeout> | null = null;

    const closeLayerTooltip = (layer: AnyLayer, except?: unknown) => {
      if (!layer) return;
      // Recursión: el closeTooltip de un GeoJSON/LayerGroup NO cierra los
      // tooltips de sus features hijas; hay que bajar a cada una.
      if (typeof layer.eachLayer === "function") {
        try {
          layer.eachLayer((child: AnyLayer) =>
            closeLayerTooltip(child, except)
          );
        } catch {
          // Ignorar
        }
      }
      if (typeof layer.closeTooltip !== "function") return;
      if (except && typeof layer.getTooltip === "function") {
        try {
          if (layer.getTooltip() === except) return;
        } catch {
          // Ignorar y cerrar igual
        }
      }
      try {
        layer.closeTooltip();
      } catch {
        // Ignorar
      }
    };

    const closeAll = (except?: unknown) => {
      try {
        map.eachLayer((layer: AnyLayer) => closeLayerTooltip(layer, except));
      } catch {
        // Ignorar
      }
    };

    const suppress = () => {
      if (unsuppressTimer) {
        clearTimeout(unsuppressTimer);
        unsuppressTimer = null;
      }
      container.classList.add(DRAGGING_CLASS);
      closeAll();
    };

    const unsuppress = () => {
      if (unsuppressTimer) clearTimeout(unsuppressTimer);
      // Al soltar, limpiar todo: no queda ningún tooltip visible
      closeAll();
      // Pequeño delay para que el cursor se asiente y no reabra en el acto;
      // se vuelve a cerrar por si algo se abrió en la ventana suprimida
      unsuppressTimer = setTimeout(() => {
        closeAll();
        container.classList.remove(DRAGGING_CLASS);
        unsuppressTimer = null;
      }, 150);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onTooltipOpen = (e: any) => {
      closeAll(e?.tooltip);
    };

    map.on("tooltipopen", onTooltipOpen);
    map.on("movestart", suppress);
    map.on("dragstart", suppress);
    map.on("zoomstart", suppress);
    map.on("mousedown", closeAll);
    map.on("moveend", unsuppress);
    map.on("dragend", unsuppress);
    map.on("zoomend", unsuppress);

    return () => {
      if (unsuppressTimer) clearTimeout(unsuppressTimer);
      container.classList.remove(DRAGGING_CLASS);
      map.off("tooltipopen", onTooltipOpen);
      map.off("movestart", suppress);
      map.off("dragstart", suppress);
      map.off("zoomstart", suppress);
      map.off("mousedown", closeAll);
      map.off("moveend", unsuppress);
      map.off("dragend", unsuppress);
      map.off("zoomend", unsuppress);
    };
  }, [map]);

  return null;
}
