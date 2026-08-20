"use client";

import { useEffect, useRef, useState } from "react";

interface LiquidGlassSegmentedBarProps {
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  onAddList?: () => void;
  isHidden?: boolean;
}

export function LiquidGlassSegmentedBar({
  tabs,
  activeTab,
  onTabChange,
  onAddList,
  isHidden,
}: LiquidGlassSegmentedBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Style state for sliding liquid pill indicator
  const [indicatorStyle, setIndicatorStyle] = useState<{
    left: number;
    width: number;
    opacity: number;
  }>({ left: 0, width: 0, opacity: 0 });

  useEffect(() => {
    const currentTabEl = tabRefs.current.get(activeTab);
    if (currentTabEl) {
      setIndicatorStyle({
        left: currentTabEl.offsetLeft,
        width: currentTabEl.offsetWidth,
        opacity: 1,
      });
    }
  }, [activeTab, tabs]);

  return (
    <div
      className={`absolute top-4 left-1/2 -translate-x-1/2 z-[500] transition-all duration-300 ease-in-out ${
        isHidden
          ? "-translate-y-20 opacity-0 pointer-events-none"
          : "translate-y-0 opacity-100"
      }`}
    >
      {/* Liquid Glass Pill Outer Capsule */}
      <div
        ref={containerRef}
        className="relative flex items-center h-9 gap-1 rounded-full border border-gray-200/60 bg-white/50 p-1 shadow-[0_7px_50px_0px_rgb(0,0,0,0.1)] backdrop-blur-md"
      >
        {/* Sliding Liquid Indicator Pill with explicit left:0 for 100% pixel-perfect centering */}
        <div
          className="absolute left-0 top-1 bottom-1 rounded-full bg-white/95 shadow-sm backdrop-blur-md transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] pointer-events-none"
          style={{
            transform: `translateX(${indicatorStyle.left}px)`,
            width: `${indicatorStyle.width}px`,
            opacity: indicatorStyle.opacity,
          }}
        />

        {/* Tab Items */}
        {tabs.map((tab) => {
          const isSelected = activeTab === tab;

          return (
            <button
              key={tab}
              ref={(el) => {
                if (el) tabRefs.current.set(tab, el);
                else tabRefs.current.delete(tab);
              }}
              onClick={() => onTabChange(tab)}
              className="relative z-10 h-7 px-3.5 text-xs cursor-pointer select-none whitespace-nowrap flex items-center justify-center transition-colors duration-200"
            >
              <span
                className={`transition-colors duration-200 leading-none ${
                  isSelected
                    ? "font-bold text-zinc-950"
                    : "font-medium text-zinc-600 hover:text-zinc-900"
                }`}
              >
                {tab}
              </span>
            </button>
          );
        })}

        {/* Divider */}
        <div className="h-3.5 w-px bg-zinc-400/30 mx-0.5 z-10" />

        {/* Nueva + Button */}
        <button
          onClick={onAddList}
          className="relative z-10 h-7 px-3.5 text-xs font-semibold text-zinc-700 hover:text-zinc-950 transition-colors duration-200 cursor-pointer whitespace-nowrap flex items-center justify-center"
        >
          Nueva +
        </button>
      </div>
    </div>
  );
}
