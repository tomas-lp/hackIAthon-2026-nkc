import L from "leaflet";

export function createSafeZoneIcon(zoom: number, isDraft: boolean = false) {
  const minSize = 18;
  const maxSize = 36;
  let size = minSize + (maxSize - minSize) * ((zoom - 8) / 10);
  size = Math.max(minSize, Math.min(maxSize, size));

  const bgColor = isDraft ? "#6ee7b7" : "#10b981"; // emerald-300 vs emerald-500

  return L.divIcon({
    className: `custom-safe-zone-marker`,
    html: `
      <div class="marker-inner" style="display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); width: ${size}px; height: ${size * 1.15}px;">
        <svg width="100%" height="100%" viewBox="0 0 24 24" fill="${bgColor}" stroke="#ffffff" stroke-width="0.75">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke-linejoin="round" stroke-linecap="round"/>
          <path d="M9 12.5l2.5 2.5 4.5-5.5" fill="none" stroke="#ffffff" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    `,
    iconSize: [size, size * 1.15],
    iconAnchor: [size / 2, (size * 1.15) / 2],
    popupAnchor: [0, -(size * 1.15) / 2],
  });
}

export function createHealthCenterIcon(
  zoom: number,
  isVisible: boolean = true
) {
  const minSize = 14;
  const maxSize = 26;
  let size = minSize + (maxSize - minSize) * ((zoom - 8) / 10);
  size = Math.max(minSize, Math.min(maxSize, size));

  return L.divIcon({
    className: `custom-health-center-marker ${isVisible ? "is-visible" : "is-hidden"}`,
    html: `
      <div class="marker-inner" style="
        background-color: #ef4444;
        width: ${size}px;
        height: ${size}px;
        border-radius: 6px;
        border: 1.5px solid #ffffff;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        opacity: ${isVisible ? 1 : 0};
        pointer-events: ${isVisible ? "auto" : "none"};
      ">
        <svg width="${size * 0.65}" height="${size * 0.65}" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

export function createDraftMarkerIcon(
  zoom: number,
  category: "EVACUACION" | "SALUD" = "EVACUACION"
) {
  if (category === "SALUD") {
    const minSize = 20;
    const maxSize = 34;
    let size = minSize + (maxSize - minSize) * ((zoom - 8) / 10);
    size = Math.max(minSize, Math.min(maxSize, size));

    return L.divIcon({
      className: `custom-health-center-marker is-draft animate-pulse`,
      html: `
        <div class="marker-inner" style="
          background-color: #f87171;
          width: ${size}px;
          height: ${size}px;
          border-radius: 6px;
          border: 2px dashed #ffffff;
          box-shadow: 0 0 12px rgba(239,68,68,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
        ">
          <svg width="${size * 0.65}" height="${size * 0.65}" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2],
    });
  }

  return createSafeZoneIcon(zoom, true);
}
