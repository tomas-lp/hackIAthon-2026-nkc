"use client";

import { useSyncExternalStore, useCallback } from "react";

const STORAGE_KEY = "inu-theme";

// ── External store listeners ──────────────────────────────────────
function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

function getSnapshot() {
  if (typeof window === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

const getServerSnapshot = () => false;

// ── Hook ──────────────────────────────────────────────────────────
export function useDarkMode() {
  const isDark = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const toggle = useCallback(() => {
    const willBeDark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", willBeDark);
    try {
      localStorage.setItem(STORAGE_KEY, willBeDark ? "dark" : "light");
    } catch {
      // localStorage not available (e.g., private browsing with restrictions)
    }
  }, []);

  const setDark = useCallback((dark: boolean) => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem(STORAGE_KEY, dark ? "dark" : "light");
    } catch {}
  }, []);

  return { isDark, toggle, setDark };
}
