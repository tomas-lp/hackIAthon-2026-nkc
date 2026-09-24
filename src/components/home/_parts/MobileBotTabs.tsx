"use client";

import Image from "next/image";
import { useState } from "react";
import { Bot, X } from "lucide-react";
import { MobileTabs } from "@/components/ui/MobileTabs";
import { Switch } from "@/components/ui/Switch";

type BotType = "telegram" | "whatsapp";

export function MobileBotTabs() {
  const [activeBot, setActiveBot] = useState<BotType | null>(null);

  return (
    <>
      <MobileTabs
        activeId={activeBot ? "claim" : undefined}
        onChange={() => setActiveBot("telegram")}
        items={[
          {
            id: "claim",
            name: "Hace tu reclamo",
            icon: <Bot className="h-7 w-7" aria-hidden="true" />,
          },
        ]}
      />

      {activeBot && (
        <div
          className="fixed inset-0 z-[11000] flex items-center justify-center bg-zinc-900/30 p-2 backdrop-blur-sm dark:bg-black/50"
          onClick={() => setActiveBot(null)}
        >
          <div
            className="relative flex w-full max-w-sm flex-col items-center gap-2 rounded-3xl border border-white/50 bg-white/70 p-4 backdrop-blur-xs dark:border-[#2b395b] dark:bg-[#161f36]/90 dark:shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveBot(null)}
              aria-label="Cerrar código QR"
              className="absolute right-4 top-4 rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:text-slate-400 dark:hover:bg-[#1e2a4a] dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-6 flex items-center gap-3">
              <Bot className="h-6 w-6 text-zinc-700 dark:text-white" />
              <h2 className="text-lg font-bold tracking-tight text-zinc-800 dark:text-white">
                Hace tu reclamo
              </h2>
            </div>

            <Switch
              value={activeBot}
              onValueChange={(value) => setActiveBot(value as BotType)}
              className=""
            >
              <Switch.Option value="telegram" className="w-full text-sm">
                <div className="flex items-center justify-center gap-2 pt-1 px-4">
                  <Image
                    src="/telegram-icon.png"
                    alt=""
                    width={22}
                    height={22}
                    unoptimized
                  />
                  Telegram
                </div>
              </Switch.Option>
              <Switch.Option value="whatsapp" className="text-sm w-full">
                <div className="flex items-center justify-center gap-2 pt-1 px-4">
                  <Image
                    src="/whatsapp-icon.png"
                    alt=""
                    width={22}
                    height={22}
                    unoptimized
                  />
                  WhatsApp
                </div>
              </Switch.Option>
            </Switch>

            <div className="flex items-center justify-center rounded-3xl border border-zinc-100 bg-white p-4 dark:border-[#2b395b]">
              {activeBot === "whatsapp" ? (
                <div className="flex h-[220px] w-[220px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 p-4 text-center">
                  <span className="mb-1 text-2xl opacity-70">⏳</span>
                  <span className="text-sm font-bold text-zinc-600">
                    QR no disponible
                  </span>
                  <span className="text-xs font-medium leading-relaxed text-zinc-400">
                    Próximamente habilitaremos
                    <br />
                    el bot de WhatsApp
                  </span>
                </div>
              ) : (
                <Image
                  src="/qrbot.png"
                  alt="Código QR de Telegram"
                  width={220}
                  height={220}
                  className="rounded-2xl"
                />
              )}
            </div>

            <p className="mt-6 max-w-[260px] text-center text-sm font-medium leading-relaxed text-zinc-500 dark:text-slate-400">
              {activeBot === "whatsapp"
                ? "Estamos trabajando en la integración oficial con WhatsApp. ¡Estará disponible pronto!"
                : "Escanea este código QR para empezar a reportar incidentes directamente desde Telegram."}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
