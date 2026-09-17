"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Switch } from "@/components/ui/Switch";
import { Pencil, X, Check, Trash2, ChevronDown, Plus } from "lucide-react";

interface AdminTopBarProps {
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  onAddList: () => void;
  isHidden: boolean;
  showEditButton?: boolean;
  isEditingRegions?: boolean;
  onStartEditing?: () => void;
  onCancelEditing?: () => void;
  onConfirmEditing?: () => void;
  onDeleteList?: () => void;
}

export function AdminTopBar({
  tabs,
  activeTab,
  onTabChange,
  onAddList,
  isHidden,
  showEditButton = false,
  isEditingRegions = false,
  onStartEditing,
  onCancelEditing,
  onConfirmEditing,
  onDeleteList,
}: AdminTopBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Separar las pestañas fijas ("Mapa de calor", "Barrios") de las listas personalizadas
  const fixedTabs = ["Mapa de calor", "Barrios"];
  const customTabs = tabs.filter((tab) => !fixedTabs.includes(tab));

  // Determinar la lista personalizada activa o seleccionada
  const activeCustomTab = customTabs.includes(activeTab)
    ? activeTab
    : (customTabs[0] ?? "");

  const hasDropdown = customTabs.length >= 2;

  // Manejo del click en la pestaña de lista personalizada
  const handleCustomTabClick = () => {
    if (customTabs.includes(activeTab)) {
      // Si la pestaña ya está activa, el click conmuta abrir/cerrar el menú desplegable (si hay 2 o más opciones)
      if (hasDropdown) {
        setIsDropdownOpen((prev) => !prev);
      }
    } else {
      // Si se viene de "Mapa de calor" o "Barrios", el 1er click solo activa la lista SIN desplegar el menú
      onTabChange(activeCustomTab);
      setIsDropdownOpen(false);
    }
  };

  // Cerrar dropdown al hacer click fuera del contenedor principal
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <motion.div
      className={`absolute top-20 sm:top-4 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-2 transition-opacity duration-300 ease-in-out ${
        isHidden ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div ref={containerRef} className="relative">
        <Switch
          value={activeTab}
          onValueChange={onTabChange}
          className="w-auto"
        >
          {fixedTabs
            .filter((t) => tabs.includes(t))
            .map((tab) => (
              <Switch.Option key={tab} value={tab} className="w-auto">
                {tab}
              </Switch.Option>
            ))}

          {/* Si hay listas personalizadas creadas, mostrar la pestaña de lista personalizada */}
          {customTabs.length > 0 && (
            <Switch.Option
              value={activeCustomTab}
              onClick={handleCustomTabClick}
              className="w-auto"
            >
              <span className="flex items-center gap-1">
                <span>{activeCustomTab}</span>
                {hasDropdown && (
                  <ChevronDown
                    className={`h-3.5 w-3.5 ${
                      isDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                )}
              </span>
            </Switch.Option>
          )}
        </Switch>

        {/* Menú desplegable flotante (SOLO cuando hay 2 o más listas y se presiona por 2da vez) */}
        {hasDropdown && isDropdownOpen && (
          <div className="absolute top-full mt-2 right-0 z-50 flex flex-col rounded-2xl border border-gray-200/60 dark:border-slate-600/60 bg-white/90 dark:bg-slate-800/95 backdrop-blur-md shadow-[0_7px_50px_0px_rgb(0,0,0,0.1)] min-w-[170px] overflow-hidden p-1.5">
            {customTabs.map((tab) => {
              const isSelected = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    onTabChange(tab);
                    setIsDropdownOpen(false);
                  }}
                  className={`flex items-center justify-between rounded-xl px-3.5 py-2 text-xs text-left transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-white dark:bg-slate-700 font-bold text-zinc-950 dark:text-white shadow-xs"
                      : "text-zinc-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60 hover:text-zinc-950 dark:hover:text-white font-medium"
                  }`}
                >
                  <span>{tab}</span>
                  {isSelected && (
                    <Check className="h-3.5 w-3.5 text-zinc-900 dark:text-white ml-2" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Botones de acción: absolutos a la derecha del switch */}
      <AnimatePresence initial={false} mode="wait">
        {!isEditingRegions ? (
          <motion.div
            key="action-buttons"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="sm:absolute sm:left-full sm:top-1/2 sm:ml-2 sm:-translate-y-1/2 flex items-center gap-2"
          >
            <button
              onClick={onAddList}
              title="Nueva lista personalizada"
              aria-label="Nueva lista personalizada"
              className="h-9 w-9 aspect-square flex items-center justify-center rounded-full border border-gray-200/60 dark:border-slate-600/60 bg-white/50 dark:bg-slate-800/60 shadow-[0_7px_50px_0px_rgb(0,0,0,0.1)] backdrop-blur-md text-zinc-700 dark:text-white transition-colors duration-200 hover:bg-zinc-200/80 dark:hover:bg-slate-700/80 cursor-pointer shrink-0"
            >
              <Plus className="h-4 w-4 text-zinc-700 dark:text-white shrink-0" />
            </button>

            {showEditButton && (
              <div className="flex items-center gap-2">
                <button
                  onClick={onStartEditing}
                  title="Editar zonas"
                  aria-label="Editar zonas"
                  className="h-9 w-9 aspect-square min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full border border-gray-200/60 dark:border-slate-600/60 bg-white/50 dark:bg-slate-800/60 shadow-[0_7px_50px_0px_rgb(0,0,0,0.1)] backdrop-blur-md text-zinc-700 dark:text-white transition-colors duration-200 hover:bg-zinc-200/80 dark:hover:bg-slate-700/80 cursor-pointer shrink-0"
                >
                  <Pencil className="h-4 w-4 text-zinc-700 dark:text-white shrink-0" />
                </button>

                <button
                  onClick={onDeleteList}
                  title="Eliminar lista personalizada"
                  aria-label="Eliminar lista personalizada"
                  className="h-9 w-9 aspect-square min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full border border-gray-200/60 dark:border-slate-600/60 bg-white/50 dark:bg-slate-800/60 shadow-[0_7px_50px_0px_rgb(0,0,0,0.1)] backdrop-blur-md text-zinc-700 dark:text-white transition-colors duration-200 hover:bg-zinc-200/80 dark:hover:bg-slate-700/80 cursor-pointer shrink-0"
                >
                  <Trash2 className="h-4 w-4 text-zinc-700 dark:text-white hover:text-red-600 dark:hover:text-red-400 shrink-0" />
                </button>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="editing-buttons"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="sm:absolute sm:left-full sm:top-1/2 sm:ml-2 flex sm:-translate-y-1/2 items-center gap-2"
          >
            <button
              onClick={onCancelEditing}
              title="Cancelar edición"
              aria-label="Cancelar edición"
              className="h-9 w-9 aspect-square flex items-center justify-center rounded-full border border-gray-200/60 dark:border-slate-600/60 bg-white/50 dark:bg-slate-800/60 shadow-[0_7px_50px_0px_rgb(0,0,0,0.1)] backdrop-blur-md text-zinc-700 dark:text-white transition-colors duration-200 hover:bg-zinc-200/80 dark:hover:bg-slate-700/80 cursor-pointer shrink-0"
            >
              <X className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
            </button>
            <button
              onClick={onConfirmEditing}
              title="Guardar zonas creadas"
              aria-label="Guardar zonas creadas"
              className="h-9 w-9 aspect-square flex items-center justify-center rounded-full border border-gray-200/60 dark:border-slate-600/60 bg-white/50 dark:bg-slate-800/60 shadow-[0_7px_50px_0px_rgb(0,0,0,0.1)] backdrop-blur-md text-zinc-700 dark:text-white transition-colors duration-200 hover:bg-zinc-200/80 dark:hover:bg-slate-700/80 cursor-pointer shrink-0"
            >
              <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
