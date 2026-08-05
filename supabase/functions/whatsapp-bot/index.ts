// ==========================================
// WHATSAPP BOT (Duplicado del original para desarrollo aislado)
// ==========================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// ==========================================
// CONFIGURACIÓN Y CLAVES API
// ==========================================
const TELEGRAM_TOKEN = Deno.env.get("BOT_TELEGRAM_TOKEN") ?? "";
const WHATSAPP_VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN") ?? "";
const WHATSAPP_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_ID") ?? "";
const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_TOKEN") ?? "";
const GROQ_API_KEY_1 = Deno.env.get("GROQ_API_KEY_1") ?? "";
const GROQ_API_KEY_2 = Deno.env.get("GROQ_API_KEY_2") ?? "";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const WEATHER_API_KEY = Deno.env.get("WEATHER_API_KEY") ?? "";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseKey =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  Deno.env.get("SUPABASE_ANON_KEY") ??
  "";
const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// CACHÉ DE MODELOS EN MEMORIA (Para evitar fetch a /models en cada request)
// ==========================================
let groqModelsCache: string[] | null = null;
let groqModelsCacheTime = 0;
let geminiModelsCache: string[] | null = null;
let geminiModelsCacheTime = 0;
const CACHE_TTL = 1000 * 60 * 60; // 1 hora

async function getGroqModels(apiKey: string): Promise<string[]> {
  const now = Date.now();
  if (groqModelsCache && now - groqModelsCacheTime < CACHE_TTL) return groqModelsCache;

  const res = await fetch("https://api.groq.com/openai/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error("No se pudieron obtener modelos de Groq");
  const data = await res.json();
  const GROQ_EXCLUDE = ["guard", "whisper", "vision", "embedding", "tts", "batch"];
  const models = data.data
    .map((m: { id: string }) => m.id)
    .filter(
      (id: string) =>
        (id.includes("llama") || id.includes("mixtral") || id.includes("gemma")) &&
        !GROQ_EXCLUDE.some((bad) => id.toLowerCase().includes(bad))
    );
  
  if (models.length === 0) throw new Error("No hay modelos de chat disponibles en Groq");
  groqModelsCache = models;
  groqModelsCacheTime = now;
  return models;
}

async function getGeminiModels(): Promise<string[]> {
  const now = Date.now();
  if (geminiModelsCache && now - geminiModelsCacheTime < CACHE_TTL) return geminiModelsCache;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`);
  if (!res.ok) throw new Error("No se pudieron obtener modelos de Gemini");
  const data = await res.json();
  const models = data.models
    .filter(
      (m: { name: string; supportedGenerationMethods?: string[] }) =>
        Array.isArray(m.supportedGenerationMethods) &&
        m.supportedGenerationMethods.includes("generateContent") &&
        m.name.includes("gemini") &&
        !m.name.includes("vision")
    )
    .map((m: { name: string }) => m.name.replace("models/", ""));
  
  if (models.length === 0) throw new Error("No hay modelos generateContent disponibles en Gemini");
  geminiModelsCache = models;
  geminiModelsCacheTime = now;
  return models;
}

// ==========================================
// CLIENTES IA UNIFICADOS
// ==========================================
async function callGroqAI(apiKey: string, prompt: string, expectJson: boolean = true) {
  const models = await getGroqModels(apiKey);
  for (const model of models) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        ...(expectJson ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const content = data.choices[0].message.content;
      return expectJson ? JSON.parse(content) : content;
    }
  }
  throw new Error("Todos los modelos de chat de Groq fallaron");
}

async function callGeminiAI(prompt: string, expectJson: boolean = true) {
  const models = await getGeminiModels();
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
      if (!rawText) continue;
      return expectJson ? JSON.parse(rawText.replace(/```json|```/g, "")) : rawText;
    }
  }
  throw new Error("Todos los modelos generateContent de Gemini fallaron");
}

async function runAIFallback(prompt: string, expectJson: boolean = true) {
  try {
    return await callGroqAI(GROQ_API_KEY_1, prompt, expectJson);
  } catch (e1) {
    console.error("Groq 1 failed:", e1);
    try {
      return await callGeminiAI(prompt, expectJson);
    } catch (e2) {
      console.error("Gemini failed:", e2);
      try {
        return await callGroqAI(GROQ_API_KEY_2, prompt, expectJson);
      } catch (e3) {
        console.error("Groq 2 failed:", e3);
        throw e3;
      }
    }
  }
}

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
        keyboard: [[{ text: "🚨 Enviar Reporte" }, { text: "📍 Estado de mi zona" }]],
        resize_keyboard: true,
        one_time_keyboard: false,
      };
    } else {
      payload.reply_markup = { remove_keyboard: true };
    }
    const resTelegram = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!resTelegram.ok) console.error("Error Telegram:", resTelegram.status, await resTelegram.text());
  } else if (platform === "whatsapp") {
    const waText = text.replace(/<b>/g, "*").replace(/<\/b>/g, "*");
    let payload: Record<string, unknown>;
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
              { type: "reply", reply: { id: "reporte", title: "🚨 Enviar Reporte" } },
              { type: "reply", reply: { id: "estado", title: "📍 Estado de mi zona" } },
            ],
          },
        },
      };
    } else {
      payload = { messaging_product: "whatsapp", to: chatId.toString(), type: "text", text: { body: waText } };
    }
    const resWhatsapp = await fetch(`https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!resWhatsapp.ok) console.error("Error WhatsApp:", resWhatsapp.status, await resWhatsapp.text());
  }
}

