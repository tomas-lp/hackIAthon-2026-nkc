import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import {
  processMessage,
  IMessengerAdapter,
  IncomingMessage,
} from "../_shared/state_machine.ts";
import { transcribeAudio } from "../_shared/ai.ts";

const TELEGRAM_BOT_TOKEN = Deno.env.get("BOT_TELEGRAM_TOKEN") ?? "";
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

async function sendTelegramMessage(chatId: number, text: string) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup: { remove_keyboard: true },
    }),
  });
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("Solo POST", { status: 405 });

  try {
    const body = await req.json();
    if (!body.message && !body.callback_query)
      return new Response("OK", { status: 200 });

    let msg = body.message;
    let callbackData = null;

    if (body.callback_query) {
      msg = body.callback_query.message;
      callbackData = body.callback_query.data;
      // Responder al callback para que no se quede cargando en la app
      fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: body.callback_query.id }),
      }).catch(() => {});
    }

    if (!msg) return new Response("OK", { status: 200 });

    const chatId = msg.chat.id;

    const adapter: IMessengerAdapter = {
      platform: "telegram",
      chatId,
      phoneNumber: undefined,
      sendMessage: async (text: string) => {
        await sendTelegramMessage(chatId, text);
      },
      sendMenu: async (
        text: string,
        buttons: { id: string; title: string }[]
      ) => {
        const inline_keyboard = buttons.map((b) => [
          { text: b.title, callback_data: b.id },
        ]);
        await fetch(`${TELEGRAM_API}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            reply_markup: { inline_keyboard },
          }),
        });
      },
    };

    const incoming: IncomingMessage = {
      text: callbackData || msg.text,
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
      const bytes = new Uint8Array(arrayBuffer);
      const { encode } =
        await import("https://deno.land/std@0.177.0/encoding/base64.ts");
      const base64 = encode(bytes);

      incoming.photo = {
        base64,
        mimeType: "image/jpeg",
      };
    } else if (msg.voice || msg.audio) {
      const audioObj = msg.voice || msg.audio;
      const fileId = audioObj.file_id;

      const fileRes = await fetch(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
      const fileData = await fileRes.json();
      const filePath = fileData.result.file_path;

      const audioRes = await fetch(
        `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`
      );
      const arrayBuffer = await audioRes.arrayBuffer();

      const transcripcion = await transcribeAudio(
        arrayBuffer,
        audioObj.mime_type || "audio/ogg",
        "ogg"
      );

      if (transcripcion) {
        incoming.text = transcripcion;
        incoming.esAudio = true;
      } else {
        await sendTelegramMessage(
          chatId,
          "⚠️ No pude entender el audio. Por favor, escribime tu mensaje o intentá hablar un poco más claro."
        );
        return new Response("OK", { status: 200 });
      }
    }

    await processMessage(adapter, incoming);

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Error procesando webhook de Telegram:", err);
    return new Response("Error interno", { status: 500 });
  }
});
