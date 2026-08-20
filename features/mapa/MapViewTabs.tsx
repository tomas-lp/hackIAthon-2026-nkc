"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Todo", href: "/" },
  { label: "Barrios", href: "/barrios" },
];

export function MapViewTabs() {
  const pathname = usePathname();

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-1 rounded-full border border-zinc-200 bg-white/80 backdrop-blur-md px-1.5 py-1.5 shadow-md">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={
              "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-150 " +
              (isActive
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-600 hover:bg-zinc-100")
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
