// Esta función serverless se ejecuta en Supabase Edge Functions. Se incluye aquí para mantener el control de versiones.
//quiero ver si se sube bien

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// ==========================================
// CONFIGURACIÓN Y CLAVES API
// ==========================================
// Deno.env.get() buscará las claves directamente en los Secrets de Supabase.
// Usamos ?? '' para evitar errores de TypeScript si alguna no existe.

const TELEGRAM_TOKEN = Deno.env.get("BOT_TELEGRAM_TOKEN") ?? "";
const WHATSAPP_VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN") ?? "";
const WHATSAPP_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_ID") ?? "";
const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_TOKEN") ?? "";
const GROQ_API_KEY_1 = Deno.env.get("GROQ_API_KEY_1") ?? "";
const GROQ_API_KEY_2 = Deno.env.get("GROQ_API_KEY_2") ?? "";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const WEATHER_API_KEY = Deno.env.get("WEATHER_API_KEY") ?? "";

// Variables nativas de Supabase (Se inyectan solas, no hay que agregarlas a secrets manualmente)
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseKey =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  Deno.env.get("SUPABASE_ANON_KEY") ??
  "";
const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// UTILIDADES DE MENSAJERÍA
// ==========================================
async function sendMessage(
  platform: "telegram" | "whatsapp",
  chatId: string | number,
  text: string,
  useKeyboard = false
) {
  if (platform === "telegram") {
    const payload: Record<string, unknown> = {
      chat_id: chatId,
      text: text,
      parse_mode: "HTML",
    };
    if (useKeyboard) {
      payload.reply_markup = {
        keyboard: [
          [{ text: "🚨 Enviar Reporte" }, { text: "📍 Estado de mi zona" }],
        ],
        resize_keyboard: true,
        one_time_keyboard: false,
      };
    } else {
      payload.reply_markup = { remove_keyboard: true };
    }
    const resTelegram = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    if (!resTelegram.ok) {
      console.error(
        "Error al enviar mensaje a Telegram:",
        resTelegram.status,
        await resTelegram.text()
      );
    }
  } else if (platform === "whatsapp") {
    let payload: Record<string, unknown>;
    // Whatsapp text conversion from HTML bold to Markdown bold
    const waText = text.replace(/<b>/g, "*").replace(/<\/b>/g, "*");
    if (useKeyboard) {
      payload = {
        messaging_product: "whatsapp",
        to: chatId.toString(),
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: waText },
          action: {
            buttons: [
              {
                type: "reply",
                reply: { id: "reporte", title: "🚨 Enviar Reporte" },
              },
              {
                type: "reply",
                reply: { id: "estado", title: "📍 Estado de mi zona" },
              },
            ],
          },
        },
      };
    } else {
      payload = {
        messaging_product: "whatsapp",
        to: chatId.toString(),
        type: "text",
        text: { body: waText },
      };
    }
    const resWhatsapp = await fetch(
      `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );
    if (!resWhatsapp.ok) {
      console.error(
        "Error al enviar mensaje a WhatsApp:",
        resWhatsapp.status,
        await resWhatsapp.text()
      );
    }
  }
}

// ==========================================
// MÓDULO DE CLIMA (Histórico + Actual)
// ==========================================
async function checkWeatherSeverity(
  lat: number,
  lon: number
): Promise<{ llueve_ahora: boolean; lluvia_24h_mm: number; fuente: string }> {
  // INTENTO 1: Open-Meteo (Excelente para datos acumulados recientes)
  try {
    // past_days=1 y forecast_days=1 nos da ayer y hoy
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=precipitation&daily=precipitation_sum&timezone=auto&past_days=1&forecast_days=1`
    );
    if (res.ok) {
      const data = await res.json();
      const precip_ahora = data.current?.precipitation || 0;

      // Sumamos la precipitación de ayer [0] y lo que va de hoy [1]
      const precip_ayer = data.daily?.precipitation_sum?.[0] || 0;
      const precip_hoy = data.daily?.precipitation_sum?.[1] || 0;
      const lluvia_acumulada = precip_ayer + precip_hoy;

      return {
        llueve_ahora: precip_ahora > 0,
        lluvia_24h_mm: lluvia_acumulada,
        fuente: "Open-Meteo",
      };
    }
  } catch (error) {
    console.error("Open-Meteo falló.", error);
  }

  // INTENTO 2: WeatherAPI (Fallback, solo da actual)
  try {
    const res = await fetch(
      `http://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${lat},${lon}`
    );
    if (res.ok) {
      const data = await res.json();
      const precip = data.current?.precip_mm || 0;
      return {
        llueve_ahora: precip > 0,
        lluvia_24h_mm: precip,
        fuente: "WeatherAPI",
      };
    }
  } catch {
    console.error("WeatherAPI falló.");
  }

  return { llueve_ahora: false, lluvia_24h_mm: 0, fuente: "Desconocida" };
}

