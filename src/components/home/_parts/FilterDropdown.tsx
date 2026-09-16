"use client";

import { useEffect, useRef, useState } from "react";
import { ReportFilters, ReportType } from "@/types/report";
import { TYPE_CONFIG } from "@/lib/constants";
import { ChevronDown, Check, Filter } from "lucide-react";

export function FilterDropdown({
  value,
  onChange,
}: {
  value: ReportType | "TODOS" | "";
  onChange: (val: ReportType | "TODOS") => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const options: { value: ReportType | "TODOS"; label: string }[] = [
    { value: "TODOS", label: "Todos" },
    ...(Object.keys(TYPE_CONFIG) as ReportType[]).map((type) => ({
      value: type,
      label: TYPE_CONFIG[type].label,
    })),
  ];

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center justify-center gap-1.5 rounded-full border border-gray-200 dark:border-[#2b395b] bg-white dark:bg-[#161f36] px-3 py-1.5 text-sm font-semibold text-gray-700 dark:text-slate-200 transition hover:bg-gray-50 dark:hover:bg-[#1e2a4a] cursor-pointer"
      >
        <Filter className="h-4 w-4" />
        Filtrar
        <ChevronDown
          className={`h-3 w-3 ml-1 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        className={`absolute right-0 top-full mt-2 z-50 w-48 flex flex-col rounded-xl border border-gray-200 dark:border-[#2b395b] bg-white dark:bg-[#161f36] shadow-lg dark:shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-200 ease-out origin-top ${
          isOpen
            ? "max-h-[300px] opacity-100 pointer-events-auto p-1.5"
            : "max-h-0 opacity-0 pointer-events-none !p-0 !border-transparent"
        }`}
      >
        {options.map((opt) => {
          const isSelected = opt.value === (value || "TODOS");
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm text-left transition-colors cursor-pointer ${
                isSelected
                  ? "bg-gray-100 dark:bg-[#233154] font-semibold text-zinc-900 dark:text-white"
                  : "text-zinc-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-[#1e2a4a] hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <span>{opt.label}</span>
              {isSelected && (
                <Check className="h-4 w-4 text-zinc-700 dark:text-slate-300" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Re-export the type for convenience
export type { ReportFilters };
