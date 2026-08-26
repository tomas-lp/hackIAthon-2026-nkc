"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { Sidebar } from "@/components/common/Sidebar";

export function AdminShell({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="relative min-h-screen bg-zinc-100 font-sans">
      <div
        className="fixed left-0 top-0 z-[100] h-screen transition-transform duration-300 ease-in-out"
        style={{
          transform: sidebarCollapsed ? "translateX(-110%)" : "translateX(0)",
        }}
      >
        <Sidebar
          reports={[]}
          filters={{ tipo: "TODOS" }}
          loading={false}
          error={null}
          selectedReport={null}
          onSelectReport={() => {}}
          onUpdateFilter={() => {}}
          onResetFilters={() => {}}
          isAdmin={!!user}
          fullHeight
          onCollapse={() => setSidebarCollapsed(true)}
        />
      </div>

      <button
        type="button"
        onClick={() => setSidebarCollapsed(false)}
        title="Mostrar panel"
        className="fixed left-0 top-6 z-[100] flex items-center justify-center rounded-r-xl border border-l-0 border-gray-200 bg-white px-1.5 py-3 text-gray-400 shadow-md transition-transform duration-200 hover:bg-gray-50 hover:text-gray-600"
        style={{
          transform: sidebarCollapsed ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      <main
        className={`min-h-screen transition-[padding] duration-300 ease-in-out ${
          sidebarCollapsed ? "pl-0" : "pl-[304px]"
        }`}
      >
        {children}
      </main>
    </div>
  );
}