// ==========================================
// CLASIFICACIÓN DEL REPORTE (columnas tipadas)
// ==========================================
// NUEVO: el reporte ahora persiste 3 columnas tipadas (`tipo`, `riesgo`,
// `estado`) además de `criticidad` (texto libre). Antes el frontend tenía que
// inferir estos valores con heurísticas al leer (mapDbRowToReport); ahora se
// deciden acá al ingestar, quedando indexables y filtrables en SQL (push-down).
// Los valores replican los dominios de types/report.ts de la app.

// `tipo`: mismos 4 valores que el dominio ReportType.
// Idealmente sale del análisis de IA; por ahora usamos extracción por palabras
// clave de la descripción (misma lógica que la heurística del frontend).
function extractReportType(descripcion: string): string {
  const lower = (descripcion || "").toLowerCase();
  if (lower.includes("inund")) return "INUNDACION_URBANA";
  if (lower.includes("lluv")) return "LLUVIAS_FUERTES";
  if (lower.includes("graniz")) return "GRANIZO";
  if (lower.includes("aneg")) return "ANEGAMIENTO_VIVIENDA";
  if (lower.includes("corte") || lower.includes("ruta"))
    return "INUNDACION_URBANA";
  if (lower.includes("rescat")) return "ANEGAMIENTO_VIVIENDA";
  return "INUNDACION_URBANA";
}

// `riesgo`: mapa directo de la criticidad asignada arriba
// (AMARILLA→MEDIO, NARANJA→ALTO, ROJA→CRITICO).
function mapCriticidadToRiesgo(criticidad: string): string {
  if (criticidad.includes("ROJA")) return "CRITICO";
  if (criticidad.includes("NARANJA")) return "ALTO";
  if (criticidad.includes("AMARILLA")) return "MEDIO";
  return "BAJO";
}

// `estado`: resultado de la validación contra el clima.
//  - VALIDADO_CLIMA: hay precipitación real o acumulada > 0mm.
//  - DESESTIMADO_SIN_ALERTA: el clima no registra lluvia.
//  - PENDIENTE_VALIDACION: no se obtuvo fuente climática (fuente 'Desconocida').
function computeValidationState(clima: {
  llueve_ahora: boolean;
  lluvia_24h_mm: number;
  fuente: string;
}): string {
  if (!clima || clima.fuente === "Desconocida") return "PENDIENTE_VALIDACION";
  if (!clima.llueve_ahora && (clima.lluvia_24h_mm || 0) <= 0)
    return "DESESTIMADO_SIN_ALERTA";
  return "VALIDADO_CLIMA";
}

