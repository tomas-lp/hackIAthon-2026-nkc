import { ReactNode } from "react";
import { X } from "lucide-react";

interface MapDetailShellProps {
  title: string;
  isOpen: boolean;
  isClosing: boolean;
  onClose: () => void;
  headerExtra?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

export function MapDetailShell({
  title,
  isOpen,
  isClosing,
  onClose,
  headerExtra,
  children,
  footer,
}: MapDetailShellProps) {
  return (
    <aside
      aria-label={title}
      className={`absolute right-4 top-28 z-[1000] w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-gray-200 bg-white/50 p-2.5 backdrop-blur-xs dark:border-[#2b395b] dark:bg-[#0b101d]/80 transition-all duration-300 ease-in-out ${
        isClosing || !isOpen
          ? "translate-x-[120%] opacity-0 pointer-events-none"
          : "translate-x-0 opacity-100"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-3 px-1.5 pt-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold tracking-tight text-zinc-800 dark:text-white">
            {title}
          </span>
          {headerExtra}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar detalle"
          className="shrink-0 rounded-full p-1.5 text-zinc-500 transition-colors hover:bg-zinc-200/60 hover:text-zinc-800 dark:text-slate-400 dark:hover:bg-[#1e2a4a] dark:hover:text-white cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded-[14px] border border-gray-200 bg-white p-3.5 dark:border-[#2b395b] dark:bg-[#161f36]">
        {children}
        {footer && <div className="mt-2 w-full">{footer}</div>}
      </div>
    </aside>
  );
}
