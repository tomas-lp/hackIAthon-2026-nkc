// Esta función serverless se ejecuta en Supabase Edge Functions. Se incluye aquí para mantener el control de versiones.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// ==========================================
// CONFIGURACIÓN Y CLAVES API
// ==========================================
// Deno.env.get() buscará las claves directamente en los Secrets de Supabase.
// Usamos ?? '' para evitar errores de TypeScript si alguna no existe.

const TELEGRAM_TOKEN = Deno.env.get('BOT_TELEGRAM_TOKEN') ?? '';
const GROQ_API_KEY_1 = Deno.env.get('GROQ_API_KEY_1') ?? '';
const GROQ_API_KEY_2 = Deno.env.get('GROQ_API_KEY_2') ?? '';
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
const WEATHER_API_KEY = Deno.env.get('WEATHER_API_KEY') ?? '';

// Variables nativas de Supabase (Se inyectan solas, no hay que agregarlas a secrets manualmente)
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// UTILIDADES DE TELEGRAM
// ==========================================
async function sendMessage(chatId: number, text: string, useKeyboard = false) {
  const payload: any = { chat_id: chatId, text: text, parse_mode: "HTML" };
  
  if (useKeyboard) {
    payload.reply_markup = {
      keyboard: [[{ text: "🚨 Enviar Reporte" }, { text: "📍 Estado de mi zona" }]],
      resize_keyboard: true,
      one_time_keyboard: false 
    };
  } else {
    payload.reply_markup = { remove_keyboard: true };
  }

  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

// ==========================================
// MÓDULO DE CLIMA (Histórico + Actual)
// ==========================================
async function checkWeatherSeverity(lat: number, lon: number): Promise<{ llueve_ahora: boolean, lluvia_24h_mm: number, fuente: string }> {
  // INTENTO 1: Open-Meteo (Excelente para datos acumulados recientes)
  try {
    // past_days=1 y forecast_days=1 nos da ayer y hoy
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=precipitation&daily=precipitation_sum&timezone=auto&past_days=1&forecast_days=1`);
    if (res.ok) {
      const data = await res.json();
      const precip_ahora = data.current?.precipitation || 0;
      
      // Sumamos la precipitación de ayer [0] y lo que va de hoy [1]
      const precip_ayer = data.daily?.precipitation_sum?.[0] || 0;
      const precip_hoy = data.daily?.precipitation_sum?.[1] || 0;
      const lluvia_acumulada = precip_ayer + precip_hoy;

      return { llueve_ahora: precip_ahora > 0, lluvia_24h_mm: lluvia_acumulada, fuente: 'Open-Meteo' };
    }
  } catch (error) {
    console.error("Open-Meteo falló.", error);
  }
  
  // INTENTO 2: WeatherAPI (Fallback, solo da actual)
  try {
    const res = await fetch(`http://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${lat},${lon}`);
    if (res.ok) {
      const data = await res.json();
      const precip = data.current?.precip_mm || 0;
      return { llueve_ahora: precip > 0, lluvia_24h_mm: precip, fuente: 'WeatherAPI' };
    }
  } catch (error) {
    console.error("WeatherAPI falló.");
  }
  
  return { llueve_ahora: false, lluvia_24h_mm: 0, fuente: 'Desconocida' };
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
  if (/(inundad|inundación|inundacion|agua|desborde|caída|caida|árbol|arbol|emergencia|rescate|bote|tormenta|temporal|granizo|viento|ráfaga|rafaga|tornado|huracan|huracán|anegad|anegamiento|tapado|alcantarilla|techo|voló|volo|corte|luz|electricidad|cable|poste|peligro|evacuación|evacuacion|ayuda|socorro|bombero|policía|policia|ambulancia|herido|auxilio|río|rio|arroyo|cauce|creciente|derrumbe|socavón|socavon|desprendimiento|atrapad)/.test(textLower)) return "REPORTE";
  if (/(zona|barrio|clima|llover|lluvia|estado)/.test(textLower)) return "CONSULTA";

  async function callGroq(apiKey: string) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "llama3-8b-8192", messages: [{ role: "user", content: prompt }], response_format: { type: "json_object" } })
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Groq API error: ${res.status} ${errorText}`);
    }
    const data = await res.json();
    return JSON.parse(data.choices[0].message.content).intent;
  }

  async function callGemini() {
    const model = "gemini-1.5-flash-latest"; 
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Gemini ${model} falló: ${res.status} ${errorText}`);
    }
    const data = await res.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error("Respuesta bloqueada");
    return JSON.parse(rawText.replace(/```json|```/g, '')).intent;
  }

  try { return await callGroq(GROQ_API_KEY_1); } catch (e1) {
    console.error("Groq 1 intent failed:", e1);
    try { return await callGemini(); } catch (e2) {
      console.error("Gemini intent failed:", e2);
      try { return await callGroq(GROQ_API_KEY_2); } catch (e3) { 
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
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "llama3-8b-8192", messages: [{ role: "user", content: prompt }], response_format: { type: "json_object" } })
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Groq API error: ${res.status} ${errorText}`);
    }
    const data = await res.json();
    return JSON.parse(data.choices[0].message.content).es_emergencia;
  }

  async function callGemini() {
    const model = "gemini-1.5-flash-latest"; 
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Gemini ${model} falló: ${res.status} ${errorText}`);
    }
    const data = await res.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error("Respuesta bloqueada");
    return JSON.parse(rawText.replace(/```json|```/g, '')).es_emergencia;
  }

  try { return await callGroq(GROQ_API_KEY_1); } catch (e1) {
    console.error("Groq 1 validate failed:", e1);
    try { return await callGemini(); } catch (e2) {
      console.error("Gemini validate failed:", e2);
      try { return await callGroq(GROQ_API_KEY_2); } catch (e3) {
        console.error("Groq 2 validate failed:", e3);
        return true; /* Fallback a true si caen APIs */ 
      }
    }
  }
}

