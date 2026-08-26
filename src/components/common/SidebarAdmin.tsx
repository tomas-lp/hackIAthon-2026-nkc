"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const adminMenuOptions = [
  { label: "Mapa", href: "/" },
  { label: "Marcadores", href: "/marcadores" },
  { label: "Regiones", href: "/regiones-personalizadas" },
  { label: "Panel de Administración", href: "/estadisticas" },
];

export function SidebarAdmin() {
  const pathname = usePathname();
  const pathToTab: Record<string, string> = {
    "/": "Mapa",
    "/marcadores": "Marcadores",
    "/regiones-personalizadas": "Regiones",
    "/estadisticas": "Panel de Administración",
  };
  const activeTab = pathToTab[pathname] ?? "Mapa";

  return (
    <nav className="flex flex-col gap-1.5 py-0.5">
      {adminMenuOptions.map((option) => {
        const isSelected = activeTab === option.label;
        return (
          <Link
            key={option.href}
            href={option.href}
            className={`w-full rounded-xl border px-3.5 py-2.5 text-left font-medium text-xs transition-all duration-200 cursor-pointer shadow-2xs ${
              isSelected
                ? "border-zinc-400 bg-white text-zinc-950 font-bold shadow-xs scale-[1.01]"
                : "border-gray-200/80 bg-white/90 text-zinc-700 hover:bg-gray-50 hover:border-gray-300"
            }`}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}