// ==========================================
// MÓDULO IA ENRUTADOR
// ==========================================
async function analyzeTextIntent(text: string): Promise<string> {
  text = text.substring(0, 500);
  if (text === "🚨 Enviar Reporte") return "REPORTE";
  if (text === "📍 Estado de mi zona") return "CONSULTA";

  const prompt = `Analiza el texto de este ciudadano. Clasifica la intención en: 'REPORTE' (inundación, agua, peligro, caída de árbol), 'CONSULTA' (clima, saber estado de zona) o 'DESCONOCIDO' (otra cosa). Texto: "${text}". Responde SÓLO con JSON: {"intent": "REPORTE"}`;

  const textLower = text.toLowerCase();
  if (
    /(inundad|inundación|inundacion|agua|desborde|caída|caida|árbol|arbol|emergencia|rescate|bote|tormenta|temporal|granizo|viento|ráfaga|rafaga|tornado|huracan|huracán|anegad|anegamiento|tapado|alcantarilla|techo|voló|volo|corte|luz|electricidad|cable|poste|peligro|evacuación|evacuacion|ayuda|socorro|bombero|policía|policia|ambulancia|herido|auxilio|río|rio|arroyo|cauce|creciente|derrumbe|socavón|socavon|desprendimiento|atrapad)/.test(
      textLower
    )
  )
    return "REPORTE";
  if (/(zona|barrio|clima|llover|lluvia|estado)/.test(textLower))
    return "CONSULTA";

  async function callGroq(apiKey: string) {
    const resModels = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!resModels.ok)
      throw new Error("No se pudieron obtener modelos de Groq");
    const dataModels = await resModels.json();
    const GROQ_EXCLUDE = [
      "guard",
      "whisper",
      "vision",
      "embedding",
      "tts",
      "batch",
    ];
    const models: string[] = dataModels.data
      .map((m: { id: string }) => m.id)
      .filter(
        (id: string) =>
          (id.includes("llama") ||
            id.includes("mixtral") ||
            id.includes("gemma")) &&
          !GROQ_EXCLUDE.some((bad) => id.toLowerCase().includes(bad))
      );
    console.log("Groq modelos de chat disponibles:", models);
    if (models.length === 0)
      throw new Error("No hay modelos de chat disponibles en Groq");

    for (const model of models) {
      const res = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        console.log(`Groq intent OK con modelo: ${model}`);
        return JSON.parse(data.choices[0].message.content).intent;
      } else {
        console.error(`Groq ${model} falló: ${res.status} ${await res.text()}`);
      }
    }
    throw new Error("Todos los modelos de chat de Groq fallaron");
  }

  async function callGemini() {
    const resModels = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`
    );
    if (!resModels.ok)
      throw new Error("No se pudieron obtener modelos de Gemini");
    const dataModels = await resModels.json();
    const models: string[] = dataModels.models
      .filter(
        (m: { name: string; supportedGenerationMethods?: string[] }) =>
          Array.isArray(m.supportedGenerationMethods) &&
          m.supportedGenerationMethods.includes("generateContent") &&
          m.name.includes("gemini") &&
          !m.name.includes("vision")
      )
      .map((m: { name: string }) => m.name.replace("models/", ""));
    console.log("Gemini modelos generateContent disponibles:", models);
    if (models.length === 0)
      throw new Error("No hay modelos generateContent disponibles en Gemini");

    for (const model of models) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) {
          console.error(`Gemini ${model} devolvió texto vacío`);
          continue;
        }
        console.log(`Gemini intent OK con modelo: ${model}`);
        return JSON.parse(rawText.replace(/```json|```/g, "")).intent;
      } else {
        console.error(
          `Gemini ${model} falló: ${res.status} ${await res.text()}`
        );
      }
    }
    throw new Error("Todos los modelos generateContent de Gemini fallaron");
  }

  try {
    return await callGroq(GROQ_API_KEY_1);
  } catch (e1) {
    console.error("Groq 1 intent failed:", e1);
    try {
      return await callGemini();
    } catch (e2) {
      console.error("Gemini intent failed:", e2);
      try {
        return await callGroq(GROQ_API_KEY_2);
      } catch (e3) {
        console.error("Groq 2 intent failed:", e3);
        return "DESCONOCIDO";
      }
    }
  }
}

async function validateDescriptionWithAI(text: string): Promise<boolean> {
  text = text.substring(0, 500);
  const prompt = `Analiza si este texto describe una emergencia climática (lluvia, inundación, calle anegada, árbol caído, viento, granizo, etc.). Responde SÓLO con JSON: {"es_emergencia": true} o {"es_emergencia": false}. Texto: "${text}"`;

  async function callGroq(apiKey: string) {
    const resModels = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!resModels.ok)
      throw new Error("No se pudieron obtener modelos de Groq");
    const dataModels = await resModels.json();
    const GROQ_EXCLUDE = [
      "guard",
      "whisper",
      "vision",
      "embedding",
      "tts",
      "batch",
    ];
    const models: string[] = dataModels.data
      .map((m: { id: string }) => m.id)
      .filter(
        (id: string) =>
          (id.includes("llama") ||
            id.includes("mixtral") ||
            id.includes("gemma")) &&
          !GROQ_EXCLUDE.some((bad) => id.toLowerCase().includes(bad))
      );
    console.log("Groq modelos de chat disponibles:", models);
    if (models.length === 0)
      throw new Error("No hay modelos de chat disponibles en Groq");

    for (const model of models) {
      const res = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        console.log(`Groq validate OK con modelo: ${model}`);
        return JSON.parse(data.choices[0].message.content).es_emergencia;
      } else {
        console.error(`Groq ${model} falló: ${res.status} ${await res.text()}`);
      }
    }
    throw new Error("Todos los modelos de chat de Groq fallaron");
  }

  async function callGemini() {
    const resModels = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`
    );
    if (!resModels.ok)
      throw new Error("No se pudieron obtener modelos de Gemini");
    const dataModels = await resModels.json();
    const models: string[] = dataModels.models
      .filter(
        (m: { name: string; supportedGenerationMethods?: string[] }) =>
          Array.isArray(m.supportedGenerationMethods) &&
          m.supportedGenerationMethods.includes("generateContent") &&
          m.name.includes("gemini") &&
          !m.name.includes("vision")
      )
      .map((m: { name: string }) => m.name.replace("models/", ""));
    console.log("Gemini modelos generateContent disponibles:", models);
    if (models.length === 0)
      throw new Error("No hay modelos generateContent disponibles en Gemini");

    for (const model of models) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) {
          console.error(`Gemini ${model} devolvió texto vacío`);
          continue;
        }
        console.log(`Gemini validate OK con modelo: ${model}`);
        return JSON.parse(rawText.replace(/```json|```/g, "")).es_emergencia;
      } else {
        console.error(
          `Gemini ${model} falló: ${res.status} ${await res.text()}`
        );
      }
    }
    throw new Error("Todos los modelos generateContent de Gemini fallaron");
  }

  try {
    return await callGroq(GROQ_API_KEY_1);
  } catch (e1) {
    console.error("Groq 1 validate failed:", e1);
    try {
      return await callGemini();
    } catch (e2) {
      console.error("Gemini validate failed:", e2);
      try {
        return await callGroq(GROQ_API_KEY_2);
      } catch (e3) {
        console.error("Groq 2 validate failed:", e3);
        return true; /* Fallback a true si caen APIs */
      }
    }
  }
}

