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

  return (
    <SwitchContext.Provider value={{ value, onValueChange, register }}>
      <div
        className={
          className ??
          "relative flex items-center h-9 gap-1 rounded-full border border-gray-200/60 bg-white/50 p-1 shadow-[0_7px_50px_0px_rgb(0,0,0,0.1)] backdrop-blur-md"
        }
      >
        <div
          className="absolute left-0 top-1 bottom-1 rounded-full bg-white/95 shadow-sm backdrop-blur-md transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] pointer-events-none"
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
}

function SwitchOption({ value, children, className }: SwitchOptionProps) {
  const ctx = useContext(SwitchContext);
  if (!ctx) throw new Error("Switch.Option must be used within Switch");

  const isSelected = ctx.value === value;

  return (
    <button
      ref={(el) => ctx.register(value, el)}
      onClick={() => ctx.onValueChange(value)}
      className={
        className ??
        "relative z-10 h-7 px-3.5 text-xs cursor-pointer select-none whitespace-nowrap flex items-center justify-center transition-colors duration-200"
      }
    >
      <span
        className={`transition-colors duration-200 leading-none ${
          isSelected
            ? "font-bold text-zinc-950"
            : "font-medium text-zinc-600 hover:text-zinc-900"
        }`}
      >
        {children}
      </span>
    </button>
  );
}

Switch.Option = SwitchOption;
