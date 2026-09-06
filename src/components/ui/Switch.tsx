"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

interface SwitchContextValue {
  value: string;
  onValueChange: (value: string) => void;
  register: (value: string, el: HTMLElement | null) => void;
}

const SwitchContext = createContext<SwitchContextValue | null>(null);

interface SwitchProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Switch({
  value,
  onValueChange,
  children,
  className,
}: SwitchProps) {
  const optionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [indicatorStyle, setIndicatorStyle] = useState<{
    left: number;
    width: number;
    opacity: number;
  }>({ left: 0, width: 0, opacity: 0 });
  const [squish, setSquish] = useState(false);
  const prevValueRef = useRef<string | null>(null);

  const register = (optionValue: string, el: HTMLElement | null) => {
    if (el) optionRefs.current.set(optionValue, el);
    else optionRefs.current.delete(optionValue);
  };

  useEffect(() => {
    const el = optionRefs.current.get(value);
    if (el) {
      setIndicatorStyle({
        left: el.offsetLeft,
        width: el.offsetWidth,
        opacity: 1,
      });
    } else {
      setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
    }
  }, [value, children]);

  // Re-trigger the liquid squish on every value change (skipped on mount)
  useEffect(() => {
    if (prevValueRef.current === null) {
      prevValueRef.current = value;
      return;
    }
    if (prevValueRef.current === value) return;
    prevValueRef.current = value;
    setSquish(false);
    const raf = requestAnimationFrame(() => setSquish(true));
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <SwitchContext.Provider value={{ value, onValueChange, register }}>
      <div
        className={
          className ??
          "relative flex items-center h-9 gap-1 rounded-full border border-gray-200/60 dark:border-slate-600/60 bg-white/50 dark:bg-slate-800/60 p-1 shadow-[0_7px_50px_0px_rgb(0,0,0,0.1)] backdrop-blur-md"
        }
      >
        <div
          className={`absolute left-0 top-1 bottom-1 rounded-full bg-white/95 dark:bg-slate-700 shadow-sm backdrop-blur-md transition-all duration-400 ease-[cubic-bezier(0.34,1.22,0.64,1)] pointer-events-none ${
            squish ? "animate-pill-liquid" : ""
          }`}
          onAnimationEnd={() => setSquish(false)}
          style={{
            transform: `translateX(${indicatorStyle.left}px)`,
            width: `${indicatorStyle.width}px`,
            opacity: indicatorStyle.opacity,
          }}
        />
        {children}
      </div>
    </SwitchContext.Provider>
  );
}

interface SwitchOptionProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

function SwitchOption({
  value,
  children,
  className,
  onClick,
}: SwitchOptionProps) {
  const ctx = useContext(SwitchContext);
  if (!ctx) throw new Error("Switch.Option must be used within Switch");

  const isSelected = ctx.value === value;

  return (
    <button
      ref={(el) => ctx.register(value, el)}
      onClick={() => {
        ctx.onValueChange(value);
        if (onClick) onClick();
      }}
      className={
        className ??
        "relative z-10 h-7 px-3.5 text-xs cursor-pointer select-none whitespace-nowrap flex items-center justify-center transition-colors duration-200"
      }
    >
      <span className="relative inline-flex items-center justify-center leading-none">
        {/* Ghost bold copy reserves max width so the font-weight swap
            never resizes the option (avoids switch jitter on change) */}
        <span className="invisible font-bold leading-none" aria-hidden>
          {children}
        </span>
        <span
          className={`absolute inset-0 flex items-center justify-center leading-none transition-colors duration-200 ${
            isSelected
              ? "font-bold text-zinc-950 dark:text-white"
              : "font-medium text-zinc-600 dark:text-slate-400 hover:text-zinc-900 dark:hover:text-slate-200"
          }`}
        >
          {children}
        </span>
      </span>
    </button>
  );
}

Switch.Option = SwitchOption;
