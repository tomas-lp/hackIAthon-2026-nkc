"use client";

import { User, LogOut, X, Loader2, Sun, Moon } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { loginWithCredentials } from "@/app/auth/actions";

interface AuthWidgetProps {
  isAdmin: boolean;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  isHidden?: boolean;
}

const subscribeDarkMode = (callback: () => void) => {
  if (typeof window === "undefined") return () => {};
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
};

const getDarkModeSnapshot = () => {
  if (typeof window === "undefined") return false;
  return document.documentElement.classList.contains("dark");
};

const getDarkModeServerSnapshot = () => false;

export function AuthWidget({
  isAdmin,
  onLoginClick,
  onLogoutClick,
  isHidden,
}: AuthWidgetProps) {
  const isDarkMode = useSyncExternalStore(
    subscribeDarkMode,
    getDarkModeSnapshot,
    getDarkModeServerSnapshot
  );
  const [showUserMenu, setShowUserMenu] = useState(false);

  const toggleDarkMode = () => {
    document.documentElement.classList.toggle("dark");
  };

  return (
    <div
      className={`absolute right-4 top-4 z-[1000] flex flex-col items-end gap-2 transition-all duration-300 ease-in-out ${
        isHidden
          ? "-translate-y-20 opacity-0 pointer-events-none"
          : "translate-y-0 opacity-100"
      }`}
    >
      {isAdmin ? (
        <>
          {/* Top Row: Sliding Logout Button + User Profile Button */}
          <div className="flex items-center gap-2 relative">
            {/* Standalone Logout Pill Button - slides out to the LEFT with spring bounce */}
            <button
              onClick={() => {
                setShowUserMenu(false);
                onLogoutClick();
              }}
              title="Cerrar sesión"
              className={`flex items-center gap-2 rounded-full border border-red-200/80 bg-white/90 px-4 py-2 text-xs font-bold text-red-600 shadow-md backdrop-blur-md transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)] cursor-pointer hover:bg-red-50 active:scale-95 ${
                showUserMenu
                  ? "translate-x-0 opacity-100 scale-100"
                  : "translate-x-12 opacity-0 pointer-events-none scale-90"
              }`}
            >
              <LogOut className="h-4 w-4" />
              <span>Cerrar sesión</span>
            </button>

            {/* Circular User Profile Button */}
            <button
              onClick={() => setShowUserMenu((prev) => !prev)}
              title="Menú de usuario"
              className={`flex items-center justify-center rounded-full border border-white/40 p-2.5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-md transition-all duration-200 cursor-pointer ${
                showUserMenu
                  ? "bg-zinc-800 text-white border-zinc-700"
                  : "bg-white/70 text-zinc-700 hover:bg-white/90"
              }`}
            >
              <User className="h-5 w-5" />
            </button>
          </div>

          {/* Theme Toggle Button (Moon / Sun) */}
          <button
            onClick={toggleDarkMode}
            title={
              isDarkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"
            }
            className="flex items-center justify-center rounded-full border border-white/40 bg-white/70 p-2.5 text-zinc-700 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-md transition-colors hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer"
          >
            {isDarkMode ? (
              <Sun className="h-5 w-5 text-amber-500" />
            ) : (
              <Moon className="h-5 w-5 text-indigo-600" />
            )}
          </button>
        </>
      ) : (
        <button
          onClick={onLoginClick}
          className="flex items-center justify-center rounded-full border border-white/40 bg-white/60 p-2.5 text-zinc-700 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-md transition-colors hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer"
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    const result = await loginWithCredentials(email, password);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      onLogin();
      window.location.reload();
    }
  };

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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100">
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading || !email || !password}
            className="mt-2 w-full rounded-xl bg-white border border-blue-600 px-4 py-3 text-sm font-bold text-blue-600 transition-colors hover:bg-blue-50 active:bg-blue-100 disabled:opacity-50"
          >
            {loading && (
              <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
            )}
            Ingresar
          </button>
        </div>
      </div>
    </div>
  );
}
