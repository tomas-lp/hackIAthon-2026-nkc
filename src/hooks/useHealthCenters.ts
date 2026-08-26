import { useCallback, useEffect, useState } from "react";
import { HealthCenter } from "@/types/healthCenter";
import { healthCenterService } from "@/services/healthCenterService";
import { createClient } from "@/lib/supabase/client";

export function useHealthCenters() {
  const [healthCenters, setHealthCenters] = useState<HealthCenter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHealthCenters = useCallback(async () => {
    setLoading(true);
    try {
      const data = await healthCenterService.getHealthCenters();
      setHealthCenters(data);
      setError(null);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error al cargar centros de salud"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchHealthCenters();
  }, [fetchHealthCenters]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("health_centers_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "health_centers" },
        () => {
          fetchHealthCenters();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchHealthCenters]);

  return {
    healthCenters,
    loading,
    error,
    refresh: fetchHealthCenters,
  };
}
