"use client";

import { useCallback, useMemo, useState } from "react";
import { useHealthCenters } from "@/hooks/useHealthCenters";
import { HealthCenter, HealthCenterType } from "@/types/healthCenter";
import { healthCenterService } from "@/services/healthCenterService";

export function useHealthCenterSelection() {
  const { healthCenters, refresh: refreshHealthCenters } = useHealthCenters();

  const [isEditingSingleHealthCenter, setIsEditingSingleHealthCenter] =
    useState(false);
  const [selectedHealthCenterId, setSelectedHealthCenterId] = useState<
    string | null
  >(null);

  const selectedHealthCenter = useMemo(
    () => healthCenters.find((hc) => hc.id === selectedHealthCenterId) ?? null,
    [healthCenters, selectedHealthCenterId]
  );

  const setSelectedHealthCenter = useCallback((hc: HealthCenter | null) => {
    setSelectedHealthCenterId(hc?.id ?? null);
  }, []);

  const handleSaveHealthCenter = useCallback(
    async (data: { nombre: string; tipo: HealthCenterType }) => {
      if (selectedHealthCenter) {
        await healthCenterService.updateHealthCenter(
          selectedHealthCenter.id,
          data
        );
        setIsEditingSingleHealthCenter(false);
        refreshHealthCenters();
      }
    },
    [selectedHealthCenter, refreshHealthCenters]
  );

  const handleDeleteHealthCenter = useCallback(async () => {
    if (!selectedHealthCenter) return;
    await healthCenterService.deleteHealthCenter(selectedHealthCenter.id);
    setSelectedHealthCenter(null);
    refreshHealthCenters();
  }, [selectedHealthCenter, setSelectedHealthCenter, refreshHealthCenters]);

  const healthZones = useMemo(
    () =>
      healthCenters
        .filter((hc) => hc.lat !== null && hc.lon !== null)
        .map((hc) => ({
          id: `hc-${hc.id}`,
          nombre: hc.nombre,
          descripcion: `${hc.tipo} · ${hc.direccion || hc.localidad || "Corrientes"}`,
          latitud: hc.lat!,
          longitud: hc.lon!,
          created_at: hc.updated_at,
          isHealthCenter: true,
          tipo: hc.tipo,
        })),
    [healthCenters]
  );

  return {
    healthCenters,
    refreshHealthCenters,
    selectedHealthCenter,
    setSelectedHealthCenter,
    selectedHealthCenterId,
    setSelectedHealthCenterId,
    isEditingSingleHealthCenter,
    setIsEditingSingleHealthCenter,
    handleSaveHealthCenter,
    handleDeleteHealthCenter,
    healthZones,
  };
}
