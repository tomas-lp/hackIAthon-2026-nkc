"use client";

import { useState } from "react";
import Image from "next/image";
import { Bot, X } from "lucide-react";
import { Switch } from "@/components/ui/Switch";
import { TooltipSign } from "@/components/ui/TooltipSign";

type BotType = "telegram" | "whatsapp" | null;

export function BotQRWidget({ isHidden }: { isHidden?: boolean }) {
  const [activeBot, setActiveBot] = useState<BotType>(null);

  return (
    <>
      <div
        className={`absolute left-4 top-20 z-50 flex flex-col items-start gap-2 transition-all duration-300 ease-in-out sm:top-auto sm:left-auto sm:right-8 sm:bottom-8 ${
          isHidden
            ? "-translate-y-20 opacity-0 pointer-events-none"
            : "translate-y-0 opacity-100"
        }`}
      >
        <TooltipSign label="Hace tu reclamo" position="right" delayMs={500}>
          <button
            type="button"
            onClick={() => setActiveBot("telegram")}
            className="flex items-center gap-2 justify-center rounded-3xl border border-white/70 bg-white/50 p-2.5 text-zinc-700 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-xl transition-all hover:bg-white/70 dark:border-[#2b395b]/80 dark:bg-[#0b101d]/80 dark:text-slate-200 dark:hover:bg-[#161f36]"
            aria-label="Hace tu reclamo"
          >
            {/* <Bot className="h-5 w-5" /> */}
            <span className="hidden sm:block text-sm text-zinc-800 dark:text-white">
              Hacé tu reclamo
            </span>
            <Image src="/whatsapp-icon.png" alt="" width={24} height={24} />
            {/* <Image src="/telegram-icon.png" alt="" width={22} height={22} /> */}
          </button>
        </TooltipSign>
      </div>

      {activeBot && (
        <div
          className="fixed inset-0 z-[11000] flex items-center justify-center bg-zinc-900/30 dark:bg-black/50 backdrop-blur-sm transition-all duration-300"
          onClick={() => setActiveBot(null)}
        >
          <div
            className="relative flex flex-col items-center bg-white/70 backdrop-blur-xs p-4 gap-2 rounded-3xl border border-white/50 dark:bg-[#161f36]/90 dark:border-[#2b395b] dark:shadow-[0_12px_40px_rgba(0,0,0,0.45)] animate-in fade-in zoom-in-95 duration-200 ease-out max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveBot(null)}
              className="absolute top-3.5 right-3.5 p-2 text-zinc-400 dark:text-slate-400 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-[#1e2a4a] rounded-full transition-colors focus:outline-none"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-2 flex items-center gap-3">
              <Bot className="h-6 w-6 text-zinc-700 dark:text-white" />
              <h3 className="text-lg font-bold tracking-tight text-zinc-800 dark:text-white">
                Hacé tu reclamo
              </h3>
            </div>

            <Switch
              value={activeBot}
              onValueChange={(value) =>
                setActiveBot(value as Exclude<BotType, null>)
              }
            >
              <Switch.Option value="whatsapp" className="w-full text-sm">
                <div className="flex items-center justify-center gap-2 px-4 pt-1">
                  <Image
                    src="/whatsapp-icon.png"
                    alt=""
                    width={22}
                    height={22}
                  />
                  WhatsApp
                </div>
              </Switch.Option>
              <Switch.Option value="telegram" className="w-full text-sm">
                <div className="flex items-center justify-center gap-2 px-4 pt-1">
                  <Image
                    src="/telegram-icon.png"
                    alt=""
                    width={22}
                    height={22}
                  />
                  Telegram
                </div>
              </Switch.Option>
            </Switch>

            <div className="bg-white p-4 rounded-3xl border border-zinc-100 dark:border-[#2b395b] flex items-center justify-center">
              {activeBot === "whatsapp" ? (
                <div className="w-60 h-60 bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center text-center p-4 gap-2">
                  <span className="text-2xl mb-1 opacity-70">⏳</span>
                  <span className="text-sm font-bold text-zinc-600">
                    QR no disponible
                  </span>
                  <span className="text-xs text-zinc-400 font-medium leading-relaxed">
                    Próximamente habilitaremos
                    <br />
                    el bot de WhatsApp
                  </span>
                </div>
              ) : (
                <Image
                  src="/qrbot.png"
                  alt={`QR Code ${activeBot}`}
                  width={240}
                  height={240}
                  className="rounded-2xl"
                />
              )}
            </div>

            <p className="mt-6 text-sm text-zinc-500 dark:text-slate-400 font-medium max-w-[260px] text-center leading-relaxed">
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
