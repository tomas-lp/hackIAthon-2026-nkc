import { ReactNode } from "react";

interface MapDetailRowProps {
  icon: ReactNode;
  label: string;
  children: ReactNode;
  className?: string;
}

export function MapDetailRow({
  icon,
  label,
  children,
  className = "",
}: MapDetailRowProps) {
  return (
    <div className={`flex items-start gap-3 py-1.5 ${className}`}>
      <span className="mt-0.5 shrink-0 text-zinc-400 dark:text-slate-500">
        {icon}
      </span>
      <div className="min-w-0 flex-1 text-xs leading-relaxed">
        <dt className="mr-1.5 inline font-medium text-zinc-500 dark:text-slate-400">
          {label}:
        </dt>
        <dd className="inline font-medium text-zinc-700 dark:text-slate-300">
          {children}
        </dd>
      </div>
    </div>
  );
}
