"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Sheet, type SheetRef } from "react-modal-sheet";
import { Report, ReportFilters } from "@/types/report";
import { FilterDropdown } from "@/components/home/_parts/FilterDropdown";
import { ReportCard } from "@/components/home/_parts/ReportCard";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import "overlayscrollbars/overlayscrollbars.css";

export interface MobileAlertsSheetProps {
  reports: Report[];
  filters: ReportFilters;
  loading: boolean;
  error: string | null;
  selectedReport: Report | null;
  onSelectReport: (report: Report | null) => void;
  onUpdateFilter: <K extends keyof ReportFilters>(
    key: K,
    value: ReportFilters[K]
  ) => void;
  isHidden?: boolean;
}

// Snap points en react-modal-sheet son relativos al contenedor (0 = cerrado, 1 = 100% de Sheet.Container).
// La librería exige estrictamente que el primer punto sea 0 y el último sea 1.
// Para limitar la altura máxima al 90% de la pantalla, se define `maxHeight: "90dvh"` en Sheet.Container.
const SNAP_POINTS = [0, 0.22, 0.5, 1];
const INITIAL_SNAP = 1; // index → inicia en peek (SNAP_POINTS[1] = 0.2)
const MOBILE_QUERY = "(max-width: 639px)";

export function MobileAlertsSheet({
  reports,
  filters,
  loading,
  error,
  selectedReport,
  onSelectReport,
  onUpdateFilter,
  isHidden = false,
}: MobileAlertsSheetProps) {
  const [isMobile, setIsMobile] = useState(
    () =>
      typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches
  );
  const [snapIndex, setSnapIndex] = useState(INITIAL_SNAP);
  const ref = useRef<SheetRef>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_QUERY);
    const handleChange = () => setIsMobile(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const visibleReports = useMemo(() => {
    const sortedReports = [...reports].sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );

    return sortedReports.filter((report) => {
      if (
        filters.tipo &&
        filters.tipo !== "TODOS" &&
        report.tipo !== filters.tipo
      )
        return false;
      return true;
    });
  }, [filters.tipo, reports]);

  if (!isMobile || isHidden) return null;

  const isFullScreen = snapIndex === SNAP_POINTS.length - 1;

  return (
    <div className="sm:hidden">
      <Sheet
        ref={ref}
        isOpen={true}
        onClose={() => {}}
        snapPoints={SNAP_POINTS}
        initialSnap={INITIAL_SNAP}
        onSnap={(index) => setSnapIndex(index)}
        disableDrag={false}
        disableDismiss={true}
        disableScrollLocking={true}
        style={{ zIndex: 9999 }}
      >
        <Sheet.Container
          style={{
            // bottom: "var(--mobile-tabs-height, 0px)",
            borderRadius: "1.5rem",
            maxHeight: "80dvh",
            background: "transparent",
            boxShadow: "none",
          }}
          className="max-h-[80dvh]! backdrop-blur-xl"
        >
          {/* Custom drag handle + header — always visible even at peek */}
          <Sheet.Header style={{ border: "none" }}>
            <div className="flex flex-col rounded-t-3xl bg-white/50 dark:bg-[#0b101d]/80 pt-3 border border-white/70 border-b-0 dark:border-[#2b395b]/80 dark:border-b-0">
              {/* Handle knob */}
              <div className="flex justify-center pb-1">
                <div className="h-1 w-10 rounded-full bg-gray-200 dark:bg-[#2b395b]" />
              </div>

              {/* Title row + filter */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-zinc-900 dark:text-slate-100">
                    Últimas alertas
                  </span>
                </div>
                <FilterDropdown
                  value={filters.tipo || ""}
                  onChange={(val) => onUpdateFilter("tipo", val)}
                  dropUp={snapIndex <= INITIAL_SNAP}
                />
              </div>
            </div>
          </Sheet.Header>

          <Sheet.Content
            className="bg-white/50 dark:bg-[#0b101d]/80 border-x border-white/70 dark:border-[#2b395b]/80"
            disableDrag={isFullScreen}
            style={{ zIndex: -1 }}
          >
            <div className="overflow-y-auto h-full p-2 pb-[var(--mobile-tabs-height, 0px)]">
              <div className="flex flex-col h-full rounded-xl border border-gray-200/80 dark:border-[#2b395b] bg-white dark:bg-[#161f36] overflow-hidden">
                {loading && (
                  <div className="border border-dashed border-zinc-200 dark:border-[#2b395b] px-3 py-16 text-center text-xs text-zinc-400 dark:text-slate-500 font-medium">
                    Cargando alertas...
                  </div>
                )}

                {error && (
                  <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3 py-3 text-xs text-red-600 dark:text-red-400 font-medium">
                    {error}
                  </div>
                )}

                {!loading && !error && visibleReports.length === 0 && (
                  <div className="rounded-xl border border-dashed border-zinc-200 dark:border-[#2b395b] px-3 py-16 text-center text-xs text-zinc-400 dark:text-slate-500 font-medium">
                    No hay alertas de este tipo.
                  </div>
                )}

                {!loading && !error && visibleReports.length > 0 && (
                  <OverlayScrollbarsComponent
                    defer
                    className="flex flex-col h-full"
                    options={{
                      overflow: { x: "hidden", y: "scroll" },
                      scrollbars: {
                        theme: "inu-table-scrollbar",
                        autoHide: "leave",
                        visibility: "auto",
                      },
                    }}
                  >
                    <div className="flex flex-col w-full divide-y divide-gray-100 dark:divide-[#222e4d]">
                      {visibleReports.map((report) => (
                        <ReportCard
                          key={report.id}
                          report={report}
                          isSelected={selectedReport?.id === report.id}
                          onSelect={onSelectReport}
                          isAdmin={false}
                        />
                      ))}
                    </div>
                  </OverlayScrollbarsComponent>
                )}
              </div>
            </div>
          </Sheet.Content>
        </Sheet.Container>

        {/* No backdrop — map stays visible always */}
      </Sheet>
    </div>
  );
}
