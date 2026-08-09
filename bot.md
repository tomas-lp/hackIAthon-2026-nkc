# Documentación Técnica del Bot (Inú)

Este documento centraliza toda la lógica de funcionamiento del bot, las decisiones arquitectónicas clave y **todos los mensajes de respuesta** para mantener la consistencia en el futuro.

## 1. Arquitectura de Extracción de Calles (RAG y Fuzzy Matching)

**¡CRÍTICO! NO MODIFICAR ESTO PARA VOLVER AL MÉTODO ANTERIOR:**
Anteriormente, el bot sufría de "alucinaciones" al pedirle a la IA (Groq/Llama3) que detectara y corrigiera las calles mediante un prompt con listas gigantes. Esto provocaba que inventara intersecciones falsas, se confundiera de ciudad, o corrigiera mal los nombres (ej: "madre cerquera" lo dejaba igual, u omitía números).

### Solución actual (Funcional y Optimizada):

1. **Extracción Bruta (AI):** En `ai.ts`, la función `extractAddress` se limita **únicamente** a extraer la entidad cruda (la calle y la altura) de lo que dice el usuario, sin intentar corregirla ni usar referencias como locales (Chango Más). Ej: `"vivo en madre cerquera al 350"` -> `Madre cerquera 350`.
2. **Fuzzy Matching Local (RAG):** El string crudo se pasa a `fuzzy_match.ts`. Aquí, un algoritmo matemático de **Distancia de Levenshtein** busca esa calle dentro de nuestra base de datos local (`_shared/data.ts` que provienen de los CSV oficiales).
3. **Optimización por Prefijos (WhatsApp vs Telegram):**
   - **WhatsApp:** Conocemos el número del usuario (`sender`). Si el prefijo es `3624` / `3625`, la búsqueda matemática se realiza **solo** en el array de **Resistencia**. Si es `3794`, **solo** en **Corrientes**. Esto eleva la precisión al 99% y evita conflictos de calles con el mismo nombre.
   - **Telegram:** No expone el número del usuario por defecto (`phoneNumber: undefined`). En este caso, el bot busca en **ambas ciudades simultáneamente** y elige la ciudad cuya calle tenga el mejor puntaje de similitud matemática (menor distancia).

## 2. Flujo y Máquina de Estados (`state_machine.ts`)

El bot funciona con una máquina de estados que persiste la sesión del usuario en la base de datos a través de su `chatId` (hash del número en WA, o ID directo en TG).

### Estados Principales:

- `IDLE`: Esperando que el usuario inicie interacción.
- `ESPERANDO_DESCRIPCION_REPORTE`: Espera que el usuario relate su emergencia.
- `CONFIRMANDO_DIRECCION`: El bot detectó una dirección mediante AI y espera validación de texto (Sí/No).
- `ESPERANDO_UBICACION_REPORTE`: Espera un _Location Pin_ del mapa o una dirección exacta si falló la detección anterior.
- `ESPERANDO_FOTO_REPORTE`: Espera una imagen para validar y dar puntaje extra al reporte.
- `ESPERANDO_UBICACION_CONSULTA`: Espera un _Location Pin_ para devolver los datos meteorológicos y alertas de la zona.

---

## 3. Catálogo Completo de Respuestas y Mensajes del Bot

A continuación se presenta el catálogo estructurado de **todos** los mensajes de respuesta del bot, sus opciones/botones y sus contextos de activación:

### ⚙️ 1. Comandos Globales y Sistema

| Contexto / Disparador                                                       | Texto / Mensaje del Bot                                                                                                                                                              |
| :-------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Comando de Cancelación** (`cancelar`, `salir`, `reiniciar`, `/cancel`)    | `❌ Proceso cancelado. Recuerda que Inú está siempre disponible ante emergencias o consultas climáticas. Puedes escribir *hola* en cualquier momento para volver al menú principal.` |
| **Sesión Desconocida / Error Desconocido** (Fallback de Estado por defecto) | `Reiniciando la conversación... ¿En qué te ayudo?`                                                                                                                                   |

---

### 🏠 2. Estado Base: `IDLE` (Inicio y Saludo)

