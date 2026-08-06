"use client";

import { Rectangle, Tooltip } from "react-leaflet";
import { Zone } from "@/types/report";
import { ZONE_CONFIG } from "@/lib/utils";

interface ZoneLayerProps {
  zones: Zone[];
}

function isValidZone(zone: Zone): boolean {
  const { minLat, minLng, maxLat, maxLng } = zone.bounds;
  return (
    Number.isFinite(minLat) &&
    Number.isFinite(minLng) &&
    Number.isFinite(maxLat) &&
    Number.isFinite(maxLng)
  );
}

export function ZoneLayer({ zones }: ZoneLayerProps) {
  return (
    <>
      {zones.filter(isValidZone).map((zone) => {
        const cfg = ZONE_CONFIG[zone.nivel];
        return (
          <Rectangle
            key={`${zone.id}-${zone.nivel}-${zone.puntaje}-${zone.cantidadReportes}`}
            bounds={[
              [zone.bounds.minLat, zone.bounds.minLng],
              [zone.bounds.maxLat, zone.bounds.maxLng],
            ]}
            pathOptions={{
              color: cfg.color,
              weight: 1.5,
              fillColor: cfg.color,
              fillOpacity: 0.35,
            }}
          >
            <Tooltip sticky>
              <span className="font-semibold">{cfg.label}</span>
              <span className="block font-mono text-[11px]">
                {zone.puntaje} pts · {zone.cantidadReportes} reporte(s)
              </span>
            </Tooltip>
          </Rectangle>
        );
      })}
    </>
  );
}
