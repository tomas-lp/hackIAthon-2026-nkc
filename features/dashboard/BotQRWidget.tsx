"use client";

import { useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";

type BotType = "telegram" | "whatsapp" | null;

export function BotQRWidget() {
  const [activeBot, setActiveBot] = useState<BotType>(null);

  // Temporalmente usamos el mismo QR hasta que esté listo el de WhatsApp
  const qrSrc = "/qrbot.png";

  return (
    <>
      {/* Floating Widget */}
      <div className="absolute bottom-6 right-6 z-[1000] flex flex-col items-end gap-2">
        <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-500 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-zinc-200/60">
          QR a bot
        </span>
        <div className="flex items-center gap-4 bg-white/90 backdrop-blur-xl p-3 rounded-2xl shadow-xl border border-zinc-200/80 transition-all hover:shadow-2xl hover:bg-white">
          <button
            onClick={() => setActiveBot("whatsapp")}
            className="group relative flex w-12 h-12 items-center justify-center transition-transform hover:scale-110 active:scale-95 focus:outline-none"
            aria-label="Bot de WhatsApp"
          >
            <div className="absolute inset-0 rounded-full bg-green-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <Image
              src="/whatsapp-icon.png"
              alt="WhatsApp"
              width={42}
              height={42}
              unoptimized
              className="drop-shadow-sm relative z-10 transition-transform duration-300"
            />
          </button>
          
          <div className="w-px h-8 bg-zinc-200" />
          
          <button
            onClick={() => setActiveBot("telegram")}
            className="group relative flex w-12 h-12 items-center justify-center transition-transform hover:scale-110 active:scale-95 focus:outline-none"
            aria-label="Bot de Telegram"
          >
            <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <Image
              src="/telegram-icon.png"
              alt="Telegram"
              width={42}
              height={42}
              unoptimized
              className="drop-shadow-sm relative z-10 transition-transform duration-300"
            />
          </button>
        </div>
      </div>

      {/* Modal Popup con Glassmorphism */}
      {activeBot && (
        <div 
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-zinc-900/30 backdrop-blur-sm transition-all duration-300"
          onClick={() => setActiveBot(null)}
        >
          <div 
            className="relative flex flex-col items-center bg-white/95 backdrop-blur-xl p-8 rounded-[2rem] shadow-2xl border border-white/50 animate-in fade-in zoom-in-95 duration-200 ease-out max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActiveBot(null)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 rounded-full transition-colors focus:outline-none"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="mb-6 flex items-center gap-3">
              <Image
                src={activeBot === "whatsapp" ? "/whatsapp-icon.png" : "/telegram-icon.png"}
                alt={activeBot}
                width={36}
                height={36}
              />
              <h3 className="text-xl font-bold text-zinc-800 tracking-tight">
                Bot de {activeBot === "whatsapp" ? "WhatsApp" : "Telegram"}
              </h3>
            </div>
            
            <div className="bg-white p-4 rounded-3xl border border-zinc-100 shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)] flex items-center justify-center">
              {activeBot === "whatsapp" ? (
                <div className="w-[220px] h-[220px] bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center text-center p-4 gap-2">
                  <span className="text-2xl mb-1 opacity-70">⏳</span>
                  <span className="text-sm font-bold text-zinc-600">QR no disponible</span>
                  <span className="text-xs text-zinc-400 font-medium leading-relaxed">
                    Próximamente habilitaremos<br/>el bot de WhatsApp
                  </span>
                </div>
              ) : (
                <Image
                  src={qrSrc}
                  alt={`QR Code ${activeBot}`}
                  width={220}
                  height={220}
                  className="rounded-2xl"
                />
              )}
            </div>
            
            <p className="mt-6 text-sm text-zinc-500 font-medium max-w-[260px] text-center leading-relaxed">
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
