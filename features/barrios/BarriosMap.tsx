"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const BarriosMapInternal = dynamic(
  () => import("./BarriosMapInternal").then((m) => m.BarriosMapInternal),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-50 text-zinc-400">
        <Loader2 className="w-8 h-8 animate-spin mb-2" />
        <span className="text-xs font-mono">
          Cargando barrios de Corrientes...
        </span>
      </div>
    ),
  }
);

export function BarriosMap() {
  return <BarriosMapInternal />;
}
