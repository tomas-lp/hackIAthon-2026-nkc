"use client";

import { User, LogOut, X, Loader2, Sun, Moon } from "lucide-react";
import { useState } from "react";
import { loginWithCredentials } from "@/app/auth/actions";
import { TooltipSign } from "@/components/ui/TooltipSign";
import { useDarkMode } from "@/hooks/useDarkMode";

interface AuthWidgetProps {
  isAdmin: boolean;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  isHidden?: boolean;
}

export function AuthWidget({
  isAdmin,
  onLoginClick,
  onLogoutClick,
  isHidden,
}: AuthWidgetProps) {
  const { isDark, toggle: toggleDarkMode } = useDarkMode();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <div
      className={`absolute right-4 top-4 z-[1000] flex flex-col items-end gap-2 transition-all duration-300 ease-in-out pointer-events-none ${
        isHidden ? "-translate-y-20 opacity-0" : "translate-y-0 opacity-100"
      }`}
    >
      {isAdmin ? (
        <>
          {/* Top Row: Sliding Logout Button + User Profile Button */}
          <div className="flex items-center gap-2 relative pointer-events-auto">
            {/* Standalone Logout Pill Button */}
            <button
              onClick={() => {
                setShowUserMenu(false);
                onLogoutClick();
              }}
              title="Cerrar sesion"
              className={`flex items-center gap-2 rounded-full border border-red-200/80 bg-white/90 dark:bg-slate-900/90 dark:border-red-900/60 px-4 py-2 text-xs font-bold text-red-600 dark:text-red-400 shadow-2xs backdrop-blur-md transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)] cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/40 active:scale-95 ${
                showUserMenu
                  ? "translate-x-0 opacity-100 scale-100"
                  : "translate-x-12 opacity-0 pointer-events-none scale-90"
              }`}
            >
              <LogOut className="h-4 w-4" />
              <span>Cerrar sesion</span>
            </button>

            {/* Circular User Profile Button */}
            <TooltipSign label="Menu de usuario" position="left" delayMs={500}>
              <button
                onClick={() => setShowUserMenu((prev) => !prev)}
                className={`flex items-center justify-center rounded-full border border-white/40 dark:border-white/10 p-2.5 shadow-2xs backdrop-blur-md transition-all duration-200 cursor-pointer ${
                  showUserMenu
                    ? "bg-zinc-800 text-white border-zinc-700"
                    : "bg-white/70 dark:bg-slate-800/80 text-zinc-700 dark:text-slate-200 hover:bg-white/90 dark:hover:bg-slate-700/90"
                }`}
              >
                <User className="h-5 w-5" />
              </button>
            </TooltipSign>
          </div>

          {/* Theme Toggle Button */}
          <div className="pointer-events-auto">
            <TooltipSign
              label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              position="left"
              delayMs={500}
            >
              <button
                onClick={toggleDarkMode}
                className="flex items-center justify-center rounded-full border border-white/40 dark:border-white/10 bg-white/70 dark:bg-slate-800/80 p-2.5 text-zinc-700 dark:text-slate-200 shadow-2xs backdrop-blur-md transition-colors hover:bg-zinc-100 dark:hover:bg-slate-700 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
              >
                {isDark ? (
                  <Moon className="h-5 w-5 text-indigo-400" />
                ) : (
                  <Sun className="h-5 w-5 text-amber-500" />
                )}
              </button>
            </TooltipSign>
          </div>
        </>
      ) : (
        /* Non-admin: login + theme toggle */
        <div className="flex flex-col items-end gap-2 pointer-events-auto">
          <TooltipSign label="Menu de usuario" position="left" delayMs={500}>
            <button
              onClick={onLoginClick}
              className="flex items-center justify-center rounded-full border border-white/40 dark:border-white/10 bg-white/60 dark:bg-slate-800/80 p-2.5 text-zinc-700 dark:text-slate-200 shadow-2xs backdrop-blur-md transition-colors hover:bg-zinc-100 dark:hover:bg-slate-700 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
            >
              <User className="h-5 w-5" />
            </button>
          </TooltipSign>

          <TooltipSign
            label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            position="left"
            delayMs={500}
          >
            <button
              onClick={toggleDarkMode}
              className="flex items-center justify-center rounded-full border border-white/40 dark:border-white/10 bg-white/70 dark:bg-slate-800/80 p-2.5 text-zinc-700 dark:text-slate-200 shadow-2xs backdrop-blur-md transition-colors hover:bg-zinc-100 dark:hover:bg-slate-700 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
            >
              {isDark ? (
                <Moon className="h-5 w-5 text-indigo-400" />
              ) : (
                <Sun className="h-5 w-5 text-amber-500" />
              )}
            </button>
          </TooltipSign>
        </div>
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleLogin();
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-[#161f36] p-6 shadow-2xl border border-gray-200/80 dark:border-[#2b395b]">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-zinc-400 dark:text-slate-400 transition-colors hover:bg-zinc-100 dark:hover:bg-[#1e2a4a] hover:text-zinc-800 dark:hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-white">
          Iniciar Sesión
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="login-email"
              className="text-sm font-medium text-zinc-700 dark:text-slate-300"
            >
              Email
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@ejemplo.com"
              autoComplete="email"
              autoFocus
              className="rounded-xl border border-zinc-200 dark:border-[#2b395b] bg-zinc-50 dark:bg-[#0b101d] px-4 py-2.5 text-sm text-zinc-900 dark:text-white outline-none transition-colors focus:border-blue-500 focus:bg-white dark:focus:bg-[#0b101d] focus:ring-2 focus:ring-blue-500/20 placeholder:text-zinc-400 dark:placeholder:text-slate-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="login-password"
              className="text-sm font-medium text-zinc-700 dark:text-slate-300"
            >
              Contraseña
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="rounded-xl border border-zinc-200 dark:border-[#2b395b] bg-zinc-50 dark:bg-[#0b101d] px-4 py-2.5 text-sm text-zinc-900 dark:text-white outline-none transition-colors focus:border-blue-500 focus:bg-white dark:focus:bg-[#0b101d] focus:ring-2 focus:ring-blue-500/20 placeholder:text-zinc-400 dark:placeholder:text-slate-500"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/60"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="mt-2 w-full rounded-xl bg-white dark:bg-[#1e2a4a] border border-blue-600 dark:border-blue-500 px-4 py-3 text-sm font-bold text-blue-600 dark:text-blue-400 transition-colors hover:bg-blue-50 dark:hover:bg-[#25355d] active:bg-blue-100 disabled:opacity-50"
          >
            {loading && (
              <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
            )}
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
}
