import { useEffect, useState } from "react";

export function useUrlSelection() {
  const [initialReportId, setInitialReportId] = useState<string | null>(null);
  const [initialSafeZoneId, setInitialSafeZoneId] = useState<string | null>(
    null
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reportId = params.get("report");
    const safeZoneId = params.get("safeZone");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (reportId) setInitialReportId(reportId);
    if (safeZoneId) setInitialSafeZoneId(safeZoneId);
  }, []);

  const syncUrl = (reportId: string | null, safeZoneId: string | null) => {
    const params = new URLSearchParams();
    if (reportId) params.set("report", reportId);
    if (safeZoneId) params.set("safeZone", safeZoneId);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : "/");
  };

  return { initialReportId, initialSafeZoneId, syncUrl };
}
