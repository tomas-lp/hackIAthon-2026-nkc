"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X } from "lucide-react";
import { SidebarAdmin } from "@/components/common/SidebarAdmin";

interface AdminMobileHeaderProps {
  isHidden?: boolean;
}

export function AdminMobileHeader({
  isHidden = false,
}: AdminMobileHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        headerRef.current &&
        !headerRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isHidden) return null;

  return (
    <div className="absolute left-0 right-0 top-0 z-9999 pointer-events-none sm:hidden">
      <motion.div
        ref={headerRef}
        animate={{ height: isMenuOpen ? "auto" : 52 }}
        transition={{ type: "spring", stiffness: 420, damping: 35 }}
        className="pointer-events-auto relative mx-4 mt-4 flex flex-col overflow-visible rounded-3xl border border-gray-200/80 bg-white/50 px-2 py-2 shadow-xl backdrop-blur-md dark:border-[#2b395b]/80 dark:bg-[#0b101d]/85"
      >
        <div className="flex h-9 w-full items-center justify-between gap-3">
          <Image
            src="/logo_primary.svg"
            alt="INU - Sistema de Alerta para Inundaciones"
            width={72}
            height={24}
            className="block dark:hidden"
            priority
          />
          <Image
            src="/logo_white.svg"
            alt="INU - Sistema de Alerta para Inundaciones"
            width={72}
            height={24}
            className="hidden dark:block"
            priority
          />

          <button
            type="button"
            onClick={() => setIsMenuOpen((previous) => !previous)}
            aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={isMenuOpen}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200/90 bg-white/90 text-zinc-500 shadow-xs transition-all duration-300 hover:bg-white hover:text-zinc-700 dark:border-[#2b395b] dark:bg-[#161f36]/90 dark:text-slate-400 dark:hover:bg-[#1e2a4a] dark:hover:text-slate-200"
          >
            {isMenuOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </button>
        </div>

        <AnimatePresence initial={false}>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="mt-2 border-t border-gray-200/70 pt-2 dark:border-[#2b395b]/80"
              onClick={() => setIsMenuOpen(false)}
            >
              <SidebarAdmin />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
