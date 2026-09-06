"use client";

import { ReactNode, useEffect, useRef, useState } from "react";

interface TooltipSignProps {
  children: ReactNode;
  label: string;
  position?: "left" | "right" | "top" | "bottom";
  delayMs?: number;
}

export function TooltipSign({
  children,
  label,
  position = "bottom",
  delayMs = 500,
}: TooltipSignProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delayMs);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsVisible(false);
  };

  const handleClick = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const positionClasses = {
    top: "bottom-full mb-2 left-1/2 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-2 duration-200 ease-out",
    bottom:
      "top-full mt-2 left-1/2 -translate-x-1/2 animate-in fade-in slide-in-from-top-2 duration-200 ease-out",
    left: "right-full mr-2 top-1/2 -translate-y-1/2 animate-in fade-in slide-in-from-right-2 duration-200 ease-out",
    right:
      "left-full ml-2 top-1/2 -translate-y-1/2 animate-in fade-in slide-in-from-left-2 duration-200 ease-out",
  };

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {children}
      {isVisible && (
        <div
          className={`absolute z-[3000] pointer-events-none rounded-lg border border-gray-200 dark:border-[#2b395b] bg-white dark:bg-[#161f36] px-2.5 py-1 text-xs font-medium text-zinc-700 dark:text-slate-200 shadow-md dark:shadow-[0_6px_20px_rgba(0,0,0,0.45)] whitespace-nowrap ${positionClasses[position]}`}
        >
          {label}
        </div>
      )}
    </div>
  );
}
