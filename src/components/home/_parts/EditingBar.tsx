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
        className="flex items-center justify-center gap-2 rounded-xl border border-red-200/80 dark:border-[#f87171]/40 bg-white dark:bg-[#1e2a4a] px-6 py-2.5 text-sm font-bold text-red-600 dark:text-[#f87171] shadow-xl transition-all duration-200 hover:bg-red-50/60 dark:hover:bg-[#25355d] hover:border-red-300 dark:hover:border-[#f87171]/70 dark:hover:text-[#fca5a5] hover:scale-105 active:scale-95 cursor-pointer"
      >
        Cancelar
      </button>
      {isCreatingSafeZone && (
        <button
          onClick={onConfirm}
          disabled={!draftLocation}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#435bb5] hover:bg-[#364ba0] text-white border border-transparent dark:bg-[#435ebd] dark:hover:bg-[#4f6cd1] dark:border-[#5270d8] px-6 py-2.5 text-sm font-bold shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:active:scale-100 disabled:cursor-not-allowed cursor-pointer"
        >
          Confirmar
        </button>
      )}
    </div>
  );
}
