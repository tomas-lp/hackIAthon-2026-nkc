import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import {
  processMessage,
  IMessengerAdapter,
  IncomingMessage,
} from "../_shared/state_machine.ts";

const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_TOKEN") ?? "";
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") ?? "";
const WHATSAPP_API = `https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_NUMBER_ID}`;

async function sendWhatsAppMessage(to: string, text: string) {
  await fetch(`${WHATSAPP_API}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to,
      text: { body: text },
    }),
  });
}

serve(async (req) => {
  // Manejo del Webhook Verify Token de Meta
  if (req.method === "GET") {
    const url = new URL(req.url);
    if (
      url.searchParams.get("hub.mode") === "subscribe" &&
      url.searchParams.get("hub.verify_token") === "mi_super_secreto_whatsapp"
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
    const sender = msg.from; // Número de teléfono que funciona como userId
    const userId = sender;

    const adapter: IMessengerAdapter = {
      platform: "whatsapp",
      userId,
      sendMessage: async (text: string) => {
        await sendWhatsAppMessage(sender, text);
      },
    };

    const incoming: IncomingMessage = {};

    if (msg.type === "text") {
      incoming.text = msg.text.body;
    } else if (msg.type === "location") {
      incoming.location = {
        latitude: msg.location.latitude,
        longitude: msg.location.longitude,
      };
    } else if (msg.type === "image") {
      const mediaId = msg.image.id;

      // Obtener URL del archivo
      const resUrl = await fetch(
        `https://graph.facebook.com/v17.0/${mediaId}`,
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
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      incoming.photo = {
        base64,
        mimeType: msg.image.mime_type,
      };

      if (msg.image.caption) {
        incoming.text = msg.image.caption;
      }
    }

    await processMessage(adapter, incoming);

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Error procesando webhook de WhatsApp:", err);
    return new Response("Error interno", { status: 500 });
  }
});
