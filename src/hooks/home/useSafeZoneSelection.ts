"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSafeZones } from "@/hooks/useSafeZones";
import { SafeZone } from "@/types/safeZone";
import { safeZoneService } from "@/services/safeZoneService";
import { useUrlSelection } from "@/hooks/useUrlSelection";

export function useSafeZoneSelection() {
  const { safeZones, refresh: refreshSafeZones } = useSafeZones();
  const { initialSafeZoneId } = useUrlSelection();

  const [selectedSafeZoneId, setSelectedSafeZoneId] = useState<string | null>(
    null
  );
  const selectedSafeZone = useMemo(
    () => safeZones.find((z) => z.id === selectedSafeZoneId) ?? null,
    [safeZones, selectedSafeZoneId]
  );

  const setSelectedSafeZone = useCallback((zone: SafeZone | null) => {
    setSelectedSafeZoneId(zone?.id ?? null);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (initialSafeZoneId) setSelectedSafeZoneId(initialSafeZoneId);
  }, [initialSafeZoneId]);

  const [isEditingSingleSafeZone, setIsEditingSingleSafeZone] = useState(false);
  const [isCreatingSafeZone, setIsCreatingSafeZone] = useState(false);
  const [isEditingSafeZones, setIsEditingSafeZones] = useState(false);
  const [draftLocation, setDraftLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [showSafeZoneModal, setShowSafeZoneModal] = useState(false);

  const handleSaveSafeZone = useCallback(
    async (dto: { nombre: string; descripcion: string }) => {
      if (isEditingSingleSafeZone && selectedSafeZone) {
        await safeZoneService.updateSafeZone(selectedSafeZone.id, dto);
        setIsEditingSingleSafeZone(false);
      } else if (draftLocation) {
        await safeZoneService.createSafeZone({
          ...dto,
          latitud: draftLocation.lat,
          longitud: draftLocation.lng,
        });
        setDraftLocation(null);
        setIsCreatingSafeZone(false);
        setShowSafeZoneModal(false);
      }
      refreshSafeZones();
    },
    [isEditingSingleSafeZone, selectedSafeZone, draftLocation, refreshSafeZones]
  );

  const handleDeleteSafeZone = useCallback(async () => {
    if (!selectedSafeZone) return;
    await safeZoneService.deleteSafeZone(selectedSafeZone.id);
    setSelectedSafeZone(null);
    refreshSafeZones();
  }, [selectedSafeZone, setSelectedSafeZone, refreshSafeZones]);

  return {
    safeZones,
    refreshSafeZones,
    selectedSafeZone,
    setSelectedSafeZone,
    selectedSafeZoneId,
    setSelectedSafeZoneId,
    isEditingSingleSafeZone,
    setIsEditingSingleSafeZone,
    isCreatingSafeZone,
    setIsCreatingSafeZone,
    isEditingSafeZones,
    setIsEditingSafeZones,
    draftLocation,
    setDraftLocation,
    showSafeZoneModal,
    setShowSafeZoneModal,
    handleSaveSafeZone,
    handleDeleteSafeZone,
  };
}
