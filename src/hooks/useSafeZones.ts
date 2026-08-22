import { useCallback, useEffect, useState } from "react";
import { SafeZone } from "@/types/safeZone";
import { safeZoneService } from "@/services/safeZoneService";
import { createClient } from "@/lib/supabase/client";

export function useSafeZones() {
  const [safeZones, setSafeZones] = useState<SafeZone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSafeZones = useCallback(async () => {
    setLoading(true);
    try {
      const data = await safeZoneService.getSafeZones();
      setSafeZones(data);
      setError(null);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error al cargar zonas seguras"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSafeZones();
  }, [fetchSafeZones]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("safe_zones_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "safe_zones" },
        () => {
          fetchSafeZones();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSafeZones]);

  return {
    safeZones,
    loading,
    error,
    refresh: fetchSafeZones,
  };
}
