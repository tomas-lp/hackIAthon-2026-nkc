"use client";

interface EditingBarProps {
  isCreatingSafeZone: boolean;
  draftLocation: { lat: number; lng: number } | null;
  showSafeZoneModal: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  hideMainUI: boolean;
}

export function EditingBar({
  isCreatingSafeZone,
  draftLocation,
  showSafeZoneModal,
  onCancel,
  onConfirm,
  hideMainUI,
}: EditingBarProps) {
  if (!hideMainUI || showSafeZoneModal) return null;

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] flex gap-3">
      <button
        onClick={onCancel}
        className="flex items-center justify-center gap-2 rounded-full border border-red-200 bg-white px-6 py-3 text-sm font-bold text-red-600 shadow-xl transition-all duration-200 hover:bg-red-50 hover:scale-105 active:scale-95 cursor-pointer"
      >
        Cancelar
      </button>
      {isCreatingSafeZone && (
        <button
          onClick={onConfirm}
          disabled={!draftLocation}
          className="flex items-center justify-center gap-2 rounded-full border border-blue-200 bg-white px-6 py-3 text-sm font-bold text-blue-700 shadow-xl transition-all duration-200 hover:bg-blue-50 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:active:scale-100 disabled:cursor-not-allowed cursor-pointer"
        >
          Confirmar
        </button>
      )}
    </div>
  );
}
