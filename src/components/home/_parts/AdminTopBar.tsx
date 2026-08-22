"use client";

import { Switch } from "@/components/ui/Switch";

interface AdminTopBarProps {
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  onAddList: () => void;
  isHidden: boolean;
}

export function AdminTopBar({
  tabs,
  activeTab,
  onTabChange,
  onAddList,
  isHidden,
}: AdminTopBarProps) {
  return (
    <div
      className={`absolute top-4 left-1/2 -translate-x-1/2 z-[500] transition-all duration-300 ease-in-out ${
        isHidden
          ? "-translate-y-20 opacity-0 pointer-events-none"
          : "translate-y-0 opacity-100"
      }`}
    >
      <Switch value={activeTab} onValueChange={onTabChange}>
        {tabs.map((tab) => (
          <Switch.Option key={tab} value={tab}>
            {tab}
          </Switch.Option>
        ))}
        <div className="h-3.5 w-px bg-zinc-400/30 mx-0.5 z-10" />
        <button
          onClick={onAddList}
          className="relative z-10 h-7 px-3.5 text-xs font-semibold text-zinc-700 hover:text-zinc-950 transition-colors duration-200 cursor-pointer whitespace-nowrap flex items-center justify-center"
        >
          Nueva +
        </button>
      </Switch>
    </div>
  );
}
