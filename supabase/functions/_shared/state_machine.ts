import { classifyIntent, validateDescription, analyzePhoto } from "./ai.ts";
import { fetchCurrentWeather } from "./weather.ts";
import { descripcionPuntos, climaPuntos } from "./scoring.ts";
import {
  getDBSession,
  saveDBSession,
  saveReport,
  uploadPhoto,
  countNearbyReports,
  BotSession,
} from "./sessions.ts";

export interface IMessengerAdapter {
  platform: "telegram" | "whatsapp";
  chatId: number;
  sendMessage(text: string): Promise<void>;
  sendMenu?(
    text: string,
    buttons: { id: string; title: string }[]
  ): Promise<void>;
}

export interface IncomingMessage {
  text?: string;
  location?: { latitude: number; longitude: number };
  photo?: { base64: string; mimeType: string };
  esAudio?: boolean;
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

  const attachLocationHint =
    adapter.platform === "whatsapp"
      ? "usando el clip 📎 de WhatsApp (Ubicación)"
      : "usando el botón de adjuntar 📎 (Ubicación) de Telegram";

  switch (session.state) {
    case "IDLE": {
      if (
        text === "/start" ||
        text.toLowerCase() === "hola" ||
        text.toLowerCase() === "hi"
      ) {
        const msg =
          "¡Hola! Soy Inú, tu asistente frente a las inundaciones.\nPuedes reportar una emergencia climática o consultar cómo está tu zona eligiendo una opción del menú debajo.";
        if (adapter.sendMenu) {
          await adapter.sendMenu(msg, [
            { id: "REPORTE", title: "🚨 Enviar Reporte" },
            { id: "CONSULTA", title: "📍 Estado de mi zona" },
          ]);
        } else {
          await adapter.sendMessage(
            msg + "\n\n🚨 Enviar Reporte\n📍 Estado de mi zona"
          );
        }
        break;
      }

      if (text || message.photo) {
        let intent = "CONSULTA";

        if (message.photo) {
          intent = "REPORTE";
        } else if (text) {
          intent = await classifyIntent(text);
        }

        if (intent === "REPORTE") {
          // Evitar fast-track si el usuario tocó el botón (payload directo)
          if (text === "🚨 Enviar Reporte" || text === "REPORTE") {
            await adapter.sendMessage(
              "📝 Por favor, **describe brevemente cuál es el problema** (ej: calle inundada, árbol caído, agua dentro del hogar)."
            );
            session.state = "ESPERANDO_DESCRIPCION_REPORTE";
            session.datos_temporales = { tipo_reporte: "emergencia" };
          } else {
            // Intentar Fast-Track
            let esEmergencia = false;
            let val = null;
            let analisis = null;
            let finalDesc = text;

            if (message.photo) {
              await adapter.sendMessage("⏳ Analizando la imagen...");
              analisis = await analyzePhoto(
                message.photo.base64,
                message.photo.mimeType
              );
              if (analisis.foto_valida) {
                session.datos_temporales = {
                  tiene_foto: true,
                  foto_ya_procesada: true,
                  foto_base64: message.photo.base64,
                  foto_mime: message.photo.mimeType,
                  nivel_agua: analisis.nivel_agua || "NULO",
                };
                esEmergencia = true;
                finalDesc = text
                  ? text
                  : analisis.descripcion_breve || "Reporte desde imagen";
                val = await validateDescription(finalDesc);
                esEmergencia = esEmergencia || val.es_emergencia;
              } else {
                await adapter.sendMessage(
                  "La imagen no parece mostrar una inundación o problema relacionado. Por favor, describe el problema en texto o envía otra foto."
                );
                session.state = "ESPERANDO_DESCRIPCION_REPORTE";
                session.datos_temporales = { tipo_reporte: "emergencia" };
                break;
              }
            } else {
              val = await validateDescription(text);
              esEmergencia = val.es_emergencia;
            }

            if (esEmergencia && val) {
              session.datos_temporales = {
                ...session.datos_temporales,
                tipo_reporte: "emergencia",
                descripcion: finalDesc,
                tipo: val.tipo,
                nivel_descripcion: val.nivel_descripcion,
                es_audio: message.esAudio || false,
              };
              await adapter.sendMessage(
                `¡Entendido!\n\n📍 Ahora, por favor **envía tu ubicación actual** ${attachLocationHint}.`
              );
              session.state = "ESPERANDO_UBICACION_REPORTE";
            } else {
              // No parece emergencia válida según IA, pero quiere reportar
              await adapter.sendMessage(
                "📝 Por favor, **describe brevemente cuál es el problema** (ej: calle inundada, árbol caído, agua dentro del hogar)."
              );
              session.state = "ESPERANDO_DESCRIPCION_REPORTE";
              session.datos_temporales = { tipo_reporte: "emergencia" };
            }
          }
        } else if (intent === "CONSULTA") {
          await adapter.sendMessage(
            `📍 Para decirte cómo está tu zona, envíame tu ubicación ${attachLocationHint}.`
          );
          session.state = "ESPERANDO_UBICACION_CONSULTA";
        } else {
          const errMsg =
            "No entendí tu mensaje. Puedes elegir una opción del menú debajo.";
          if (adapter.sendMenu) {
            await adapter.sendMenu(errMsg, [
              { id: "REPORTE", title: "🚨 Enviar Reporte" },
              { id: "CONSULTA", title: "📍 Estado de mi zona" },
            ]);
          } else {
            await adapter.sendMessage(
              errMsg + "\n\n🚨 Enviar Reporte\n📍 Estado de mi zona"
            );
          }
        }
      } else {
        await adapter.sendMessage(
          "Por favor, envíame un mensaje de texto para empezar."
        );
      }
      break;
    }

    case "ESPERANDO_DESCRIPCION_REPORTE": {
      let descripcionAI = text;
      let nivelAguaAI = "NULO";
      let esEmergencia = false;
      let tipoAI = "INUNDACION_URBANA";
      let nivelDescAI = "AGUA_CALLE";

      if (message.photo) {
        await adapter.sendMessage("⏳ Analizando la imagen...");
        const analisis = await analyzePhoto(
          message.photo.base64,
          message.photo.mimeType
        );

        if (analisis.foto_valida) {
          session.datos_temporales.tiene_foto = true;
          session.datos_temporales.foto_ya_procesada = true;
          session.datos_temporales.foto_base64 = message.photo.base64;
          session.datos_temporales.foto_mime = message.photo.mimeType;
          descripcionAI = text ? text : analisis.descripcion_breve;
          nivelAguaAI = analisis.nivel_agua || "NULO";
          esEmergencia = true;
        } else {
          await adapter.sendMessage(
            "La imagen no parece mostrar una inundación o problema relacionado. Por favor, describe el problema en texto o envía otra foto."
          );
          break;
        }
      }

      if (descripcionAI) {
        const val = await validateDescription(descripcionAI);
        esEmergencia = esEmergencia || val.es_emergencia;
        tipoAI = val.tipo;
        nivelDescAI = val.nivel_descripcion;
      }

      if (!esEmergencia) {
        await adapter.sendMessage(
          "⚠️ Tu mensaje no parece estar relacionado con una emergencia climática (lluvia, calle anegada, caída de árbol). Por favor describe el problema nuevamente o escribe /cancelar."
        );
        break;
      }

      session.datos_temporales.descripcion = descripcionAI;
      session.datos_temporales.tipo = tipoAI;
      session.datos_temporales.nivel_descripcion = nivelDescAI;
      session.datos_temporales.es_audio = message.esAudio || false;
      if (session.datos_temporales.tiene_foto) {
        session.datos_temporales.nivel_agua = nivelAguaAI;
      }

      await adapter.sendMessage(
        `¡Entendido!\n\n📍 Ahora, por favor **envía tu ubicación actual** ${attachLocationHint}.`
      );
      session.state = "ESPERANDO_UBICACION_REPORTE";
      break;
    }

    case "ESPERANDO_UBICACION_REPORTE": {
      if (message.location) {
        await adapter.sendMessage(
          "⏳ Analizando el clima histórico y actual en esa ubicación..."
        );
        session.datos_temporales.lat = message.location.latitude;
        session.datos_temporales.lon = message.location.longitude;

        const weather = await fetchCurrentWeather(
          message.location.latitude,
          message.location.longitude
        );
        const precipMm = weather ? weather.precip_mm : 0;
        const climaFuente = weather ? "WeatherAPI" : "Desconocida";
        session.datos_temporales.lluvia_mm = precipMm;
        session.datos_temporales.clima_fuente = climaFuente;

        const nivelDescripcion = String(
          session.datos_temporales.nivel_descripcion || "AGUA_CALLE"
        );
        const puntajeDescripcion = descripcionPuntos(nivelDescripcion);
        const puntajeClima = climaPuntos(precipMm);

        session.datos_temporales.puntaje_parcial =
          puntajeDescripcion + puntajeClima;

        if (session.datos_temporales.foto_ya_procesada) {
          let fotoUrl = null;
          if (
            session.datos_temporales.foto_base64 &&
            session.datos_temporales.foto_mime
          ) {
            fotoUrl = await uploadPhoto(
              chatId,
              session.datos_temporales.foto_base64 as string,
              session.datos_temporales.foto_mime as string
            );
          }
          const puntajeTotal = session.datos_temporales.puntaje_parcial + 5;

          await saveReport({
            chat_id: chatId,
            descripcion: session.datos_temporales.descripcion as string,
            lat: message.location.latitude,
            lon: message.location.longitude,
            location: `POINT(${message.location.longitude} ${message.location.latitude})`,
            lluvia_mm: precipMm,
            clima_fuente: climaFuente,
            tipo: session.datos_temporales.tipo || "INUNDACION_URBANA",
            puntaje_base: puntajeTotal,
            puntaje_descripcion: puntajeDescripcion,
            puntaje_foto: 5,
            puntaje_clima: puntajeClima,
            foto_valida: true,
            foto_url: fotoUrl,
            es_audio: session.datos_temporales.es_audio || false,
          });

          await adapter.sendMessage(
            `✅ ¡Reporte guardado con éxito y registrado en el mapa!\nNuestros sistemas han estimado la gravedad de la situación. Mantente a salvo.`
          );
          session.state = "IDLE";
          session.datos_temporales = {};
          session.intentos_fallidos = 0;
        } else {
          await adapter.sendMessage(
            `¡Ubicación registrada!\n🌧️ Lluvia acumulada (24h): ${precipMm}mm.\n📝 Hemos clasificado la gravedad inicial del incidente.\n\n📷 (Último paso) Envía una **foto del problema** para validar la emergencia, o escribe "omitir" para finalizar el reporte.`
          );
          session.state = "ESPERANDO_FOTO_REPORTE";
        }
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
    }

    case "ESPERANDO_FOTO_REPORTE": {
      let puntajeFoto = 0;
      let fotoUrl = null;
      let fotoValida = false;

      if (message.photo) {
        await adapter.sendMessage("⏳ Procesando tu imagen con IA...");
        const analisis = await analyzePhoto(
          message.photo.base64,
          message.photo.mimeType
        );

        if (analisis.foto_valida) {
          puntajeFoto = 5;
          fotoValida = true;
          fotoUrl = await uploadPhoto(
            chatId,
            message.photo.base64,
            message.photo.mimeType
          );
        } else {
          await adapter.sendMessage(
            "⚠️ La imagen no parece ser de una emergencia válida. Se guardará el reporte de todas formas sin puntos extra por foto."
          );
        }
      } else if (text && text.toLowerCase().includes("omitir")) {
        // Usuario omite foto
      } else {
        await adapter.sendMessage(
          "📷 Por favor envía una foto del problema o escribe 'omitir' para finalizar."
        );
        break;
      }

      const nivelDescripcion = String(
        session.datos_temporales.nivel_descripcion || "AGUA_CALLE"
      );
      const puntajeDescripcion = descripcionPuntos(nivelDescripcion);
      const puntajeClima = climaPuntos(
        session.datos_temporales.lluvia_mm as number
      );
      const puntajeTotal = puntajeDescripcion + puntajeClima + puntajeFoto;

      await saveReport({
        chat_id: chatId,
        descripcion: session.datos_temporales.descripcion as string,
        lat: session.datos_temporales.lat as number,
        lon: session.datos_temporales.lon as number,
        location: `POINT(${session.datos_temporales.lon} ${session.datos_temporales.lat})`,
        lluvia_mm: session.datos_temporales.lluvia_mm as number,
        clima_fuente: session.datos_temporales.clima_fuente as string,
        tipo: session.datos_temporales.tipo || "INUNDACION_URBANA",
        puntaje_base: puntajeTotal,
        puntaje_descripcion: puntajeDescripcion,
        puntaje_foto: puntajeFoto,
        puntaje_clima: puntajeClima,
        foto_valida: fotoValida,
        foto_url: fotoUrl,
        es_audio: session.datos_temporales.es_audio || false,
      });

      await adapter.sendMessage(
        `✅ ¡Reporte guardado con éxito y registrado en el mapa!\nNuestros sistemas han estimado la gravedad de la situación. Mantente a salvo.`
      );

      session.state = "IDLE";
      session.datos_temporales = {};
      session.intentos_fallidos = 0;
      break;
    }

    case "ESPERANDO_UBICACION_CONSULTA": {
      if (message.location) {
        const weather = await fetchCurrentWeather(
          message.location.latitude,
          message.location.longitude
        );
        const nearbyCount = await countNearbyReports(
          message.location.latitude,
          message.location.longitude,
          2
        );
        const lluvia = weather ? weather.precip_mm : 0;
        await adapter.sendMessage(
          `📊 Estado de tu zona (Radio 2km):\n\n🌧️ Lluvia acumulada 24h: ${lluvia}mm\n🚨 Hay ${nearbyCount} reporte(s) cerca de ti.\n\nMantente a salvo.`
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
            "Consulta cancelada por errores de formato."
          );
        } else {
          await adapter.sendMessage(
            "Para darte el clima necesito tu ubicación. Por favor, adjuntala."
          );
        }
      }
      break;
    }

    default: {
      session.state = "IDLE";
      session.datos_temporales = {};
      session.intentos_fallidos = 0;
      await adapter.sendMessage(
        "Reiniciando la conversación... ¿En qué te ayudo?"
      );
      break;
    }
  }

  await saveDBSession(session);
}
