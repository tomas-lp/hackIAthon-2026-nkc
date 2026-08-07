import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import {
  processMessage,
  IMessengerAdapter,
  IncomingMessage,
} from "../_shared/state_machine.ts";

const TELEGRAM_BOT_TOKEN = Deno.env.get("BOT_TELEGRAM_TOKEN") ?? "";
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

async function sendTelegramMessage(chatId: number, text: string) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("Solo POST", { status: 405 });

  try {
    const body = await req.json();
    if (!body.message) return new Response("OK", { status: 200 });

    const msg = body.message;
    const chatId = msg.chat.id;

    const adapter: IMessengerAdapter = {
      platform: "telegram",
      chatId,
      sendMessage: async (text: string) => {
        await sendTelegramMessage(chatId, text);
      },
    };

    const incoming: IncomingMessage = {
      text: msg.text,
      location: msg.location
        ? {
            latitude: msg.location.latitude,
            longitude: msg.location.longitude,
          }
        : undefined,
    };

    if (msg.photo && msg.photo.length > 0) {
      // Tomamos la foto de mayor resolución
      const photo = msg.photo[msg.photo.length - 1];
      const fileId = photo.file_id;

      const fileRes = await fetch(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
      const fileData = await fileRes.json();
      const filePath = fileData.result.file_path;

      const imgRes = await fetch(
        `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`
      );
      const arrayBuffer = await imgRes.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      incoming.photo = {
        base64,
        mimeType: "image/jpeg",
      };
    }

    await processMessage(adapter, incoming);

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Error procesando webhook de Telegram:", err);
    return new Response("Error interno", { status: 500 });
  }
});