// ==========================================
// MÓDULO DE CLIMA
// ==========================================
async function checkWeatherSeverity(lat: number, lon: number): Promise<{ llueve_ahora: boolean; lluvia_24h_mm: number; fuente: string }> {
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=precipitation&daily=precipitation_sum&timezone=auto&past_days=1&forecast_days=1`);
    if (res.ok) {
      const data = await res.json();
      const precip_ahora = data.current?.precipitation || 0;
      const precip_ayer = data.daily?.precipitation_sum?.[0] || 0;
      const precip_hoy = data.daily?.precipitation_sum?.[1] || 0;
      return { llueve_ahora: precip_ahora > 0, lluvia_24h_mm: precip_ayer + precip_hoy, fuente: "Open-Meteo" };
    }
  } catch (error) { console.error("Open-Meteo falló.", error); }

  try {
    const res = await fetch(`http://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${lat},${lon}`);
    if (res.ok) {
      const data = await res.json();
      const precip = data.current?.precip_mm || 0;
      return { llueve_ahora: precip > 0, lluvia_24h_mm: precip, fuente: "WeatherAPI" };
    }
  } catch { console.error("WeatherAPI falló."); }

  return { llueve_ahora: false, lluvia_24h_mm: 0, fuente: "Desconocida" };
}

// ==========================================
// MÓDULO IA ENRUTADOR Y CLASIFICADOR
// ==========================================
async function analyzeTextIntent(text: string): Promise<string> {
  text = text.substring(0, 500);
  if (text === "🚨 Enviar Reporte") return "REPORTE";
  if (text === "📍 Estado de mi zona") return "CONSULTA";

  const prompt = `Analiza el texto de este ciudadano. Clasifica la intención en: 'REPORTE' (inundación, agua, peligro, caída de árbol), 'CONSULTA' (clima, saber estado de zona) o 'DESCONOCIDO' (otra cosa). Texto: "${text}". Responde SÓLO con JSON: {"intent": "REPORTE"}`;

  const textLower = text.toLowerCase();
  if (/(inundad|agua|desborde|caída|caida|árbol|arbol|emergencia|rescate|bote|tormenta|temporal|granizo|viento|ráfaga|rafaga|tornado|huracan|huracán|anegad|anegamiento|tapado|alcantarilla|techo|voló|volo|corte|luz|electricidad|cable|poste|peligro|evacuación|evacuacion|ayuda|socorro|bombero|policía|policia|ambulancia|herido|auxilio|río|rio|arroyo|cauce|creciente|derrumbe|socavón|socavon|desprendimiento|atrapad)/.test(textLower)) return "REPORTE";
  if (/(zona|barrio|clima|llover|lluvia|estado)/.test(textLower)) return "CONSULTA";

  try {
    const res = await runAIFallback(prompt, true);
    return res.intent || "DESCONOCIDO";
  } catch (e) {
    return "DESCONOCIDO";
  }
}

