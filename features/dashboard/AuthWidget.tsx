"use client";

import { User, LogOut, X } from "lucide-react";

interface AuthWidgetProps {
  isAdmin: boolean;
  onLoginClick: () => void;
  onLogoutClick: () => void;
}

export function AuthWidget({
  isAdmin,
  onLoginClick,
  onLogoutClick,
}: AuthWidgetProps) {
  return (
    <div className="absolute right-4 top-4 z-[1000]">
      {isAdmin ? (
        <button
          onClick={onLogoutClick}
          className="flex items-center gap-2 rounded-full border border-white/40 bg-white/60 px-4 py-2 text-sm font-semibold text-red-500/90 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-md transition-colors hover:bg-zinc-100 hover:border-zinc-300"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      ) : (
        <button
          onClick={onLoginClick}
          className="flex items-center justify-center rounded-full border border-white/40 bg-white/60 p-2.5 text-zinc-700 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-md transition-colors hover:bg-zinc-100 hover:text-zinc-900"
        >
          <User className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
}

export function LoginModal({ isOpen, onClose, onLogin }: LoginModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-800"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="mb-6 text-2xl font-bold text-zinc-900">
          Iniciar Sesión
        </h2>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-700">Email</label>
            <input
              type="email"
              placeholder="admin@ejemplo.com"
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-700">
              Contraseña
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <button
            onClick={onLogin}
            className="mt-2 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 active:bg-blue-800"
          >
            Ingresar
          </button>
        </div>
      </div>
    </div>
  );
}
