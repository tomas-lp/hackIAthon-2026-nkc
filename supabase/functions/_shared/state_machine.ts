import { classifyIntent, validateDescription, analyzePhoto } from "./ai.ts";
import { fetchCurrentWeather } from "./weather.ts";
import { descripcionPuntos, climaPuntos } from "./scoring.ts";
import {
  getDBSession,
  saveDBSession,
  saveReport,
  uploadPhoto,
  BotSession,
} from "./sessions.ts";

export interface IMessengerAdapter {
  platform: "telegram" | "whatsapp";
  chatId: number;
  sendMessage(text: string): Promise<void>;
}

export interface IncomingMessage {
  text?: string;
  location?: { latitude: number; longitude: number };
  photo?: { base64: string; mimeType: string };
}

export async function processMessage(
  adapter: IMessengerAdapter,
  message: IncomingMessage
) {
  const { chatId } = adapter;
  const session: BotSession = await getDBSession(chatId);

  const text = message.text || "";
  const cleanText = text.trim().toLowerCase();

  // Lógica de cancelación global
  const palabrasCancelacion = [
    "cancelar",
    "salir",
    "reiniciar",
    "abortar",
    "/cancel",
    "cancel",
  ];
  if (palabrasCancelacion.includes(cleanText)) {
    session.state = "IDLE";
    session.datos_temporales = {};
    session.intentos_fallidos = 0;
    await saveDBSession(session);
    await adapter.sendMessage(
      "❌ Proceso cancelado. He reiniciado tu sesión. ¿Quieres reportar una emergencia o consultar el estado de tu zona?"
    );
    return;
  }

  switch (session.state) {
    case "IDLE":
      if (text === "/start" || text.toLowerCase() === "hola") {
        await adapter.sendMessage(
          "¡Hola! Soy Inú, tu asistente. ¿Quieres reportar una emergencia o consultar el estado de tu zona?"
        );
        break;
      }

      if (text) {
        const intent = await classifyIntent(text);
        if (intent === "REPORTE") {
          await adapter.sendMessage(
            "Has iniciado un reporte. Por favor, descríbeme la situación o envíame una foto."
          );
          session.state = "ESPERANDO_DESCRIPCION";
          session.datos_temporales = { tipo_reporte: "emergencia" };
        } else if (intent === "CONSULTA") {
          await adapter.sendMessage(
            "Para darte información del clima y estado de tu zona, por favor comparte tu ubicación."
          );
          session.state = "ESPERANDO_UBICACION_CONSULTA";
        } else {
          await adapter.sendMessage(
            "No entendí bien. Escribe 'reportar' para una emergencia o 'clima' para ver tu zona."
          );
        }
      } else {
        await adapter.sendMessage(
          "Por favor, envíame un mensaje de texto para empezar."
        );
      }
      break;

    case "ESPERANDO_DESCRIPCION":
      if (message.photo) {
        await adapter.sendMessage("⏳ Analizando la imagen...");
        const analisis = await analyzePhoto(
          message.photo.base64,
          message.photo.mimeType
        );

        if (analisis.foto_valida) {
          session.datos_temporales.descripcion = analisis.descripcion_breve;
          session.datos_temporales.nivel_agua = analisis.nivel_agua;
          session.datos_temporales.tiene_foto = true;
          session.datos_temporales.foto_base64 = message.photo.base64;
          session.datos_temporales.foto_mime = message.photo.mimeType;
          await adapter.sendMessage(
            "Recibí la foto. ¡Entendido! Por favor, envíame tu ubicación para registrar el reporte."
          );
          session.state = "ESPERANDO_UBICACION_REPORTE";
        } else {
          await adapter.sendMessage(
            "No pude identificar una inundación o problema en la foto. ¿Puedes describirlo en texto?"
          );
        }
      } else if (text) {
        const val = await validateDescription(text);
        session.datos_temporales.descripcion = text;
        session.datos_temporales.tipo = val.tipo;
        session.datos_temporales.nivel_descripcion = val.nivel_descripcion;
        session.datos_temporales.tiene_foto = false;
        await adapter.sendMessage(
          "Entendido. Ahora, por favor, envíame tu ubicación para registrar el reporte."
        );
        session.state = "ESPERANDO_UBICACION_REPORTE";
      }
      break;

    case "ESPERANDO_UBICACION_REPORTE":
      if (message.location) {
        await adapter.sendMessage(
          "⏳ Analizando el clima y procesando tu reporte..."
        );
        session.datos_temporales.lat = message.location.latitude;
        session.datos_temporales.lon = message.location.longitude;

        const weather = await fetchCurrentWeather(
          message.location.latitude,
          message.location.longitude
        );
        const precipMm = weather ? weather.precip_mm : 0;
        const climaFuente = weather ? "WeatherAPI" : "Desconocida";

        let fotoUrl = null;
        if (
          session.datos_temporales.tiene_foto &&
          session.datos_temporales.foto_base64 &&
          session.datos_temporales.foto_mime
        ) {
          fotoUrl = await uploadPhoto(
            chatId,
            session.datos_temporales.foto_base64 as string,
            session.datos_temporales.foto_mime as string
          );
        }

        const nivelDescripcion = String(
          session.datos_temporales.nivel_descripcion || "AGUA_CALLE"
        );
        const puntajeDescripcion = descripcionPuntos(nivelDescripcion);
        const puntajeFoto = session.datos_temporales.tiene_foto ? 5 : 0;
        const puntajeClima = climaPuntos(precipMm);
        const puntajeBase = puntajeDescripcion + puntajeFoto + puntajeClima;

        await saveReport({
          chat_id: chatId,
          descripcion: session.datos_temporales.descripcion as string,
          lat: message.location.latitude,
          lon: message.location.longitude,
          location: `POINT(${message.location.longitude} ${message.location.latitude})`,
          lluvia_mm: precipMm,
          clima_fuente: climaFuente,
          tipo: session.datos_temporales.tipo || "INUNDACION_URBANA",
          puntaje_base: puntajeBase,
          puntaje_descripcion: puntajeDescripcion,
          puntaje_foto: puntajeFoto,
          puntaje_clima: puntajeClima,
          foto_valida: !!session.datos_temporales.tiene_foto,
          foto_url: fotoUrl,
        });

        await adapter.sendMessage(
          `✅ ¡Reporte guardado con éxito! Puntaje de evidencia: ${puntajeBase} pts. Las autoridades ya están notificadas. Mantente a salvo.`
        );
        session.state = "IDLE";
        session.datos_temporales = {};
        session.intentos_fallidos = 0;
      } else {
        session.intentos_fallidos++;
        if (session.intentos_fallidos >= 3) {
          session.state = "IDLE";
          session.datos_temporales = {};
          session.intentos_fallidos = 0;
          await adapter.sendMessage(
            "Superaste el límite de intentos. Reporte cancelado."
          );
        } else {
          await adapter.sendMessage(
            `❌ No reconozco esa ubicación. Usa la herramienta de adjuntar ubicación. (Intento ${session.intentos_fallidos}/3)`
          );
        }
      }
      break;

    case "ESPERANDO_UBICACION_CONSULTA":
      if (message.location) {
        const weather = await fetchCurrentWeather(
          message.location.latitude,
          message.location.longitude
        );
        if (weather) {
          await adapter.sendMessage(
            `📊 Clima actual en tu zona: ${weather.temp_c}°C, ${weather.condition}. Lluvia: ${weather.precip_mm}mm.`
          );
        } else {
          await adapter.sendMessage(
            "No pude obtener el clima de tu zona en este momento."
          );
        }
        session.state = "IDLE";
        session.datos_temporales = {};
        session.intentos_fallidos = 0;
      } else {
        session.intentos_fallidos++;
        if (session.intentos_fallidos >= 3) {
          session.state = "IDLE";
          session.datos_temporales = {};
          session.intentos_fallidos = 0;
          await adapter.sendMessage(
            "Consulta cancelada por errores de formato."
          );
        } else {
          await adapter.sendMessage(
            "Para darte el clima necesito tu ubicación. Por favor, adjuntala."
          );
        }
      }
      break;

    default:
      session.state = "IDLE";
      session.datos_temporales = {};
      session.intentos_fallidos = 0;
      await adapter.sendMessage(
        "Reiniciando la conversación... ¿En qué te ayudo?"
      );
      break;
  }

  await saveDBSession(session);
}
