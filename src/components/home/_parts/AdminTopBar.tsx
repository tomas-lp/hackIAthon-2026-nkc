"use client";

import { useEffect, useRef, useState } from "react";
import { Switch } from "@/components/ui/Switch";
import { Pencil, X, Check, Trash2, ChevronDown } from "lucide-react";

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
    : customTabs[0] ?? "";

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
    <div
      className={`absolute top-4 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-2 transition-all duration-300 ease-in-out ${
        isHidden
          ? "-translate-y-20 opacity-0 pointer-events-none"
          : "translate-y-0 opacity-100"
      }`}
    >
      <div ref={containerRef} className="relative">
        <Switch value={activeTab} onValueChange={onTabChange}>
          {fixedTabs
            .filter((t) => tabs.includes(t))
            .map((tab) => (
              <Switch.Option key={tab} value={tab}>
                {tab}
              </Switch.Option>
            ))}

          {/* Si hay listas personalizadas creadas, mostrar la pestaña de lista personalizada */}
          {customTabs.length > 0 && (
            <Switch.Option
              value={activeCustomTab}
              onClick={handleCustomTabClick}
            >
              <span className="flex items-center gap-1">
                <span>{activeCustomTab}</span>
                {hasDropdown && (
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-300 ${
                      isDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                )}
              </span>
            </Switch.Option>
          )}

          <div className="h-3.5 w-px bg-zinc-400/30 mx-0.5 z-10" />
          <button
            onClick={onAddList}
            className="relative z-10 h-7 px-3.5 text-xs font-semibold text-zinc-700 hover:text-zinc-950 transition-colors duration-200 cursor-pointer whitespace-nowrap flex items-center justify-center"
          >
            Nueva +
          </button>
        </Switch>

        {/* Menú desplegable flotante (SOLO cuando hay 2 o más listas y se presiona por 2da vez) */}
        {hasDropdown && isDropdownOpen && (
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 flex flex-col rounded-2xl border border-gray-200/60 bg-white/90 backdrop-blur-md shadow-[0_7px_50px_0px_rgb(0,0,0,0.1)] min-w-[170px] overflow-hidden transition-all duration-200 ease-out p-1.5">
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
                      ? "bg-white font-bold text-zinc-950 shadow-xs"
                      : "text-zinc-700 hover:bg-white/60 hover:text-zinc-950 font-medium"
                  }`}
                >
                  <span>{tab}</span>
                  {isSelected && (
                    <Check className="h-3.5 w-3.5 text-zinc-900 ml-2" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Botones de acción normal (Editar y Eliminar) con animación sliding + bounce (800ms) */}
      <div
        className={`flex items-center gap-2 transition-all duration-800 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-left ${
          showEditButton && !isEditingRegions
            ? "translate-x-0 opacity-100 scale-100 pointer-events-auto"
            : "translate-x-6 opacity-0 scale-90 pointer-events-none w-0 overflow-hidden"
        }`}
      >
        <button
          onClick={onStartEditing}
          title="Editar zonas"
          aria-label="Editar zonas"
          className="h-9 w-9 aspect-square min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full border border-gray-200/60 bg-white/50 shadow-[0_7px_50px_0px_rgb(0,0,0,0.1)] backdrop-blur-md text-zinc-700 transition-colors duration-200 hover:bg-zinc-200/80 active:scale-95 cursor-pointer shrink-0"
        >
          <Pencil className="h-4 w-4 text-zinc-700 shrink-0" />
        </button>

        <button
          onClick={onDeleteList}
          title="Eliminar lista personalizada"
          aria-label="Eliminar lista personalizada"
          className="h-9 w-9 aspect-square min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full border border-gray-200/60 bg-white/50 shadow-[0_7px_50px_0px_rgb(0,0,0,0.1)] backdrop-blur-md text-zinc-700 transition-colors duration-200 hover:bg-zinc-200/80 active:scale-95 cursor-pointer shrink-0"
        >
          <Trash2 className="h-4 w-4 text-zinc-700 hover:text-red-600 shrink-0" />
        </button>
      </div>

      {/* Botones de confirmación/cancelación durante el modo edición con animación sliding + bounce (800ms) */}
      <div
        className={`flex items-center gap-2 transition-all duration-800 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-left ${
          isEditingRegions
            ? "translate-x-0 opacity-100 scale-100 pointer-events-auto"
            : "-translate-x-4 opacity-0 scale-90 pointer-events-none w-0 overflow-hidden"
        }`}
      >
        <button
          onClick={onCancelEditing}
          title="Cancelar edición"
          aria-label="Cancelar edición"
          className="h-9 w-9 aspect-square min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full border border-gray-200/60 bg-white/50 shadow-[0_7px_50px_0px_rgb(0,0,0,0.1)] backdrop-blur-md text-zinc-700 transition-colors duration-200 hover:bg-zinc-200/80 active:scale-95 cursor-pointer shrink-0"
        >
          <X className="h-4 w-4 text-red-600 shrink-0" />
        </button>
        <button
          onClick={onConfirmEditing}
          title="Guardar zonas creadas"
          aria-label="Guardar zonas creadas"
          className="h-9 w-9 aspect-square min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full border border-gray-200/60 bg-white/50 shadow-[0_7px_50px_0px_rgb(0,0,0,0.1)] backdrop-blur-md text-zinc-700 transition-colors duration-200 hover:bg-zinc-200/80 active:scale-95 cursor-pointer shrink-0"
        >
          <Check className="h-4 w-4 text-emerald-600 shrink-0" />
        </button>
      </div>
    </div>
  );
}
