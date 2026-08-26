"use client";

import type { ComponentProps } from "react";
import { Sidebar } from "@/components/common/Sidebar";

type HomeSidebarProps = ComponentProps<typeof Sidebar> & {
  collapsed: boolean;
  hidden: boolean;
};

export function HomeSidebar({
  collapsed,
  hidden,
  ...sidebarProps
}: HomeSidebarProps) {
  return (
    <div
      className="absolute left-0 top-0 z-[100] transition-transform duration-300 ease-in-out"
      style={{
        transform: collapsed || hidden ? "translateX(-110%)" : "translateX(0)",
      }}
    >
      <Sidebar {...sidebarProps} />
    </div>
  );
}