// ==========================================
// GESTIÓN DE SESIONES (BD)
// ==========================================
type BotSession = {
  chat_id: number;
  state: string;
  intentos_fallidos: number;
  datos_temporales: Record<string, unknown>;
  ultima_interaccion: string;
};

async function getDBSession(chatId: number) {
  const { data, error } = await supabase
    .from("user_sessions")
    .select("*")
    .eq("chat_id", chatId)
    .single();
  const now = new Date();

  if (error || !data) {
    const newSession = {
      chat_id: chatId,
      state: "IDLE",
      intentos_fallidos: 0,
      datos_temporales: {},
      ultima_interaccion: now.toISOString(),
    };
    await supabase.from("user_sessions").upsert(newSession);
    return newSession;
  }

  const lastInteraction = new Date(data.ultima_interaccion).getTime();
  if (now.getTime() - lastInteraction > 600000) {
    const resetSession = {
      chat_id: chatId,
      state: "IDLE",
      intentos_fallidos: 0,
      datos_temporales: {},
      ultima_interaccion: now.toISOString(),
    };
    await supabase.from("user_sessions").upsert(resetSession);
    return resetSession;
  }

  return data;
}

async function saveDBSession(session: BotSession) {
  session.ultima_interaccion = new Date().toISOString();
  await supabase.from("user_sessions").upsert(session);
}

