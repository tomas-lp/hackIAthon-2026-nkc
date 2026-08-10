"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { Crosshair } from "lucide-react";

/**
 * LocateButton — A map-overlay button that asks the browser for GPS permission,
 * drops a pulsing blue dot on the user's real-world location, and pans the
 * camera to center on it.
 *
 * Must be rendered as a **child** of <MapContainer> because it calls
 * `useMap()` to interact with the Leaflet map instance.
 *
 * Visual states:
 *   - idle   (gray/white)  → ready to be pressed
 *   - active (blue)        → location visible on the map
 *   - error  (red, 2 sec)  → permission denied or GPS failed
 */

import { RouteResult } from "@/lib/routing";

type LocateState = "idle" | "loading" | "active" | "error";

interface LocateButtonProps {
  activeRoute?: RouteResult | null;
}

export function LocateButton({ activeRoute }: LocateButtonProps) {
  const map = useMap();
  const [state, setState] = useState<LocateState>("idle");

  // We keep a ref to the Leaflet marker so we can move it or remove it later
  // without triggering React re-renders.
  const markerRef = useRef<L.Marker | null>(null);

  // Track the user's last known position so re-clicking re-centers the map.
  const positionRef = useRef<[number, number] | null>(null);

  // Clean up the marker when the component is removed from the page.
  useEffect(() => {
    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
      }
    };
  }, []);

  // ── Build the pulsing blue-dot icon ──────────────────────────────────
  const createUserIcon = useCallback(() => {
    return L.divIcon({
      className: "user-location-marker",
      html: `
        <div style="position:relative; width:20px; height:20px;">
          <!-- Pulsing ring -->
          <div style="
            position:absolute; inset:-6px;
            border-radius:50%;
            background:rgba(59,130,246,0.25);
            animation: locate-pulse 2s ease-out infinite;
          "></div>
          <!-- Solid dot -->
          <div style="
            position:absolute; inset:0;
            border-radius:50%;
            background:#3b82f6;
            border:2.5px solid #ffffff;
            box-shadow:0 2px 6px rgba(0,0,0,0.3);
          "></div>
        </div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
  }, []);

  // ── Auto-activate location when route mode is active ────────────────
  useEffect(() => {
    if (!activeRoute) return;

    if (!navigator.geolocation) {
      queueMicrotask(() => {
        setState("error");
      });
      return;
    }

    queueMicrotask(() => {
      setState("loading");
    });

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latlng: [number, number] = [
          pos.coords.latitude,
          pos.coords.longitude,
        ];
        positionRef.current = latlng;

        if (markerRef.current) {
          markerRef.current.setLatLng(latlng);
        } else {
          markerRef.current = L.marker(latlng, {
            icon: createUserIcon(),
            zIndexOffset: 2000,
          }).addTo(map);

          markerRef.current.bindTooltip("Tu ubicación", {
            direction: "top",
            offset: [0, -14],
            className: "user-location-tooltip",
          });
        }
        setState("active");
      },
      () => {
        if (activeRoute.polyline && activeRoute.polyline.length > 0) {
          const origin = activeRoute.polyline[0];
          positionRef.current = origin;
          if (markerRef.current) {
            markerRef.current.setLatLng(origin);
          } else {
            markerRef.current = L.marker(origin, {
              icon: createUserIcon(),
              zIndexOffset: 2000,
            }).addTo(map);

            markerRef.current.bindTooltip("Tu ubicación", {
              direction: "top",
              offset: [0, -14],
              className: "user-location-tooltip",
            });
          }
          setState("active");
        } else {
          setState("error");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [activeRoute, map, createUserIcon]);

  // ── Main click handler ───────────────────────────────────────────────
  const handleClick = useCallback(() => {
    // If we already have a position, just re-center the map on it.
    if (state === "active" && positionRef.current) {
      const bounds = L.latLngBounds(
        [positionRef.current[0] - 0.005, positionRef.current[1] - 0.005],
        [positionRef.current[0] + 0.005, positionRef.current[1] + 0.005]
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, duration: 0.6 });
      return;
    }

    // Check that the browser supports geolocation.
    if (!navigator.geolocation) {
      setState("error");
      setTimeout(() => setState("idle"), 2000);
      return;
    }

    setState("loading");

    navigator.geolocation.getCurrentPosition(
      // ✅ SUCCESS — we got the user's coordinates
      (pos) => {
        const latlng: [number, number] = [
          pos.coords.latitude,
          pos.coords.longitude,
        ];
        positionRef.current = latlng;

        // Create the marker if it doesn't exist, or move it if it does.
        if (markerRef.current) {
          markerRef.current.setLatLng(latlng);
        } else {
          markerRef.current = L.marker(latlng, {
            icon: createUserIcon(),
            zIndexOffset: 2000, // Always on top of other markers
          }).addTo(map);

          markerRef.current.bindTooltip("Tu ubicación", {
            direction: "top",
            offset: [0, -14],
            className: "user-location-tooltip",
          });
        }

        // Pan the map to center on the user's location.
        const bounds = L.latLngBounds(
          [latlng[0] - 0.005, latlng[1] - 0.005],
          [latlng[0] + 0.005, latlng[1] + 0.005]
        );
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 16,
          duration: 0.6,
        });

        setState("active");
      },

      // ❌ ERROR — permission denied or GPS unavailable
      () => {
        setState("error");
        setTimeout(() => setState("idle"), 2000);
      },

      // ⚙️ Options
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [map, state, createUserIcon]);

  // ── Button colors based on state ─────────────────────────────────────
  const colors: Record<
    LocateState,
    { bg: string; text: string; border: string }
  > = {
    idle: {
      bg: "bg-white/60",
      text: "text-zinc-700",
      border: "border-white/40",
    },
    loading: {
      bg: "bg-white/60",
      text: "text-zinc-700",
      border: "border-white/40",
    },
    active: {
      bg: "bg-blue-500/90",
      text: "text-white",
      border: "border-blue-400",
    },
    error: {
      bg: "bg-red-500/90",
      text: "text-white",
      border: "border-red-400",
    },
  };

  const c = colors[state];

  return (
    <button
      id="locate-me-button"
      onClick={handleClick}
      title="Mostrar mi ubicación"
      className={`
        absolute top-16 right-4 z-[1000]
        rounded-full border ${c.border} ${c.bg} p-2.5 ${c.text}
        shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-md
        cursor-pointer
        transition-colors duration-200
        hover:bg-zinc-100 hover:text-zinc-900
        active:scale-95
      `}
    >
      {state === "loading" ? (
        /* Simple spinning animation while waiting for GPS */
        <Crosshair className="w-5 h-5 animate-spin" />
      ) : (
        <Crosshair className="w-5 h-5" />
      )}
    </button>
  );
}
