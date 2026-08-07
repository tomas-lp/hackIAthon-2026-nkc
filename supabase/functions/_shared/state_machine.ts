import { classifyIntent, validateDescription, analyzePhoto } from "./ai.ts";
import { fetchCurrentWeather } from "./weather.ts";
import { calculateTrustScore } from "./scoring.ts";
import { getSession, updateSession, saveReport } from "./sessions.ts";

export interface IMessengerAdapter {
  platform: "telegram" | "whatsapp";
  userId: string;
  sendMessage(text: string): Promise<void>;
}

export interface IncomingMessage {
  text?: string;
  location?: { latitude: number; longitude: number };
  photo?: { base64: string; mimeType: string }; // Foto ya descargada y en base64
}

export async function processMessage(
  adapter: IMessengerAdapter,
  message: IncomingMessage
) {
  const { platform, userId } = adapter;
  const { estado, contexto_reporte } = await getSession(userId, platform);

  const text = message.text || "";

  switch (estado) {
    case "IDLE":
      if (text === "/start" || text.toLowerCase() === "hola") {
        await adapter.sendMessage(
          "¡Hola! Soy Inú, tu asistente. ¿Quieres reportar una emergencia o consultar el estado de tu zona?"
        );
        return;
      }

      if (text) {
        const intent = await classifyIntent(text);
        if (intent === "REPORTE") {
          await adapter.sendMessage(
            "Has iniciado un reporte. Por favor, descríbeme la situación o envíame una foto."
          );
          await updateSession(userId, platform, "ESPERANDO_DESCRIPCION", {
            tipo_reporte: "emergencia",
          });
        } else if (intent === "CONSULTA") {
          await adapter.sendMessage(
            "Para darte información del clima y estado de tu zona, por favor comparte tu ubicación."
          );
          await updateSession(
            userId,
            platform,
            "ESPERANDO_UBICACION_CONSULTA",
            {}
          );
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
        await adapter.sendMessage("Analizando la imagen...");
        const analisis = await analyzePhoto(
          message.photo.base64,
          message.photo.mimeType
        );

        if (analisis.foto_valida) {
          contexto_reporte.descripcion = analisis.descripcion_breve;
          contexto_reporte.nivel_agua = analisis.nivel_agua;
          contexto_reporte.tiene_foto = true;
          await adapter.sendMessage(
            "Recibí la foto. ¡Entendido! Por favor, envíame tu ubicación para registrar el reporte."
          );
          await updateSession(
            userId,
            platform,
            "ESPERANDO_UBICACION",
            contexto_reporte
          );
        } else {
          await adapter.sendMessage(
            "No pude identificar una inundación o problema en la foto. ¿Puedes describirlo en texto?"
          );
        }
      } else if (text) {
        const val = await validateDescription(text);
        contexto_reporte.descripcion = text;
        contexto_reporte.tipo_problema = val.tipo;
        contexto_reporte.nivel_agua = val.nivel_descripcion;
        contexto_reporte.tiene_foto = false;
        await adapter.sendMessage(
          "Entendido. Ahora, por favor, envíame tu ubicación para registrar el reporte."
        );
        await updateSession(
          userId,
          platform,
          "ESPERANDO_UBICACION",
          contexto_reporte
        );
      }
      break;

    case "ESPERANDO_UBICACION":
      if (message.location) {
        contexto_reporte.lat = message.location.latitude;
        contexto_reporte.lon = message.location.longitude;

        const score = calculateTrustScore(contexto_reporte.tiene_foto, true);

        await saveReport({
          user_id: userId,
          platform,
          lat: contexto_reporte.lat,
          lon: contexto_reporte.lon,
          descripcion: contexto_reporte.descripcion,
          tipo_problema: contexto_reporte.tipo_problema,
          nivel_agua: contexto_reporte.nivel_agua,
          trust_score: score,
          estado: "NUEVO",
        });

        await adapter.sendMessage(
          "¡Reporte guardado con éxito! Las autoridades ya están notificadas."
        );
        await updateSession(userId, platform, "IDLE", {});
      } else {
        await adapter.sendMessage(
          "Por favor, usa la función de compartir ubicación de la aplicación."
        );
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
            `Clima actual en tu zona: ${weather.temp_c}°C, ${weather.condition}. Lluvia: ${weather.precip_mm}mm.`
          );
        } else {
          await adapter.sendMessage(
            "No pude obtener el clima de tu zona en este momento."
          );
        }
        await updateSession(userId, platform, "IDLE", {});
      } else {
        await adapter.sendMessage("Para darte el clima necesito tu ubicación.");
      }
      break;

    default:
      await updateSession(userId, platform, "IDLE", {});
      await adapter.sendMessage(
        "Reiniciando la conversación... ¿En qué te ayudo?"
      );
      break;
  }
}