| Contexto / Disparador                                                                                       | Texto / Mensaje del Bot                                                                                                                                                                                                                                                        | Botones / Opciones                            |
| :---------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------- |
| **Cualquier inicio, saludo o mensaje no reconocido** (`/start`, `hola`, o cualquier texto fuera de reporte) | `¡Hola! Soy Inú, tu asistente frente a las inundaciones.<br>Puedes reportar una emergencia climática o consultar cómo está tu zona eligiendo una opción del menú debajo.<br><br>💡 *Recuerda:* Puedes cancelar cualquier proceso en cualquier momento escribiendo 'cancelar'.` | `🚨 Enviar Reporte`<br>`📍 Estado de mi zona` |

---

### 🚨 3. Flujo de Reportes: `ESPERANDO_DESCRIPCION_REPORTE`

| Contexto / Disparador                                             | Texto / Mensaje del Bot                                                                                                                                                           |
| :---------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **El usuario toca "🚨 Enviar Reporte"** o elige opción de reporte | `📝 Por favor, describe brevemente cuál es el problema. Por ejemplo: calle anegada, árbol caído o agua ingresando a las viviendas.`                                               |
| **Envía una imagen primero en IDLE o Descripción**                | `⏳ Analizando la imagen...`                                                                                                                                                      |
| **La imagen enviada no es de emergencia/inundación**              | `La imagen no parece mostrar una inundación o problema relacionado. Por favor, describe el problema en texto o envía otra foto.`                                                  |
| **El texto enviado NO es una emergencia climática**               | `⚠️ Tu mensaje no parece estar relacionado con una emergencia climática (lluvia, calle anegada o caída de árbol). Por favor describe el problema nuevamente o escribe /cancelar.` |

---

### 📍 4. Confirmación y Ubicación: `CONFIRMANDO_DIRECCION` y `ESPERANDO_UBICACION_REPORTE`

| Contexto / Disparador                                                  | Texto / Mensaje del Bot                                                                                                                                                                                                                                             | Botones / Opciones                            |
| :--------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :-------------------------------------------- |
| **Dirección detectada por IA** (Muestra calle hallada por Fuzzy Match) | `He registrado que la emergencia se ubica en *[Calle Corregida, Ciudad, Argentina]*. ¿Es correcta esta ubicación para ingresarla al mapa?`                                                                                                                          | `✅ Sí, es correcta`<br>`❌ No, usaré el GPS` |
| **No se detectó dirección en el texto**                                | `¡Entendido!<br><br>📍 Ahora, por favor envía tu ubicación [compartiendo tu ubicación GPS con el clip 📎 de WhatsApp o escribiendo tu dirección exacta / compartiendo tu ubicación GPS con el botón de adjuntar 📎 en Telegram o escribiendo tu dirección exacta].` | _Sin botones_                                 |
| **El usuario confirma la dirección** ("✅ Sí, es correcta")            | `⏳ Buscando las coordenadas de [Dirección]...`                                                                                                                                                                                                                     | _Procesamiento_                               |
| **Buscando Clima/Datos** (Paso automático)                             | `⏳ Analizando el clima histórico y actual en esa ubicación...`                                                                                                                                                                                                     | _Procesamiento_                               |
| **El usuario rechaza la dirección** ("❌ No, usaré el GPS")            | `Entendido. Por favor, comparte tu ubicación [compartiendo tu ubicación GPS... / Telegram...].`                                                                                                                                                                     | _Sin botones_                                 |
| **No se encontró la dirección confirmada en el mapa**                  | `❌ No fue posible verificar esa dirección exacta. Por favor, comparte tu ubicación [compartiendo tu ubicación GPS... / Telegram...].`                                                                                                                              | _Sin botones_                                 |
| **Intento fallido escribiendo dirección manual (1 y 2)**               | `❌ No fue posible verificar esa dirección. Por favor, comparte tu ubicación [compartiendo tu ubicación GPS... / Telegram...]. Intento X de 3.`                                                                                                                     | _Sin botones_                                 |
| **No reconoce adjunto / Formato inválido (1 y 2)**                     | `❌ No reconozco esa ubicación. Por favor, comparte tu ubicación [compartiendo tu ubicación GPS... / Telegram...]. Intento X de 3.`                                                                                                                                 | _Sin botones_                                 |
| **Límite de 3 intentos alcanzado**                                     | `Superaste el límite de intentos. Reporte cancelado.`                                                                                                                                                                                                               | _Resetea a IDLE_                              |

