import {
  classifyIntent,
  validateDescription,
  analyzePhoto,
  extractAddress,
} from "./ai.ts";
import { fetchCurrentWeather } from "./weather.ts";
import { geocodeAddress } from "./geocode.ts";
import { findBestStreetMatch } from "./fuzzy_match.ts";
import { descripcionPuntos, climaPuntos } from "./scoring.ts";
import { MAP_BASE_URL } from "./constants.ts";
import {
  getDBSession,
  saveDBSession,
  saveReport,
  uploadPhoto,
  countNearbyReports,
  BotSession,
} from "./sessions.ts";

function getPautasSeguridad(score: number): string {
  if (score >= 40) {
    return "🚨 *ALERTA MÁXIMA:* Desconecte la energía eléctrica.\nBusque un lugar elevado inmediatamente.\nNo intente caminar o conducir por zonas inundadas.";
  } else if (score >= 20) {
    return "⚠️ *PRECAUCIÓN ALTA:* Manténgase alejado de cables caídos.\nEvite salir si no es estrictamente necesario.\nEleve sus pertenencias de valor.";
  } else {
    return "ℹ️ *RECOMENDACIÓN:* Manténgase informado.\nEvite sacar la basura para no obstruir desagües y circule con precaución.";
  }
}

export interface IMessengerAdapter {
  platform: "telegram" | "whatsapp";
  chatId: number;
  phoneNumber?: string;
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
      "❌ Proceso cancelado.\nRecuerda que Inú está siempre disponible ante emergencias o consultas climáticas.\nPuedes escribir *hola* en cualquier momento para volver al menú principal."
    );
    return;
  }

  const attachLocationHint =
    adapter.platform === "whatsapp"
      ? "usando el clip 📎 de WhatsApp (Ubicación) o escribiendo tu dirección exacta"
      : "usando el botón de adjuntar 📎 (Ubicación) de Telegram o escribiendo tu dirección exacta";

  switch (session.state) {
    case "IDLE": {
      const welcomeMsg =
        "¡Hola! Soy Inú, tu asistente frente a las inundaciones.\nPuedes reportar una emergencia climática o consultar cómo está tu zona eligiendo una opción del menú debajo.\n\n💡 *Recuerda:* Puedes cancelar cualquier proceso en cualquier momento escribiendo 'cancelar'.";

      const sendWelcomeMenu = async () => {
        if (adapter.sendMenu) {
          await adapter.sendMenu(welcomeMsg, [
            { id: "REPORTE", title: "🚨 Enviar Reporte" },
            { id: "CONSULTA", title: "📍 Estado de mi zona" },
          ]);
        } else {
          await adapter.sendMessage(
            welcomeMsg + "\n\n🚨 Enviar Reporte\n📍 Estado de mi zona"
          );
        }
      };

      if (
        text === "/start" ||
        text.toLowerCase() === "hola" ||
        text.toLowerCase() === "hi"
      ) {
        await sendWelcomeMenu();
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
              "📝 Por favor, describe brevemente cuál es el problema.\nPor ejemplo: calle anegada, árbol caído o agua ingresando a las viviendas."
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
                const fotoUrl = await uploadPhoto(
                  chatId,
                  message.photo.base64,
                  message.photo.mimeType
                );
                session.datos_temporales = {
                  tiene_foto: true,
                  foto_ya_procesada: true,
                  fotoUrl: fotoUrl,
                  nivel_agua: analisis.nivel_agua || "NULO",
                  descripcion_imagen: analisis.descripcion_breve,
                };
                esEmergencia = true;
                finalDesc = text
                  ? text
                  : analisis.descripcion_breve || "Reporte desde imagen";
                val = await validateDescription(finalDesc);
                esEmergencia = esEmergencia || val.es_emergencia;
                await adapter.sendMessage(
                  "✅ La imagen fue procesada y validada correctamente por la IA."
                );
              } else {
                await adapter.sendMessage(
                  "⚠️ La imagen no parece mostrar una inundación o problema relacionado.\nPor favor, describe el problema en texto o envía otra foto."
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
              const direccionExtraida = await extractAddress(finalDesc);
              let direccionFinal = null;

              if (direccionExtraida) {
                const match = findBestStreetMatch(
                  direccionExtraida,
                  adapter.phoneNumber
                );
                if (match) {
                  direccionFinal = match.fullAddress;
                }
              }

              session.datos_temporales = {
                ...session.datos_temporales,
                tipo_reporte: "emergencia",
                descripcion: finalDesc,
                tipo: val.tipo,
                nivel_descripcion: val.nivel_descripcion,
                es_audio: message.esAudio || false,
                direccion_detectada: direccionFinal,
              };

              if (direccionFinal) {
                const msgConfirm = `He registrado que la emergencia se ubica en *${direccionFinal}*. ¿Es correcta esta ubicación para ingresarla al mapa?`;
                if (adapter.sendMenu) {
                  await adapter.sendMenu(msgConfirm, [
                    { id: "CONFIRMAR_DIR_SI", title: "✅ Sí, es correcta" },
                    { id: "CONFIRMAR_DIR_NO", title: "❌ No, usaré el GPS" },
                  ]);
                } else {
                  await adapter.sendMessage(
                    msgConfirm + "\n\nResponde 'Sí' o 'No'."
                  );
                }
                session.state = "CONFIRMANDO_DIRECCION";
              } else {
                await adapter.sendMessage(
                  `¡Entendido!\n\n📍 Ahora, por favor envía tu ubicación ${attachLocationHint}.`
                );
                session.state = "ESPERANDO_UBICACION_REPORTE";
              }
            } else {
              // No parece emergencia válida según IA, pero quiere reportar
              await adapter.sendMessage(
                "📝 Por favor, describe brevemente cuál es el problema.\nPor ejemplo: calle anegada, árbol caído o agua ingresando a las viviendas."
              );
              session.state = "ESPERANDO_DESCRIPCION_REPORTE";
              session.datos_temporales = { tipo_reporte: "emergencia" };
            }
          }
        } else if (intent === "CONSULTA") {
          await adapter.sendMessage(
            `📍 Para decirte cómo está tu zona, compártela ${attachLocationHint}.`
          );
          session.state = "ESPERANDO_UBICACION_CONSULTA";
        } else {
          // Si no se entiende el mensaje o es desconocido, directamente mandar el menú de saludo inicial
          await sendWelcomeMenu();
        }
      } else {
        await sendWelcomeMenu();
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
          const fotoUrl = await uploadPhoto(
            chatId,
            message.photo.base64,
            message.photo.mimeType
          );
          session.datos_temporales.tiene_foto = true;
          session.datos_temporales.foto_ya_procesada = true;
          session.datos_temporales.fotoUrl = fotoUrl;
          session.datos_temporales.descripcion_imagen =
            analisis.descripcion_breve;
          descripcionAI = text ? text : analisis.descripcion_breve;
          nivelAguaAI = analisis.nivel_agua || "NULO";
          esEmergencia = true;
          await adapter.sendMessage(
            "✅ La imagen fue procesada y validada correctamente por la IA."
          );
        } else {
          await adapter.sendMessage(
            "⚠️ La imagen no parece mostrar una inundación o problema relacionado.\nPor favor, describe el problema en texto o envía otra foto."
          );
          break;
        }
      }

      let direccionDetectadaAI = null;

      if (descripcionAI) {
        const val = await validateDescription(descripcionAI);
        esEmergencia = esEmergencia || val.es_emergencia;
        tipoAI = val.tipo;
        nivelDescAI = val.nivel_descripcion;
        if (esEmergencia) {
          const extracted = await extractAddress(descripcionAI);
          if (extracted) {
            const match = findBestStreetMatch(extracted, adapter.phoneNumber);
            if (match) {
              direccionDetectadaAI = match.fullAddress;
            }
          }
        }
      }

      if (!esEmergencia) {
        await adapter.sendMessage(
          "⚠️ Tu mensaje no parece estar relacionado con una emergencia climática (lluvia, calle anegada, caída de árbol).\nPor favor describe el problema nuevamente o escribe /cancelar."
        );
        break;
      }

      session.datos_temporales.descripcion = descripcionAI;
      session.datos_temporales.tipo = tipoAI;
      session.datos_temporales.nivel_descripcion = nivelDescAI;
      session.datos_temporales.es_audio = message.esAudio || false;
      session.datos_temporales.direccion_detectada = direccionDetectadaAI;
      if (session.datos_temporales.tiene_foto) {
        session.datos_temporales.nivel_agua = nivelAguaAI;
      }

      if (direccionDetectadaAI) {
        const msgConfirm = `He registrado que la emergencia se ubica en *${direccionDetectadaAI}*. ¿Es correcta esta ubicación para ingresarla al mapa?`;
        if (adapter.sendMenu) {
          await adapter.sendMenu(msgConfirm, [
            { id: "CONFIRMAR_DIR_SI", title: "✅ Sí, es correcta" },
            { id: "CONFIRMAR_DIR_NO", title: "❌ No, usaré el GPS" },
          ]);
        } else {
          await adapter.sendMessage(msgConfirm + "\n\nResponde 'Sí' o 'No'.");
        }
        session.state = "CONFIRMANDO_DIRECCION";
      } else {
        await adapter.sendMessage(
          `¡Entendido!\n\n📍 Ahora, por favor envía tu ubicación ${attachLocationHint}.`
        );
        session.state = "ESPERANDO_UBICACION_REPORTE";
      }
      break;
    }

    case "CONFIRMANDO_DIRECCION": {
      if (
        cleanText === "confirmar_dir_si" ||
        cleanText === "sí" ||
        cleanText === "si" ||
        cleanText === "✅ sí, es correcta"
      ) {
        await adapter.sendMessage(
          `⏳ Buscando las coordenadas de ${session.datos_temporales.direccion_detectada}...`
        );
        const coords = await geocodeAddress(
          session.datos_temporales.direccion_detectada as string
        );

        if (coords) {
          message.location = { latitude: coords.lat, longitude: coords.lon };
          session.state = "ESPERANDO_UBICACION_REPORTE";

          await adapter.sendMessage(
            "⏳ Analizando el clima histórico y actual en esa ubicación..."
          );
          session.datos_temporales.lat = coords.lat;
          session.datos_temporales.lon = coords.lon;

          const weather = await fetchCurrentWeather(coords.lat, coords.lon);
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
            const fotoUrl = session.datos_temporales.fotoUrl || null;
            const puntajeTotal = session.datos_temporales.puntaje_parcial + 5;

            const reportId = await saveReport({
              chat_id: chatId,
              descripcion: session.datos_temporales.descripcion as string,
              lat: coords.lat,
              lon: coords.lon,
              location: `POINT(${coords.lon} ${coords.lat})`,
              lluvia_mm: precipMm,
              clima_fuente: climaFuente,
              tipo: session.datos_temporales.tipo || "INUNDACION_URBANA",
              puntaje_base: puntajeTotal,
              puntaje_descripcion: puntajeDescripcion,
              puntaje_foto: 5,
              puntaje_clima: puntajeClima,
              foto_valida: true,
              foto_url: fotoUrl,
              adjunto_foto: true,
              descripcion_imagen:
                session.datos_temporales.descripcion_imagen || null,
              es_audio: session.datos_temporales.es_audio || false,
            });

            await adapter.sendMessage(
              `¡Ubicación registrada!\n🌧️ Lluvia acumulada en las últimas 24h: ${precipMm}mm.\n📝 Hemos clasificado la gravedad inicial del incidente.`
            );

            const pautas = getPautasSeguridad(puntajeTotal);
            await adapter.sendMessage(
              `✅ ¡Reporte guardado con éxito!\n\n🗺️ Podés ver tu reporte y el estado de tu zona en el mapa interactivo acá:\n${MAP_BASE_URL}${reportId}\n\n${pautas}\n\nMantente a salvo.`
            );
            session.state = "IDLE";
            session.datos_temporales = {};
            session.intentos_fallidos = 0;
          } else {
            await adapter.sendMessage(
              `¡Ubicación registrada!\n🌧️ Lluvia acumulada en las últimas 24h: ${precipMm}mm.\n📝 Hemos clasificado la gravedad inicial del incidente.\n\n📷 Como paso final opcional, puedes enviarme una foto del problema o escribir *omitir* para finalizar el reporte.`
            );
            session.state = "ESPERANDO_FOTO_REPORTE";
          }
        } else {
          await adapter.sendMessage(
            `❌ No fue posible verificar esa dirección exacta.\nPor favor, comparte tu ubicación ${attachLocationHint}.`
          );
          session.state = "ESPERANDO_UBICACION_REPORTE";
        }
      } else {
        // Asumimos "No" u otra cosa
        await adapter.sendMessage(
          `Entendido.\nPor favor, comparte tu ubicación ${attachLocationHint}.`
        );
        session.state = "ESPERANDO_UBICACION_REPORTE";
      }
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
          const fotoUrl = session.datos_temporales.fotoUrl || null;
          const puntajeTotal = session.datos_temporales.puntaje_parcial + 5;

          const reportId = await saveReport({
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
            descripcion_imagen:
              session.datos_temporales.descripcion_imagen || null,
            es_audio: session.datos_temporales.es_audio || false,
          });

          const pautas = getPautasSeguridad(puntajeTotal);
          await adapter.sendMessage(
            `✅ ¡Reporte guardado con éxito!\n\n🗺️ Podés ver tu reporte y el estado de tu zona en el mapa interactivo acá:\n${MAP_BASE_URL}${reportId}\n\n${pautas}\n\nMantente a salvo.`
          );
          session.state = "IDLE";
          session.datos_temporales = {};
          session.intentos_fallidos = 0;
        } else {
          await adapter.sendMessage(
            `¡Ubicación registrada!\n🌧️ Lluvia acumulada (24h): ${precipMm}mm.\n📝 Hemos clasificado la gravedad inicial del incidente.\n\n📷 (Último paso) Envía una *foto del problema* para validar la emergencia, o escribe "omitir" para finalizar el reporte.`
          );
          session.state = "ESPERANDO_FOTO_REPORTE";
        }
      } else if (text) {
        // Fallback: Si escriben una dirección en lugar de mandar el pin, pedir confirmación
        let direccionFinal = text;
        const match = findBestStreetMatch(text, adapter.phoneNumber);
        if (match) {
          direccionFinal = match.fullAddress;
        }

        session.datos_temporales.direccion_detectada = direccionFinal;

        const msgConfirm = `He registrado que la emergencia se ubica en *${direccionFinal}*. ¿Es correcta esta ubicación para ingresarla al mapa?`;
        if (adapter.sendMenu) {
          await adapter.sendMenu(msgConfirm, [
            { id: "CONFIRMAR_DIR_SI", title: "✅ Sí, es correcta" },
            { id: "CONFIRMAR_DIR_NO", title: "❌ No, usaré el GPS" },
          ]);
        } else {
          await adapter.sendMessage(msgConfirm + "\n\nResponde 'Sí' o 'No'.");
        }
        session.state = "CONFIRMANDO_DIRECCION";
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
            `❌ No reconozco esa ubicación.\nPor favor, comparte tu ubicación ${attachLocationHint}.\n\nIntento ${session.intentos_fallidos} de 3.`
          );
        }
      }
      break;
    }

    case "ESPERANDO_FOTO_REPORTE": {
      let puntajeFoto = 0;
      let fotoUrl = null;
      let fotoValida = false;
      let adjuntoFoto = false;
      if (message.photo) {
        adjuntoFoto = true;
        await adapter.sendMessage("⏳ Procesando tu imagen con IA...");
        const analisis = await analyzePhoto(
          message.photo.base64,
          message.photo.mimeType
        );

        session.datos_temporales.descripcion_imagen =
          analisis.descripcion_breve;
        fotoValida = analisis.foto_valida;

        if (analisis.foto_valida) {
          puntajeFoto = 5;
          fotoUrl = await uploadPhoto(
            String(chatId),
            message.photo.base64,
            message.photo.mimeType
          );
          fotoValida = true;
          await adapter.sendMessage(
            "✅ La imagen fue procesada y validada correctamente por la IA."
          );
        } else {
          await adapter.sendMessage(
            "⚠️ La imagen no parece mostrar una inundación o problema relacionado. Se guardará el reporte de todas formas sin la validación visual."
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

      const reportId = await saveReport({
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
        adjunto_foto: adjuntoFoto,
        descripcion_imagen: session.datos_temporales.descripcion_imagen || null,
        es_audio: session.datos_temporales.es_audio || false,
      });

      const pautas = getPautasSeguridad(puntajeTotal);
      await adapter.sendMessage(
        `✅ ¡Reporte guardado con éxito!\n\n🗺️ Podés ver tu reporte y el estado de tu zona en el mapa interactivo acá:\n${MAP_BASE_URL}${reportId}\n\n${pautas}\n\nMantente a salvo.`
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
          `📊 Estado actual en un radio de 2 kilómetros:\n\n🌧️ Lluvia acumulada en las últimas 24h: ${lluvia}mm\n🚨 Hay ${nearbyCount} reporte(s) cerca de ti.\n\nMantente a salvo.`
        );

        session.state = "IDLE";
        session.datos_temporales = {};
        session.intentos_fallidos = 0;
      } else if (text) {
        await adapter.sendMessage(
          `⏳ Buscando y corrigiendo las coordenadas de ${text}...`
        );

        let direccionFinal = text;
        const match = findBestStreetMatch(text, adapter.phoneNumber);
        if (match) {
          direccionFinal = match.fullAddress;
        }

        const coords = await geocodeAddress(direccionFinal);

        if (coords) {
          const weather = await fetchCurrentWeather(coords.lat, coords.lon);
          const nearbyCount = await countNearbyReports(
            coords.lat,
            coords.lon,
            2
          );
          const lluvia = weather ? weather.precip_mm : 0;

          let msj = `📊 Estado actual en un radio de 2 kilómetros`;
          if (match) msj += ` (aprox. desde ${direccionFinal}):`;
          else msj += `:`;

          await adapter.sendMessage(
            `${msj}\n\n🌧️ Lluvia acumulada en las últimas 24h: ${lluvia}mm\n🚨 Hay ${nearbyCount} reporte(s) cerca de ti.\n\nMantente a salvo.`
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
              "Superaste el límite de intentos. Consulta cancelada."
            );
          } else {
            await adapter.sendMessage(
              `❌ No fue posible verificar esa dirección.\nPor favor, comparte tu ubicación ${attachLocationHint}.\n\nIntento ${session.intentos_fallidos} de 3.`
            );
          }
        }
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
            `Para darte el clima necesito tu ubicación.\nPor favor, compártela ${attachLocationHint}.`
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
