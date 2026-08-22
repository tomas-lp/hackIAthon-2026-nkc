"use client";

import { useEffect, useState } from "react";

export function useAdminTabs() {
  const [listTabs, setListTabs] = useState<string[]>(["Todo", "Barrios"]);
  const [activeListTab, setActiveListTab] = useState<string>("Todo");
  const [isAddListModalOpen, setIsAddListModalOpen] = useState(false);

  // Restaurar última vista guardada (Barrios como variante interna, sin ruta /barrios)
  useEffect(() => {
    const saved = localStorage.getItem("lastMapView");
    if (
      saved &&
      (saved === "Todo" || saved === "Barrios" || listTabs.includes(saved))
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveListTab(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem("lastMapView", activeListTab);
  }, [activeListTab]);

  const handleAddList = (newListName: string) => {
    const trimmed = newListName.trim();
    if (!trimmed) return;
    if (!listTabs.includes(trimmed)) {
      setListTabs((prev) => [...prev, trimmed]);
    }
    setActiveListTab(trimmed);
  };

  return {
    listTabs,
    activeListTab,
    setActiveListTab,
    isAddListModalOpen,
    setIsAddListModalOpen,
    handleAddList,
  };
}
