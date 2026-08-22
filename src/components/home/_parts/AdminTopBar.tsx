"use client";

import { LiquidGlassSegmentedBar } from "@/components/ui/LiquidGlassSegmentedBar";

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
    <LiquidGlassSegmentedBar
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={onTabChange}
      onAddList={onAddList}
      isHidden={isHidden}
    />
  );
}
