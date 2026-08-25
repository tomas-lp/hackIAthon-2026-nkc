"use client";

import { useCallback, useEffect, useState } from "react";
import { regionService } from "@/services/regionService";
import { RegionLista } from "@/types/region";

export function useAdminTabs() {
  const [listas, setListas] = useState<RegionLista[]>([]);
  const [listTabs, setListTabs] = useState<string[]>([
    "Mapa de calor",
    "Barrios",
  ]);
  const [activeListTab, setActiveListTab] = useState<string>("Mapa de calor");
  const [isAddListModalOpen, setIsAddListModalOpen] = useState(false);

  const refreshLists = useCallback(async () => {
    try {
      const fetched = await regionService.getLists();
      setListas(fetched);
      const customNames = fetched.map((l) => l.nombre);
      const newTabs = Array.from(
        new Set(["Mapa de calor", "Barrios", ...customNames])
      );
      setListTabs(newTabs);
    } catch (err) {
      console.error("Error cargando listas:", err);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshLists();
  }, [refreshLists]);

  // Restaurar última vista guardada
  useEffect(() => {
    const saved = localStorage.getItem("lastMapView");
    if (
      saved &&
      (saved === "Mapa de calor" ||
        saved === "Todo" ||
        saved === "Barrios" ||
        listTabs.includes(saved))
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveListTab(saved === "Todo" ? "Mapa de calor" : saved);
    }
  }, [listTabs]);

  useEffect(() => {
    localStorage.setItem("lastMapView", activeListTab);
  }, [activeListTab]);

  const handleAddList = async (newListName: string) => {
    const trimmed = newListName.trim();
    if (!trimmed) return;

    try {
      const created = await regionService.createList(trimmed);
      if (created) {
        await refreshLists();
        setActiveListTab(created.nombre);
      } else if (!listTabs.includes(trimmed)) {
        setListTabs((prev) => [...prev, trimmed]);
        setActiveListTab(trimmed);
      }
    } catch (err) {
      console.error("Error creando lista:", err);
      if (!listTabs.includes(trimmed)) {
        setListTabs((prev) => [...prev, trimmed]);
        setActiveListTab(trimmed);
      }
    }
  };

  return {
    listas,
    listTabs,
    activeListTab,
    setActiveListTab,
    isAddListModalOpen,
    setIsAddListModalOpen,
    handleAddList,
    refreshLists,
  };
}