---

### 📷 5. Foto y Finalización: `ESPERANDO_FOTO_REPORTE`

| Contexto / Disparador                                   | Texto / Mensaje del Bot                                                                                                                                                                                                                                        |
| :------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Paso intermedio tras registrar ubicación**            | `¡Ubicación registrada!<br>🌧️ Lluvia acumulada en las últimas 24h: [X]mm.<br>📝 Hemos clasificado la gravedad inicial del incidente.<br><br>📷 Como paso final opcional, puedes enviarme una foto del problema o escribir *omitir* para finalizar el reporte.` |
| **El usuario envía una foto**                           | `⏳ Procesando tu imagen con IA...`                                                                                                                                                                                                                            |
| **La foto enviada no es de emergencia**                 | `⚠️ La imagen no parece ser de una emergencia válida. Se guardará el reporte de todas formas sin puntos extra por foto.`                                                                                                                                       |
| **Envía un texto que no es "omitir" ni foto**           | `📷 Por favor envía una foto del problema o escribe *omitir* para finalizar.`                                                                                                                                                                                  |
| **Reporte Guardado Exitosamente** (vía Foto o "omitir") | `✅ ¡Reporte guardado con éxito y registrado en el mapa!<br><br>[Pautas de Seguridad según Criticidad Calculada]<br><br>Mantente a salvo.`                                                                                                                     |

---

### 📊 6. Consulta de Zona: `ESPERANDO_UBICACION_CONSULTA`

| Contexto / Disparador                               | Texto / Mensaje del Bot                                                                                                                  |
| :-------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------- |
| **El usuario toca "📍 Estado de mi zona"**          | `📍 Para decirte cómo está tu zona, envíame tu ubicación [usando el clip 📎 de WhatsApp / botón adjuntar en Telegram] (Ubicación).`      |
| **Respuesta con datos de zona** (Al enviar Pin GPS) | `📊 Estado de tu zona (Radio 2km):<br><br>🌧️ Lluvia acumulada 24h: [X]mm<br>🚨 Hay [X] reporte(s) cerca de ti.<br><br>Mantente a salvo.` |
| **No adjuntó ubicación (Intento 1 y 2)**            | `Para darte el clima necesito tu ubicación. Por favor, adjuntala.`                                                                       |
| **Superó 3 intentos en consulta**                   | `Consulta cancelada por errores de formato.`                                                                                             |

---

### 🎙️ 7. Audios e Imprevistos

| Contexto / Disparador                                      | Texto / Mensaje del Bot                                                                             |
| :--------------------------------------------------------- | :-------------------------------------------------------------------------------------------------- |
| **Fallo de Transcripción de Audio** (Audio inaudible/roto) | `⚠️ No pude entender el audio. Por favor, escribime tu mensaje o intentá hablar un poco más claro.` |

---

## 4. Lecciones Críticas de IA (Prevención de Fallos)

Durante el desarrollo de la extracción automática de direcciones (Forward Geocoding), sufrimos problemas de parseo y sintaxis de los modelos LLM (Groq / Llama 3) que rompían el **Fast-Track**. Estas son las lecciones aprendidas para no volver a cometer esos errores:

### A. Sensibilidad Absoluta de Prompts en JSON Mode (Llama 3 / Groq)

Modelos rápidos y eficientes como Llama 3 fallan estrepitosamente si se les pasa un JSON template complejo con operadores lógicos o formato tipo Typescript (`true/false`, `"string" | null`).