// ==========================================
// CONTROLADOR PRINCIPAL
// ==========================================
serve(async (req) => {
  try {
    // 1. WhatsApp Webhook Verification
    if (req.method === "GET") {
      const url = new URL(req.url);
      if (url.searchParams.get("hub.mode") === "subscribe") {
        if (
          url.searchParams.get("hub.verify_token") === WHATSAPP_VERIFY_TOKEN
        ) {
          return new Response(url.searchParams.get("hub.challenge") || "", {
            status: 200,
          });
        }
        return new Response("Forbidden", { status: 403 });
      }
      return new Response("OK", { status: 200 });
    }

    if (req.method !== "POST")
      return new Response("Method not allowed", { status: 405 });

    const body = await req.json();
    console.log("Webhook POST recibido:", JSON.stringify(body));

    let platform: "telegram" | "whatsapp" = "telegram";
    let chatId: string | number = 0;
    let text = "";
    let isPhoto = false;
    let location: { latitude: number; longitude: number } | null = null;

    if (body.object === "whatsapp_business_account") {
      platform = "whatsapp";
      console.log(">>> Plataforma detectada: WhatsApp");
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      console.log(">>> changes.value keys:", Object.keys(changes?.value || {}));
      const msg = changes?.value?.messages?.[0];
      if (!msg) {
        if (changes?.value?.statuses) {
          console.log("Evento de estado de WhatsApp recibido y omitido (NO es un mensaje de usuario).");
        } else {
          console.log(">>> Payload de WhatsApp sin messages ni statuses:", JSON.stringify(changes?.value));
        }
        return new Response("OK", { status: 200 });
      }

      chatId = msg.from; // String (phone number)
      console.log(">>> WhatsApp msg.from:", chatId, "msg.type:", msg.type);

      if (msg.type === "text") {
        text = msg.text.body;
      } else if (msg.type === "interactive" && msg.interactive?.button_reply) {
        text = msg.interactive.button_reply.title;
      } else if (msg.type === "location") {
        location = {
          latitude: msg.location.latitude,
          longitude: msg.location.longitude,
        };
      } else if (msg.type === "image") {
        isPhoto = true;
      }
    } else if (body.message) {
      platform = "telegram";
      chatId = body.message.chat.id;
      text = body.message.text || body.message.caption || "";
      isPhoto = !!body.message.photo;
      location = body.message.location; // { latitude, longitude }
    } else {
      return new Response("OK", { status: 200 });
    }

    // Convert chatId to BigInt compatible format for Supabase
    const dbChatId = parseInt(chatId.toString());
    console.log(">>> dbChatId:", dbChatId, "platform:", platform, "text:", text);

    const session = await getDBSession(dbChatId);
    console.log(">>> Session obtenida, state:", session.state);

    if (["/cancel", "cancelar", "salir"].includes(text.toLowerCase())) {
      session.state = "IDLE";
      session.datos_temporales = {};
      await saveDBSession(session);
      await sendMessage(
        platform,
        chatId,
        "Acción cancelada. ¿En qué más te puedo ayudar?",
        true
      );
      return new Response("OK", { status: 200 });
    }

    switch (session.state) {
      case "IDLE":
        if (text) {
          const intent = await analyzeTextIntent(text);

          if (intent === "REPORTE") {
            session.intentos_fallidos = 0;
            // SMART UX: Si el usuario apretó el botón o escribió un comando corto, le pedimos detalle.
            if (text === "🚨 Enviar Reporte" || text.length < 15) {
              session.state = "ESPERANDO_DESCRIPCION";
              await sendMessage(
                platform,
                chatId,
                "📝 Por favor, <b>describe brevemente cuál es el problema</b> (ej: calle inundada, árbol caído, agua dentro del hogar)."
              );
            } else {
              // SMART UX: Si escribió un texto largo, validamos que sea una emergencia.
              const esEmergencia = await validateDescriptionWithAI(text);
              if (esEmergencia) {
                session.datos_temporales = { descripcion: text };
                session.state = "ESPERANDO_UBICACION_REPORTE";
                await sendMessage(
                  platform,
                  chatId,
                  "📝 Descripción registrada.\n\n📍 Ahora, por favor <b>envía tu ubicación actual</b> usando el clip 📎 de Telegram para mapear el problema."
                );
              } else {
                await sendMessage(
                  platform,
                  chatId,
                  "Tu mensaje no parece describir una emergencia climática válida. Por favor, sé más específico o usa el teclado para navegar.",
                  true
                );
              }
            }
          } else if (intent === "CONSULTA") {
            session.state = "ESPERANDO_UBICACION_CONSULTA";
            session.intentos_fallidos = 0;
            await sendMessage(
              platform,
              chatId,
              "📍 Para decirte cómo está tu zona, <b>envíame tu ubicación</b> usando el clip 📎 de Telegram."
            );
          } else {
            await sendMessage(
              platform,
              chatId,
              "No entendí tu mensaje. Puedes elegir una opción del menú debajo.",
              true
            );
          }
        } else {
          await sendMessage(
            platform,
            chatId,
            "Para comenzar, por favor envíame un mensaje de texto o usa los botones del teclado. 👇",
            true
          );
        }
        break;

      case "ESPERANDO_DESCRIPCION":
        if (text) {
          const esEmergencia = await validateDescriptionWithAI(text);
          if (esEmergencia) {
            session.datos_temporales = { descripcion: text };
            session.state = "ESPERANDO_UBICACION_REPORTE";
            session.intentos_fallidos = 0;
            await sendMessage(
              platform,
              chatId,
              "¡Entendido! \n\n📍 Ahora, por favor <b>envía tu ubicación actual</b> usando el clip 📎 (Adjuntar) -> Ubicación."
            );
          } else {
            await sendMessage(
              platform,
              chatId,
              "⚠️ Tu mensaje no parece estar relacionado con una emergencia climática (lluvia, calle anegada, caída de árbol). Por favor describe el problema nuevamente o escribe /cancelar."
            );
          }
        } else {
          await sendMessage(
            platform,
            chatId,
            "Por favor, envíame una descripción en texto de lo que está sucediendo."
          );
        }
        break;

      case "ESPERANDO_UBICACION_REPORTE":
        if (location) {
          await sendMessage(
            platform,
            chatId,
            "⏳ Analizando el clima histórico y actual en esa ubicación..."
          );
          const clima = await checkWeatherSeverity(
            location.latitude,
            location.longitude
          );

          // Nueva lógica de criticidad basada en lluvia acumulada (mm)
          let criticidad = "AMARILLA (Moderada)";
          if (clima.lluvia_24h_mm > 30) criticidad = "NARANJA (Alerta)";
          if (clima.lluvia_24h_mm > 60) criticidad = "ROJA (Crítica)";

          // Guardamos todo para el paso final
          session.datos_temporales = {
            ...session.datos_temporales, // Mantiene la descripción
            lat: location.latitude,
            lon: location.longitude,
            clima,
            criticidad,
          };

          session.state = "ESPERANDO_FOTO";
          session.intentos_fallidos = 0;

          await sendMessage(
            platform,
            chatId,
            `¡Ubicación registrada!\n⛈️ Lluvia acumulada (24h): <b>${clima.lluvia_24h_mm.toFixed(1)}mm</b>.\n🚨 Criticidad asignada: <b>${criticidad}</b>.\n\n📷 (Último paso) Envía una <b>foto del problema</b>, o escribe "omitir" para finalizar el reporte.`
          );
        } else {
          session.intentos_fallidos++;
          if (session.intentos_fallidos >= 3) {
            session.state = "IDLE";
            await sendMessage(
              platform,
              chatId,
              "Superaste el límite de intentos. Reporte cancelado.",
              true
            );
          } else {
            await sendMessage(
              platform,
              chatId,
              `❌ No reconozco esa ubicación. Tienes que usar la herramienta de adjuntar de Telegram (clip 📎 -> Ubicación). (Intento ${session.intentos_fallidos}/3)`
            );
          }
        }
        break;

      case "ESPERANDO_FOTO":
        if (isPhoto || text.toLowerCase() === "omitir") {
          // GUARDADO DEFINITIVO EN LA BASE DE DATOS
          // NUEVO: además de `criticidad` (texto libre), persistimos las
          // columnas tipadas `tipo`, `riesgo` y `estado` (ver sección
          // "CLASIFICACIÓN DEL REPORTE" arriba) para poder filtrar en SQL.
          const descripcion =
            session.datos_temporales.descripcion || "Sin descripción detallada";
          const criticidad =
            session.datos_temporales.criticidad || "AMARILLA (Moderada)";
          const clima = session.datos_temporales.clima || {
            llueve_ahora: false,
            lluvia_24h_mm: 0,
            fuente: "Desconocida",
          };

          const { error: insertError } = await supabase.from("reports").insert({
            chat_id: dbChatId,
            descripcion,
            lat: session.datos_temporales.lat,
            lon: session.datos_temporales.lon,
            location: `POINT(${session.datos_temporales.lon} ${session.datos_temporales.lat})`,
            criticidad,
            lluvia_mm: clima.lluvia_24h_mm || 0,
            clima_fuente: clima.fuente || "Desconocida",
            // NUEVAS columnas tipadas: el frontend ya no tiene que inferirlas.
            tipo: extractReportType(descripcion),
            riesgo: mapCriticidadToRiesgo(criticidad),
            estado: computeValidationState(clima),
            // NOTA: Para hackathon, si envían foto, puedes dejar el foto_url nulo o guardar el file_id de Telegram temporalmente.
          });

          if (insertError) {
            console.error("🔥🔥 ERROR GUARDANDO REPORTE EN DB:", insertError);
            await sendMessage(
              platform,
              chatId,
              "❌ Ocurrió un error al guardar el reporte en la base de datos. Por favor, intenta de nuevo.",
              true
            );
            break; // Salimos del switch para que guarde la sesión actual
          }

          session.state = "IDLE";
          session.datos_temporales = {}; // Limpiar
          await sendMessage(
            platform,
            chatId,
            "✅ <b>¡Reporte guardado con éxito!</b> Ha sido subido al mapa de Crisis y los equipos de emergencia han sido notificados. Mantente a salvo.",
            true
          );
        } else {
          await sendMessage(
            platform,
            chatId,
            "Por favor envía una foto o escribe 'omitir' para terminar de subir tu reporte."
          );
        }
        break;

      case "ESPERANDO_UBICACION_CONSULTA":
        if (location) {
          const clima = await checkWeatherSeverity(
            location.latitude,
            location.longitude
          );

          const { data: reportesCercanos } = await supabase.rpc(
            "get_reports_nearby",
            {
              p_lon: location.longitude,
              p_lat: location.latitude,
              p_radius: 2000,
            }
          );

          session.state = "IDLE";
          await sendMessage(
            platform,
            chatId,
            `📊 <b>Estado de tu zona (Radio 2km):</b>\n\n🌧️ Lluvia acumulada 24h: <b>${clima.lluvia_24h_mm.toFixed(1)}mm</b>\n🚨 Hay <b>${reportesCercanos || 0} reporte(s)</b> de emergencia cerca de ti.\n\nMantente a salvo. Si ves peligro, usa el botón de Enviar Reporte.`,
            true
          );
        } else {
          session.intentos_fallidos++;
          if (session.intentos_fallidos >= 3) {
            session.state = "IDLE";
            await sendMessage(
              platform,
              chatId,
              "Consulta cancelada por errores de formato.",
              true
            );
          } else {
            await sendMessage(
              platform,
              chatId,
              "Por favor, adjunta tu ubicación usando el clip 📎."
            );
          }
        }
        break;
    }

    await saveDBSession(session);
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Error crítico:", error);
    return new Response("OK", { status: 200 }); // Evitar reintentos de Telegram
  }
});
