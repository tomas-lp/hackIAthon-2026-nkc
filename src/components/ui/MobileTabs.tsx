"use client";

import type { ReactNode } from "react";

export const MOBILE_TABS_HEIGHT = "76px";

export interface MobileTabItem {
  id: string;
  name: string;
  icon: ReactNode;
  disabled?: boolean;
}

interface MobileTabsProps {
  items: MobileTabItem[];
  activeId?: string;
  onChange: (id: string) => void;
  isHidden?: boolean;
}

export function MobileTabs({
  items,
  activeId,
  onChange,
  isHidden = false,
}: MobileTabsProps) {
  if (isHidden || items.length === 0) return null;

  return (
    <nav
      aria-label="Acciones rápidas"
      className="sm:hidden z-[10000] h-[76px] border-t border-gray-200/80 bg-white/90 px-4 pt-2 backdrop-blur-xl dark:border-[#2b395b] dark:bg-[#0b101d]/90"
    >
      <div className="mx-auto flex h-full max-w-md items-start justify-around gap-3">
        {items.map((item) => {
          const isActive = item.id === activeId;

          return (
            <button
              key={item.id}
              type="button"
              disabled={item.disabled}
              aria-pressed={isActive}
              onClick={() => onChange(item.id)}
              className={`flex min-w-20 flex-1 flex-col items-center gap-1 rounded-2xl px-3 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer disabled:pointer-events-none disabled:opacity-50 ${
                isActive
                  ? "bg-zinc-100 text-zinc-900 dark:bg-[#1e2a4a] dark:text-white"
                  : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 dark:text-slate-400 dark:hover:bg-[#161f36] dark:hover:text-slate-200"
              }`}
            >
              <span className="flex h-7 w-7 items-center justify-center">
                {item.icon}
              </span>
              <span className="truncate">{item.name}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
