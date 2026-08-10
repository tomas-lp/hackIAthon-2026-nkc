"use client";

import { User, LogOut, X, Loader2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginWithCredentials } from "@/app/auth/actions";

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
  return (
    <div
      className={`absolute right-4 top-4 z-[1000] transition-all duration-300 ease-in-out ${
        isHidden
          ? "-translate-y-20 opacity-0 pointer-events-none"
          : "translate-y-0 opacity-100"
      }`}
    >
      {isAdmin ? (
        <button
          onClick={onLogoutClick}
          className="flex items-center gap-2 rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-600 shadow-sm transition-colors hover:bg-red-50"
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

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
      router.refresh();
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