async function validateDescriptionWithAI(text: string): Promise<{ es_emergencia: boolean; tipo: string; riesgo: string }> {
  text = text.substring(0, 500);
  const prompt = `Analiza si este texto describe una emergencia climática (lluvia, inundación, calle anegada, árbol caído, viento, granizo, etc.). 
  Si es una emergencia, clasifica el 'tipo' (valores permitidos EXACTOS: INUNDACION_URBANA, LLUVIAS_FUERTES, GRANIZO, ANEGAMIENTO_VIVIENDA) y el 'riesgo' (valores permitidos EXACTOS: BAJO, MEDIO, ALTO, CRITICO). 
  Responde SÓLO con JSON, formato: {"es_emergencia": true, "tipo": "...", "riesgo": "..."} o {"es_emergencia": false}. Texto: "${text}"`;

  try {
    const res = await runAIFallback(prompt, true);
    return {
      es_emergencia: !!res.es_emergencia,
      tipo: res.tipo || "INUNDACION_URBANA",
      riesgo: res.riesgo || "MEDIO",
    };
  } catch (e) {
    return { es_emergencia: true, tipo: "INUNDACION_URBANA", riesgo: "MEDIO" };
  }
}

async function analyzePhotoWithGemini(base64Image: string, mimeType: string): Promise<string> {
  const prompt = "Analiza esta imagen y describe brevemente lo que ves, enfocándote especialmente en problemas climáticos, inundaciones, calles anegadas, daños estructurales o árboles caídos. Si es una imagen irrelevante (ej: una selfie o algo que no tiene nada que ver), indícalo.";
  
  try {
    // Usamos el endpoint específico con el modelo gemini-1.5-flash directamente ya que es conocido por soportar visión bien.
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: base64Image } }
          ]
        }]
      })
    });
    if (res.ok) {
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "No se pudo generar descripción.";
    }
  } catch (e) {
    console.error("Error analyzing photo with Gemini:", e);
  }
  return "Error al analizar imagen con IA.";
}

function computeValidationState(clima: { llueve_ahora: boolean; lluvia_24h_mm: number; fuente: string }): string {
  if (!clima || clima.fuente === "Desconocida") return "PENDIENTE_VALIDACION";
  if (!clima.llueve_ahora && (clima.lluvia_24h_mm || 0) <= 0) return "DESESTIMADO_SIN_ALERTA";
  return "VALIDADO_CLIMA";
}

// ==========================================
// GESTIÓN DE SESIONES (BD)
// ==========================================
type BotSession = { chat_id: number; state: string; intentos_fallidos: number; datos_temporales: Record<string, any>; ultima_interaccion: string; };

