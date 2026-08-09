import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import {
  processMessage,
  IMessengerAdapter,
  IncomingMessage,
} from "../_shared/state_machine.ts";
import { transcribeAudio } from "../_shared/ai.ts";

const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_TOKEN") ?? "";
const WHATSAPP_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_ID") ?? "";
const WHATSAPP_VERIFY_TOKEN =
  Deno.env.get("WHATSAPP_VERIFY_TOKEN") ?? "mi_super_secreto_whatsapp";

// Normaliza números argentinos: 549XXXXXXXXX → 54XXXXXXXXX
function normalizePhoneNumber(phone: string): string {
  const p = phone.toString().replace(/\D/g, "");
  if (p.startsWith("549") && p.length >= 12) {
    return "54" + p.slice(3);
  }
  return p;
}

async function sendWhatsAppMessage(to: string, text: string) {
  const normalizedTo = normalizePhoneNumber(to);
  await fetch(
    `https://graph.facebook.com/v25.0/${WHATSAPP_PHONE_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normalizedTo,
        type: "text",
        text: { body: text },
      }),
    }
  );
}

serve(async (req) => {
  // Manejo del Webhook Verify Token de Meta
  if (req.method === "GET") {
    const url = new URL(req.url);
    if (
      url.searchParams.get("hub.mode") === "subscribe" &&
      url.searchParams.get("hub.verify_token") === WHATSAPP_VERIFY_TOKEN
    ) {
      return new Response(url.searchParams.get("hub.challenge"), {
        status: 200,
      });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method !== "POST") return new Response("Solo POST", { status: 405 });

  try {
    const body = await req.json();

    if (!body.entry?.[0]?.changes?.[0]?.value?.messages) {
      return new Response("OK", { status: 200 });
    }

    const msg = body.entry[0].changes[0].value.messages[0];
    const sender = msg.from; // Número de teléfono
    // Para la BD usamos un hash numérico del teléfono como chat_id
    const chatId = parseInt(sender.replace(/\D/g, "").slice(-10));

    const adapter: IMessengerAdapter = {
      platform: "whatsapp",
      chatId,
      phoneNumber: sender,
      sendMessage: async (text: string) => {
        await sendWhatsAppMessage(sender, text);
      },
      sendMenu: async (
        text: string,
        buttons: { id: string; title: string }[]
      ) => {
        const normalizedTo = normalizePhoneNumber(sender);
        await fetch(
          `https://graph.facebook.com/v25.0/${WHATSAPP_PHONE_ID}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${WHATSAPP_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: normalizedTo,
              type: "interactive",
              interactive: {
                type: "button",
                body: { text },
                action: {
                  buttons: buttons.map((b) => ({
                    type: "reply",
                    reply: { id: b.id, title: b.title.substring(0, 20) },
                  })),
                },
              },
            }),
          }
        );
      },
    };

    const incoming: IncomingMessage = {};

    if (msg.type === "text") {
      incoming.text = msg.text.body;
    } else if (msg.type === "interactive") {
      incoming.text =
        msg.interactive?.button_reply?.id || msg.interactive?.list_reply?.id;
    } else if (msg.type === "location") {
      incoming.location = {
        latitude: msg.location.latitude,
        longitude: msg.location.longitude,
      };
    } else if (msg.type === "image") {
      const mediaId = msg.image.id;

      // Obtener URL del archivo
      const resUrl = await fetch(
        `https://graph.facebook.com/v25.0/${mediaId}`,
        {
          headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
        }
      );
      const dataUrl = await resUrl.json();

      // Descargar archivo
      const resMedia = await fetch(dataUrl.url, {
        headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
      });
      const arrayBuffer = await resMedia.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const { encode } =
        await import("https://deno.land/std@0.177.0/encoding/base64.ts");
      const base64 = encode(bytes);

      incoming.photo = {
        base64,
        mimeType: msg.image.mime_type,
      };

      if (msg.image.caption) {
        incoming.text = msg.image.caption;
      }
    } else if (msg.type === "audio" || msg.type === "voice") {
      const audioObj = msg.audio || msg.voice;
      const mediaId = audioObj.id;

      // Obtener URL del archivo
      const resUrl = await fetch(
        `https://graph.facebook.com/v25.0/${mediaId}`,
        {
          headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
        }
      );
      const dataUrl = await resUrl.json();

      // Descargar archivo
      const resMedia = await fetch(dataUrl.url, {
        headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
      });
      const arrayBuffer = await resMedia.arrayBuffer();

      const transcripcion = await transcribeAudio(
        arrayBuffer,
        audioObj.mime_type || "audio/ogg",
        "ogg"
      );

      if (transcripcion) {
        incoming.text = transcripcion;
        incoming.esAudio = true;
      } else {
        await sendWhatsAppMessage(
          sender,
          "⚠️ No pude entender el audio. Por favor, escribime tu mensaje o intentá hablar un poco más claro."
        );
        return new Response("OK", { status: 200 });
      }
    }

    await processMessage(adapter, incoming);

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Error procesando webhook de WhatsApp:", err);
    return new Response("Error interno", { status: 500 });
  }
});