- ❌ **El problema:** Al poner `"es_emergencia": true/false`, Llama 3 a veces genera JSON inválidos o decide unilateralmente que es `false` porque se confunde con las instrucciones adicionales.
- ✅ **La solución definitiva:** Escribir prompts extremadamente directos, separar las Tareas por números (1, 2, 3), y usar un bloque de ejemplo JSON estricto y real, sin condicionales:
  ```json
  {
    "es_emergencia": true,
    "tipo": "INUNDACION_URBANA",
    "nivel": "AGUA_CALLE",
    "direccion_detectada": "Padre Cerqueira y Salta"
  }
  ```

### B. Parseo Robusto de Booleanos en JavaScript

Al pedirle al LLM que responda en JSON un booleano, **jamás confíes ciegamente en el tipado final de JavaScript.**
El modelo puede alucinar y devolver:

- `"es_emergencia": true` (boolean)
- `"es_emergencia": "true"` (string)
- `"es_emergencia": "True"` (string capitalizado)

Si en el backend usamos `!!res.es_emergencia`, un string de `"false"` evaluará a `TRUE` (por ser un string no vacío). Y si usamos `res.es_emergencia === true`, un string `"true"` evaluará a `FALSE`.

✅ **Implementación a prueba de fallos utilizada en `ai.ts`:**

```typescript
es_emergencia: res.es_emergencia === true ||
  String(res.es_emergencia).toLowerCase() === "true";
```

Esto garantiza que tanto booleanos puros como strings capitalizados funcionen correctamente y no bloqueen reportes de emergencia genuinos.

---

## 5. Módulos Auxiliares del Backend

Para que el sistema sea integral, interactúa con varios submódulos clave que procesan la metadata del reporte:

### 📸 Análisis de Imágenes (`analyzePhoto`)

Se utiliza la API de Gemini (Vision) con un esquema de fallback optimizado de menor a mayor potencia (`gemini-3.5-flash-lite` -> `gemini-3.1-flash-image` -> `gemini-3.6-flash` -> `gemini-2.5-flash`) para no saturar con el modelo más pesado a menos que sea necesario.

- Evalúa la foto contra **4 reconocimientos explícitos de desastre**:
  1. `Calle Inundada/Anegamiento`
  2. `Lluvias torrenciales`
  3. `Caida de granizo`
  4. `Agua en vivienda`
- Analiza `foto_valida` (booleano), `nivel_agua` (ALTO, MEDIO, BAJO, NULO) y extrae una `descripcion_breve`.
- Si `foto_valida` es `true`, suma **+5 puntos** al score final del reporte y extrae el nivel de agua.
- Si falla un modelo de Gemini, el código cicla automáticamente a través de los fallbacks configurados en `GEMINI_MODELS.vision`.

### 🎙️ Transcripción de Audio (`transcribeAudio`)

Si el usuario envía una nota de voz, el audio se pasa por **Whisper (Groq)**.

- Intenta con `GROQ_API_KEY_1`. Si falla por rate limit o error, tiene un fallback automático a `GROQ_API_KEY_2`.

### 🌤️ Clima y Scoring (`weather.ts` y `scoring.ts`)

Cuando se obtiene una ubicación (por GPS o dirección confirmada):

1. **WeatherAPI:** Se consultan los milímetros de lluvia acumulada (`precip_mm`) en tiempo real para esa latitud/longitud exacta.
2. **Scoring Base:** El nivel de gravedad textual genera puntos (`EVACUADOS`=35, `AGUA_CASAS`=20, `NO_CIRCULAR`=10, otros=5).
3. **Scoring Clima:** La lluvia suma puntos extra (<10mm=0, <25mm=5, <50mm=10, >=50mm=20).
4. El puntaje final es la suma del texto + clima + foto.

### 🗺️ Geocodificación y Cercanía (`geocode.ts` y `sessions.ts`)

- **Geocodificación (Nominatim):** Si el bot deduce una calle pero el usuario no manda GPS, busca las coordenadas en Nominatim usando 3 estrategias en cascada.
  1. Ya incluye "Argentina": Busca exacto.
  2. Bounding Box estricto: Búsqueda restringida al cuadro lat/lon de Resistencia y Corrientes.
  3. Fallback nacional.