async function getDBSession(chatId: number) {
  const { data, error } = await supabase.from("user_sessions").select("*").eq("chat_id", chatId).single();
  const now = new Date();

  if (error || !data) {
    const newSession = { chat_id: chatId, state: "IDLE", intentos_fallidos: 0, datos_temporales: {}, ultima_interaccion: now.toISOString() };
    await supabase.from("user_sessions").upsert(newSession);
    return newSession;
  }

  if (now.getTime() - new Date(data.ultima_interaccion).getTime() > 600000) {
    const resetSession = { chat_id: chatId, state: "IDLE", intentos_fallidos: 0, datos_temporales: {}, ultima_interaccion: now.toISOString() };
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
    if (req.method === "GET") {
      const url = new URL(req.url);
      if (url.searchParams.get("hub.mode") === "subscribe") {
        if (url.searchParams.get("hub.verify_token") === WHATSAPP_VERIFY_TOKEN) return new Response(url.searchParams.get("hub.challenge") || "", { status: 200 });
        return new Response("Forbidden", { status: 403 });
      }
      return new Response("OK", { status: 200 });
    }

    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
    const body = await req.json();

    let platform: "telegram" | "whatsapp" = "telegram";
    let chatId: string | number = 0;
    let text = "";
    let isPhoto = false;
    let location: { latitude: number; longitude: number } | null = null;
    let photoData: { fileId: string; } | null = null;

    if (body.object === "whatsapp_business_account") {
      platform = "whatsapp";
      const msg = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      if (!msg) return new Response("OK", { status: 200 });

      chatId = msg.from;
      if (msg.type === "text") text = msg.text.body;
      else if (msg.type === "interactive" && msg.interactive?.button_reply) text = msg.interactive.button_reply.title;
      else if (msg.type === "location") location = { latitude: msg.location.latitude, longitude: msg.location.longitude };
      else if (msg.type === "image") isPhoto = true;
    } else if (body.message) {
      platform = "telegram";
      chatId = body.message.chat.id;
      text = body.message.text || body.message.caption || "";
      isPhoto = !!body.message.photo;
      if (isPhoto) {
        // En Telegram, .photo es un arreglo de tamaños (del más chico al más grande).
        // Agarramos un tamaño intermedio o el penúltimo para evitar archivos gigantes en Supabase Free.
        const photos = body.message.photo;
        const selectedPhoto = photos.length > 1 ? photos[photos.length - 2] : photos[0];
        photoData = { fileId: selectedPhoto.file_id };
      }
      location = body.message.location;
    } else {
      return new Response("OK", { status: 200 });
    }

    const dbChatId = parseInt(chatId.toString());
    const session = await getDBSession(dbChatId);

    if (["/cancel", "cancelar", "salir"].includes(text.toLowerCase())) {
      session.state = "IDLE";
      session.datos_temporales = {};
      await saveDBSession(session);
      await sendMessage(platform, chatId, "Acción cancelada. ¿En qué más te puedo ayudar?", true);
      return new Response("OK", { status: 200 });
    }

    switch (session.state) {
      case "IDLE":
        if (text) {
          const intent = await analyzeTextIntent(text);
          if (intent === "REPORTE") {
            session.intentos_fallidos = 0;
            if (text === "🚨 Enviar Reporte" || text.length < 15) {
              session.state = "ESPERANDO_DESCRIPCION";
              await sendMessage(platform, chatId, "📝 Por favor, <b>describe brevemente cuál es el problema</b> (ej: calle inundada, árbol caído, agua dentro del hogar).");
            } else {
              const aiData = await validateDescriptionWithAI(text);
              if (aiData.es_emergencia) {
                session.datos_temporales = { descripcion: text, tipo: aiData.tipo, riesgo: aiData.riesgo };
                session.state = "ESPERANDO_UBICACION_REPORTE";
                await sendMessage(platform, chatId, "📝 Descripción registrada.\n\n📍 Ahora, por favor <b>envía tu ubicación actual</b> usando el clip 📎 de Telegram para mapear el problema.");
              } else {
                await sendMessage(platform, chatId, "Tu mensaje no parece describir una emergencia climática válida. Por favor, sé más específico o usa el teclado para navegar.", true);
              }
            }
          } else if (intent === "CONSULTA") {
            session.state = "ESPERANDO_UBICACION_CONSULTA";
            session.intentos_fallidos = 0;
            await sendMessage(platform, chatId, "📍 Para decirte cómo está tu zona, <b>envíame tu ubicación</b> usando el clip 📎 de Telegram.");
          } else {
            await sendMessage(platform, chatId, "No entendí tu mensaje. Puedes elegir una opción del menú debajo.", true);
          }
        } else {
          await sendMessage(platform, chatId, "Para comenzar, por favor envíame un mensaje de texto o usa los botones del teclado. 👇", true);
        }
        break;

      case "ESPERANDO_DESCRIPCION":
        if (text) {
          const aiData = await validateDescriptionWithAI(text);
          if (aiData.es_emergencia) {
            session.datos_temporales = { descripcion: text, tipo: aiData.tipo, riesgo: aiData.riesgo };
            session.state = "ESPERANDO_UBICACION_REPORTE";
            session.intentos_fallidos = 0;
            await sendMessage(platform, chatId, "¡Entendido! \n\n📍 Ahora, por favor <b>envía tu ubicación actual</b> usando el clip 📎 (Adjuntar) -> Ubicación.");
          } else {
            await sendMessage(platform, chatId, "⚠️ Tu mensaje no parece estar relacionado con una emergencia climática (lluvia, calle anegada, caída de árbol). Por favor describe el problema nuevamente o escribe /cancelar.");
          }
        } else {
          await sendMessage(platform, chatId, "Por favor, envíame una descripción en texto de lo que está sucediendo.");
        }
        break;

      case "ESPERANDO_UBICACION_REPORTE":
        if (location) {
          await sendMessage(platform, chatId, "⏳ Analizando el clima histórico y actual en esa ubicación...");
          const clima = await checkWeatherSeverity(location.latitude, location.longitude);

          // Utilizamos la IA para asignar el riesgo previamente, pero podemos recalcularlo si la lluvia es masiva
          let criticidad = session.datos_temporales.riesgo || "MEDIO";
          if (clima.lluvia_24h_mm > 60) criticidad = "CRITICO";

          session.datos_temporales = {
            ...session.datos_temporales,
            lat: location.latitude,
            lon: location.longitude,
            clima,
            criticidad,
          };

          session.state = "ESPERANDO_FOTO";
          session.intentos_fallidos = 0;
          await sendMessage(platform, chatId, `¡Ubicación registrada!\n⛈️ Lluvia acumulada (24h): <b>${clima.lluvia_24h_mm.toFixed(1)}mm</b>.\n🚨 Nivel de riesgo detectado: <b>${criticidad}</b>.\n\n📷 (Último paso) Envía una <b>foto del problema</b>, o escribe "omitir" para finalizar el reporte.`);
        } else {
          session.intentos_fallidos++;
          if (session.intentos_fallidos >= 3) {
            session.state = "IDLE";
            await sendMessage(platform, chatId, "Superaste el límite de intentos. Reporte cancelado.", true);
          } else {
            await sendMessage(platform, chatId, `❌ No reconozco esa ubicación. Tienes que usar la herramienta de adjuntar de Telegram (clip 📎 -> Ubicación). (Intento ${session.intentos_fallidos}/3)`);
          }
        }
        break;

      case "ESPERANDO_FOTO":
        if (isPhoto || text.toLowerCase() === "omitir") {
          let fotoUrl = null;
          let descripcion_imagen = null;

          if (isPhoto && photoData?.fileId) {
            await sendMessage(platform, chatId, "⏳ Procesando tu imagen con IA...");
            try {
              // 1. Obtener la foto desde Telegram
              const fileRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getFile?file_id=${photoData.fileId}`);
              const fileData = await fileRes.json();
              if (fileData.ok) {
                const filePath = fileData.result.file_path;
                const imgRes = await fetch(`https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${filePath}`);
                
                // TODO: Extraer metadatos EXIF (fecha de captura, GPS) de la imagen para validar si es una foto antigua.
                // Nota: Telegram comprime las fotos enviadas por defecto (como Image) y elimina los metadatos EXIF por privacidad. 
                // Para recibir metadatos reales y validar, el usuario debería enviar la imagen como "Documento" (Archivo sin comprimir).
                
                const imgBlob = await imgRes.blob();
                
                // 2. Analizar con Gemini Vision
                const arrayBuffer = await imgBlob.arrayBuffer();
                const base64Image = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
                descripcion_imagen = await analyzePhotoWithGemini(base64Image, 'image/jpeg');

                // 3. Subir a Supabase Storage
                const fileName = `${dbChatId}_${Date.now()}.jpg`;
                const { error: uploadError } = await supabase.storage
                  .from('reports-photos')
                  .upload(fileName, imgBlob, { contentType: 'image/jpeg', upsert: true });

                if (!uploadError) {
                  fotoUrl = `${supabaseUrl}/storage/v1/object/public/reports-photos/${fileName}`;
                } else {
                  console.error("Error subiendo foto a Supabase:", uploadError);
                }
              }
            } catch (err) {
              console.error("Error en flujo de foto:", err);
            }
          }

          const descripcion = session.datos_temporales.descripcion || "Sin descripción detallada";
          const clima = session.datos_temporales.clima || { llueve_ahora: false, lluvia_24h_mm: 0, fuente: "Desconocida" };

          const { error: insertError } = await supabase.from("reports").insert({
            chat_id: dbChatId,
            descripcion,
            lat: session.datos_temporales.lat,
            lon: session.datos_temporales.lon,
            location: `POINT(${session.datos_temporales.lon} ${session.datos_temporales.lat})`,
            criticidad: session.datos_temporales.criticidad || "MEDIO",
            lluvia_mm: clima.lluvia_24h_mm || 0,
            clima_fuente: clima.fuente || "Desconocida",
            tipo: session.datos_temporales.tipo || "INUNDACION_URBANA",
            riesgo: session.datos_temporales.criticidad || "MEDIO",
            estado: computeValidationState(clima),
            foto_url: fotoUrl,
            descripcion_imagen: descripcion_imagen
          });

          if (insertError) {
            console.error("ERROR GUARDANDO REPORTE:", insertError);
            await sendMessage(platform, chatId, "❌ Ocurrió un error al guardar el reporte en la base de datos.", true);
            break;
          }

          session.state = "IDLE";
          session.datos_temporales = {};
          await sendMessage(platform, chatId, "✅ <b>¡Reporte guardado con éxito!</b> Ha sido subido al mapa y equipos han sido notificados. Mantente a salvo.", true);
        } else {
          await sendMessage(platform, chatId, "Por favor envía una foto o escribe 'omitir' para terminar.");
        }
        break;

      case "ESPERANDO_UBICACION_CONSULTA":
        if (location) {
          const clima = await checkWeatherSeverity(location.latitude, location.longitude);
          const { data: reportesCercanos } = await supabase.rpc("get_reports_nearby", { p_lon: location.longitude, p_lat: location.latitude, p_radius: 2000 });
          session.state = "IDLE";
          await sendMessage(platform, chatId, `📊 <b>Estado de tu zona (Radio 2km):</b>\n\n🌧️ Lluvia acumulada 24h: <b>${clima.lluvia_24h_mm.toFixed(1)}mm</b>\n🚨 Hay <b>${reportesCercanos || 0} reporte(s)</b> cerca de ti.\n\nMantente a salvo.`, true);
        } else {
          session.intentos_fallidos++;
          if (session.intentos_fallidos >= 3) {
            session.state = "IDLE";
            await sendMessage(platform, chatId, "Consulta cancelada por errores de formato.", true);
          } else {
            await sendMessage(platform, chatId, "Por favor, adjunta tu ubicación usando el clip 📎.");
          }
        }
        break;
    }

    await saveDBSession(session);
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Error crítico:", error);
    return new Response("OK", { status: 200 });
  }
});