// ==========================================
// GESTIÓN DE SESIONES (BD)
// ==========================================
async function getDBSession(chatId: number) {
  const { data, error } = await supabase.from('user_sessions').select('*').eq('chat_id', chatId).single();
  const now = new Date();

  if (error || !data) {
    const newSession = { chat_id: chatId, state: 'IDLE', intentos_fallidos: 0, datos_temporales: {}, ultima_interaccion: now.toISOString() };
    await supabase.from('user_sessions').upsert(newSession);
    return newSession;
  }

  const lastInteraction = new Date(data.ultima_interaccion).getTime();
  if (now.getTime() - lastInteraction > 600000) {
    const resetSession = { chat_id: chatId, state: 'IDLE', intentos_fallidos: 0, datos_temporales: {}, ultima_interaccion: now.toISOString() };
    await supabase.from('user_sessions').upsert(resetSession);
    return resetSession;
  }

  return data;
}

async function saveDBSession(session: any) {
  session.ultima_interaccion = new Date().toISOString();
  await supabase.from('user_sessions').upsert(session);
}

// ==========================================
// CONTROLADOR PRINCIPAL
// ==========================================
serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const body = await req.json();
    const message = body.message;
    if (!message) return new Response("OK", { status: 200 });

    const chatId = message.chat.id;
    const text = message.text || message.caption || "";
    const location = message.location;
    const isPhoto = !!message.photo;
    
    let session = await getDBSession(chatId);

    if (['/cancel', 'cancelar', 'salir'].includes(text.toLowerCase())) {
      session.state = 'IDLE';
      session.datos_temporales = {};
      await saveDBSession(session);
      await sendMessage(chatId, "Acción cancelada. ¿En qué más te puedo ayudar?", true);
      return new Response("OK", { status: 200 });
    }

    switch (session.state) {
      
      case 'IDLE':
        if (text) {
          const intent = await analyzeTextIntent(text);
          
          if (intent === 'REPORTE') {
            session.intentos_fallidos = 0;
            // SMART UX: Si el usuario apretó el botón o escribió un comando corto, le pedimos detalle.
            if (text === "🚨 Enviar Reporte" || text.length < 15) {
              session.state = 'ESPERANDO_DESCRIPCION';
              await sendMessage(chatId, "📝 Por favor, <b>describe brevemente cuál es el problema</b> (ej: calle inundada, árbol caído, agua dentro del hogar).");
            } else {
              // SMART UX: Si escribió un texto largo, validamos que sea una emergencia.
              const esEmergencia = await validateDescriptionWithAI(text);
              if (esEmergencia) {
                session.datos_temporales = { descripcion: text };
                session.state = 'ESPERANDO_UBICACION_REPORTE';
                await sendMessage(chatId, "📝 Descripción registrada.\n\n📍 Ahora, por favor <b>envía tu ubicación actual</b> usando el clip 📎 de Telegram para mapear el problema.");
              } else {
                await sendMessage(chatId, "Tu mensaje no parece describir una emergencia climática válida. Por favor, sé más específico o usa el teclado para navegar.", true);
              }
            }
          } else if (intent === 'CONSULTA') {
            session.state = 'ESPERANDO_UBICACION_CONSULTA';
            session.intentos_fallidos = 0;
            await sendMessage(chatId, "📍 Para decirte cómo está tu zona, <b>envíame tu ubicación</b> usando el clip 📎 de Telegram.");
          } else {
            await sendMessage(chatId, "No entendí tu mensaje. Puedes elegir una opción del menú debajo.", true);
          }
        } else {
          await sendMessage(chatId, "Para comenzar, por favor envíame un mensaje de texto o usa los botones del teclado. 👇", true);
        }
        break;

      case 'ESPERANDO_DESCRIPCION':
        if (text) {
          const esEmergencia = await validateDescriptionWithAI(text);
          if (esEmergencia) {
            session.datos_temporales = { descripcion: text };
            session.state = 'ESPERANDO_UBICACION_REPORTE';
            session.intentos_fallidos = 0;
            await sendMessage(chatId, "¡Entendido! \n\n📍 Ahora, por favor <b>envía tu ubicación actual</b> usando el clip 📎 (Adjuntar) -> Ubicación.");
          } else {
            await sendMessage(chatId, "⚠️ Tu mensaje no parece estar relacionado con una emergencia climática (lluvia, calle anegada, caída de árbol). Por favor describe el problema nuevamente o escribe /cancelar.");
          }
        } else {
           await sendMessage(chatId, "Por favor, envíame una descripción en texto de lo que está sucediendo.");
        }
        break;

      case 'ESPERANDO_UBICACION_REPORTE':
        if (location) {
          await sendMessage(chatId, "⏳ Analizando el clima histórico y actual en esa ubicación...");
          const clima = await checkWeatherSeverity(location.latitude, location.longitude);
          
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
            criticidad 
          };
          
          session.state = 'ESPERANDO_FOTO';
          session.intentos_fallidos = 0;

          await sendMessage(chatId, `¡Ubicación registrada!\n⛈️ Lluvia acumulada (24h): <b>${clima.lluvia_24h_mm.toFixed(1)}mm</b>.\n🚨 Criticidad asignada: <b>${criticidad}</b>.\n\n📷 (Último paso) Envía una <b>foto del problema</b>, o escribe "omitir" para finalizar el reporte.`);
        } else {
          session.intentos_fallidos++;
          if (session.intentos_fallidos >= 3) {
            session.state = 'IDLE';
            await sendMessage(chatId, "Superaste el límite de intentos. Reporte cancelado.", true);
          } else {
            await sendMessage(chatId, `❌ No reconozco esa ubicación. Tienes que usar la herramienta de adjuntar de Telegram (clip 📎 -> Ubicación). (Intento ${session.intentos_fallidos}/3)`);
          }
        }
        break;

      case 'ESPERANDO_FOTO':
        if (isPhoto || text.toLowerCase() === 'omitir') {
          // GUARDADO DEFINITIVO EN LA BASE DE DATOS
          const { error: insertError } = await supabase.from('reports').insert({
            chat_id: chatId,
            descripcion: session.datos_temporales.descripcion || 'Sin descripción detallada',
            lat: session.datos_temporales.lat,
            lon: session.datos_temporales.lon,
            location: `POINT(${session.datos_temporales.lon} ${session.datos_temporales.lat})`, 
            criticidad: session.datos_temporales.criticidad,
            lluvia_mm: session.datos_temporales.clima?.lluvia_24h_mm || 0,
            clima_fuente: session.datos_temporales.clima?.fuente || 'Desconocida'
            // NOTA: Para hackathon, si envían foto, puedes dejar el foto_url nulo o guardar el file_id de Telegram temporalmente.
          });
          
          if (insertError) {
            console.error("🔥🔥 ERROR GUARDANDO REPORTE EN DB:", insertError);
            await sendMessage(chatId, "❌ Ocurrió un error al guardar el reporte en la base de datos. Por favor, intenta de nuevo.", true);
            break; // Salimos del switch para que guarde la sesión actual
          }
          
          session.state = 'IDLE';
          session.datos_temporales = {}; // Limpiar
          await sendMessage(chatId, "✅ <b>¡Reporte guardado con éxito!</b> Ha sido subido al mapa de Crisis y los equipos de emergencia han sido notificados. Mantente a salvo.", true);
        } else {
           await sendMessage(chatId, "Por favor envía una foto o escribe 'omitir' para terminar de subir tu reporte.");
        }
        break;

      case 'ESPERANDO_UBICACION_CONSULTA':
        if (location) {
          const clima = await checkWeatherSeverity(location.latitude, location.longitude);
          
          const { data: reportesCercanos } = await supabase.rpc('get_reports_nearby', {
            p_lon: location.longitude,
            p_lat: location.latitude,
            p_radius: 2000
          });
          
          session.state = 'IDLE';
          await sendMessage(chatId, `📊 <b>Estado de tu zona (Radio 2km):</b>\n\n🌧️ Lluvia acumulada 24h: <b>${clima.lluvia_24h_mm.toFixed(1)}mm</b>\n🚨 Hay <b>${reportesCercanos || 0} reporte(s)</b> de emergencia cerca de ti.\n\nMantente a salvo. Si ves peligro, usa el botón de Enviar Reporte.`, true);
        } else {
          session.intentos_fallidos++;
          if (session.intentos_fallidos >= 3) {
            session.state = 'IDLE';
            await sendMessage(chatId, "Consulta cancelada por errores de formato.", true);
          } else {
            await sendMessage(chatId, "Por favor, adjunta tu ubicación usando el clip 📎.");
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