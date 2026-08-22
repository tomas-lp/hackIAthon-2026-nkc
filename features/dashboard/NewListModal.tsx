"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface NewListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (listName: string) => void;
}

export function NewListModal({
  isOpen,
  onClose,
  onConfirm,
}: NewListModalProps) {
  const [listName, setListName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setListName("");
    onClose();
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = listName.trim();
    if (trimmed) {
      onConfirm(trimmed);
      setListName("");
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/25 backdrop-blur-xs transition-opacity duration-200"
      onClick={handleClose}
    >
      <div
        className="relative flex flex-col bg-white/70 backdrop-blur-md border border-gray-200 p-5 rounded-3xl shadow-xl max-w-[320px] w-full mx-4 animate-in fade-in zoom-in-95 duration-200 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-zinc-900 font-semibold text-base mb-3 text-left tracking-tight">
          Nombre de la nueva lista
        </h3>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <input
            ref={inputRef}
            type="text"
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            placeholder="Escriba el nombre de la lista"
            className="w-full rounded-xl border border-gray-300/80 bg-white/90 px-3.5 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition-all focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-400/20 mb-4"
          />

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2 rounded-full bg-[#4a4a4a] hover:bg-[#666666] text-white font-medium text-xs transition-colors duration-200 cursor-pointer active:scale-95 select-none"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!listName.trim()}
              className="px-5 py-2 rounded-full bg-[#4a4a4a] hover:bg-[#666666] text-white font-medium text-xs transition-colors duration-200 cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed select-none"
            >
              Aceptar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