- **Reportes Cercanos (Haversine):** Cuando un usuario consulta el estado de su zona, el bot utiliza la fórmula de Haversine matemática pura (en `sessions.ts`) para contar cuántos reportes existen a un radio de **2 kilómetros** en las últimas 24 horas.

### ⏳ Manejo de Sesiones (`sessions.ts`)

Cada interacción se guarda en la base de datos `user_sessions`.

- **Timeouts:** Si un usuario deja la conversación inactiva por más de **1 hora** (3.600.000 milisegundos), la sesión se resetea a `IDLE` automáticamente. Esto evita que los usuarios queden atrapados en flujos a medias días después.

---

## 6. Arquitectura Crítica de Imágenes y Sesiones (Eager Upload)

**¡CRÍTICO! NO MODIFICAR ESTA LÓGICA DE SUBIDA DE IMÁGENES:**
Durante el desarrollo se experimentó un bug severo donde el bot pedía la foto dos veces y no guardaba ni la URL ni la descripción de la imagen en la base de datos final. Esto ocurrió por una combinación de factores técnicos limitantes entre Deno y Supabase.

### A. Eager Upload y Límites de Payload en Supabase

- ❌ **El problema:** Inicialmente, cuando el usuario mandaba una foto (Fast-Track), el bot intentaba guardar el string Base64 completo en `session.datos_temporales.foto_base64`. Una foto de WhatsApp en Base64 puede pesar más de 5MB. La API de Supabase (PostgREST) tiene un límite de payload de 1MB. Por lo tanto, `saveDBSession(session)` **fallaba silenciosamente**, perdiendo toda la memoria de la sesión (incluyendo la `descripcion_imagen` analizada por la IA).
- ✅ **La solución (Eager Upload):** Ahora, si la IA dictamina que la foto es válida, **se sube inmediatamente a Supabase Storage** in-situ. En `datos_temporales` solo se guarda la URL final (un string muy corto: `session.datos_temporales.fotoUrl`). De esta forma, la sesión JSON sigue siendo microscópica y no falla. Si el usuario cancela a mitad de camino, la foto queda "huérfana" en el bucket, un trade-off aceptable para solucionar el bug de sesión.

### B. Decodificación Base64 Óptima (Deno Edge Functions)

- ❌ **El problema 1 (CPU Timeout):** Convertir el Base64 a `Uint8Array` usando Javascript vainilla (un loop `atob` + `charCodeAt`) consumía demasiados ciclos de CPU, sobrepasando el límite de cómputo de Deno en Supabase Functions ("CPU limit exceeded") causando el crasheo de la API.
- ❌ **El problema 2 (Fallo de Blobs por Fetch):** Convertir el Base64 generando un Blob rápido usando `fetch("data:image/jpeg;base64,...")` provocaba incompatibilidades silenciosas con el SDK de Supabase Storage en Deno, generando que la subida falle (devolviendo `null`).
- ✅ **La solución:** Utilizar el decodificador nativo provisto por la librería estándar de Deno. Genera el `Uint8Array` necesario sin tocar los límites de CPU y es 100% compatible con Supabase Storage:
  ```typescript
  import { decode } from "https://deno.land/std@0.177.0/encoding/base64.ts";
  const bytes = decode(base64);
  // supabase.storage.upload(fileName, bytes, ...)
  ```

### C. Fallbacks de Visión Estrictos (Modelos Gemini)

La elección de los modelos de IA para analizar fotos está estrictamente ordenada en `constants.ts` por una razón:

- **`gemini-3.5-flash`** DEBE ser el modelo principal de visión.
- ❌ **No usar `gemini-3.5-flash-lite` como primera opción:** Al ser "lite", es deficiente en el razonamiento visual profundo en escenarios confusos (por ejemplo: identificar pisos marrones inundados por agua marrón). Esto causaba falsos negativos constantes y rechazaba emergencias reales.
- ❌ **No usar `gemini-2.5-flash`:** Google lo discontinuó para usuarios nuevos (devuelve `HTTP 404`).
- ❌ **No usar `gemini-3.1-flash-image`:** Consume un tier de límite distinto que rápidamente arroja `HTTP 429 Quota Exceeded`.
