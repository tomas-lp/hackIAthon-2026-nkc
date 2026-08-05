import { useEffect, useState } from "react";
import { Zone } from "@/types/report";

const REFETCH_DEBOUNCE_MS = 400;

export function useZones(depKey: string) {
  const [zones, setZones] = useState<Zone[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch("/api/zones", { signal: controller.signal })
        .then((res) => {
          if (!res.ok) throw new Error(`Error ${res.status}`);
          return res.json();
        })
        .then((data: Zone[]) => setZones(data))
        .catch(() => {
          // No rompemos el mapa si las zonas fallan; se pintan solo marcadores.
        });
    }, REFETCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [depKey]);

  return { zones };
}
