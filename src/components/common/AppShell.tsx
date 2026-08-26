"use client";

import { createContext, useContext, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Sidebar } from "@/components/common/Sidebar";
import { useAuth } from "@/hooks/home/useAuth";

interface AdminSidebarContextValue {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  hidden: boolean;
  setHidden: (hidden: boolean) => void;
}

const AdminSidebarContext = createContext<AdminSidebarContextValue | null>(
  null
);

export function useAdminSidebar() {
  const context = useContext(AdminSidebarContext);
  if (!context) {
    throw new Error("useAdminSidebar debe usarse dentro de AppShell");
  }
  return context;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { currentUser } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [hidden, setHidden] = useState(false);
  const isAdmin = !!currentUser;
  const isHome = pathname === "/";
  const showAdminSidebar = isAdmin && !hidden;

  return (
    <AdminSidebarContext.Provider
      value={{ collapsed, setCollapsed, hidden, setHidden }}
    >
      {showAdminSidebar && (
        <div
          className="fixed left-0 top-0 z-[100] transition-transform duration-300 ease-in-out"
          style={{
            transform: collapsed ? "translateX(-110%)" : "translateX(0)",
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
            isAdmin
            fullHeight={!isHome}
            onCollapse={() => setCollapsed(true)}
          />
        </div>
      )}

      {isAdmin && (
        <button
          type="button"
          onClick={() => {
            setHidden(false);
            setCollapsed(false);
          }}
          title="Mostrar panel"
          className="fixed left-0 top-6 z-[100] flex items-center justify-center rounded-r-xl border border-l-0 border-gray-200 bg-white px-1.5 py-3 text-gray-400 shadow-md transition-all duration-300 ease-in-out hover:bg-gray-50 hover:text-gray-600 cursor-pointer"
          style={{
            transform:
              collapsed || !showAdminSidebar
                ? "translateX(0)"
                : "translateX(-100%)",
            pointerEvents: collapsed || !showAdminSidebar ? "auto" : "none",
            transitionDelay: collapsed || !showAdminSidebar ? "300ms" : "0ms",
          }}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      <div
        className={`min-h-screen transition-[padding] duration-300 ease-in-out ${
          isAdmin && !isHome && !collapsed ? "pl-[304px]" : "pl-0"
        }`}
      >
        {children}
      </div>
    </AdminSidebarContext.Provider>
  );
}
