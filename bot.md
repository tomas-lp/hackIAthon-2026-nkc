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

## 3. Catálogo de Mensajes del Bot

A continuación, se listan **todas** las respuestas del bot según cada interacción y estado.

### 🏠 Interacción Inicial (IDLE)

**Comando:** `/start`, `hola`, `hi` o texto genérico sin contexto.
**Respuesta:**

> "¡Hola! Soy Inú, tu asistente frente a las inundaciones.
> Puedes reportar una emergencia climática o consultar cómo está tu zona eligiendo una opción del menú debajo."
> _(Botones/Menú: 🚨 Enviar Reporte / 📍 Estado de mi zona)_

**Comando:** El usuario envía texto sin sentido y no es un saludo.
**Respuesta:**

> "No entendí tu mensaje. Puedes elegir una opción del menú debajo."
> _(Botones/Menú: 🚨 Enviar Reporte / 📍 Estado de mi zona)_

---

### 🚨 Flujo de Reporte

**Acción:** El usuario toca "🚨 Enviar Reporte"
**Respuesta:**

> "📝 Por favor, **describe brevemente cuál es el problema** (ej: calle inundada, árbol caído, agua dentro del hogar)."

**Acción:** El usuario envía una descripción. La IA confirma que es emergencia y extrae con éxito una calle usando Fuzzy Matching.
**Respuesta:**

> "He registrado que la emergencia se ubica en _[Calle Corregida 123, Ciudad, Argentina]_. ¿Es correcta esta ubicación para ingresarla al mapa?"
> _(Botones/Menú: ✅ Sí, es correcta / ❌ No, usaré el GPS)_

**Acción:** El usuario envía una descripción pero la IA NO detecta una calle clara.
**Respuesta:**

> "¡Entendido!
>
> 📍 Ahora, por favor **envía tu ubicación actual** usando el clip 📎 de WhatsApp (o el botón adjuntar en Telegram) (Ubicación)."

**Acción:** El usuario envía una descripción pero la IA dice que NO es una emergencia climática.
**Respuesta:**

> "⚠️ Tu mensaje no parece estar relacionado con una emergencia climática (lluvia, calle anegada, caída de árbol). Por favor describe el problema nuevamente o escribe /cancelar."

**Acción:** El usuario confirma la dirección sugerida ("✅ Sí, es correcta").
**Respuesta:**

> "⏳ Buscando las coordenadas de [Dirección]..."
> _(Inmediatamente después)_
> "⏳ Analizando el clima histórico y actual en esa ubicación..."
> _(Inmediatamente después)_
> "¡Ubicación registrada!
> 🌧️ Lluvia acumulada (24h): [X]mm.
> 📝 Hemos clasificado la gravedad inicial del incidente.
>
> 📷 (Último paso) Envía una **foto del problema** para validar la emergencia, o escribe "omitir" para finalizar el reporte."

**Acción:** El usuario rechaza la dirección sugerida ("❌ No, usaré el GPS").
**Respuesta:**

> "Entendido. Por favor, comparta su ubicación exacta usando el botón del clip 📎 en WhatsApp y seleccione 'Ubicación'."

**Acción:** El usuario manda su Ubicación GPS por el mapa (Pin).
**Respuesta:**

> "⏳ Analizando el clima histórico y actual en esa ubicación..."
> _(Inmediatamente después)_
> "¡Ubicación registrada!
> 🌧️ Lluvia acumulada (24h): [X]mm.
> 📝 Hemos clasificado la gravedad inicial del incidente.
>
> 📷 (Último paso) Envía una **foto del problema** para validar la emergencia, o escribe "omitir" para finalizar el reporte."

**Acción:** El usuario envía foto o escribe "omitir".
**Respuesta:**

> _(Si envió foto: "⏳ Procesando tu imagen con IA...")_
> "✅ ¡Reporte guardado con éxito y registrado en el mapa!
> Nuestros sistemas han estimado la gravedad de la situación. Mantente a salvo."

**Error Frecuente:** La foto enviada no parece ser una inundación.
**Respuesta:**

> "⚠️ La imagen no parece ser de una emergencia válida. Se guardará el reporte de todas formas sin puntos extra por foto."

**Error Frecuente:** Falla al buscar coordenadas o ubicación irreconocible (se agotan los 3 intentos).
**Respuesta:**

> "Superaste el límite de intentos. Reporte cancelado."

---

### 📍 Flujo de Consulta Zonal

**Acción:** El usuario toca "📍 Estado de mi zona".
**Respuesta:**

> "📍 Para decirte cómo está tu zona, envíame tu ubicación usando el clip 📎 de WhatsApp (o el botón adjuntar en Telegram) (Ubicación)."

**Acción:** El usuario envía la ubicación GPS (Pin).
**Respuesta:**

> "📊 Estado de tu zona (Radio 2km):
>
> 🌧️ Lluvia acumulada 24h: [X]mm
> 🚨 Hay [X] reporte(s) cerca de ti.
>
> Mantente a salvo."

---

### 🛠️ Acciones Globales

**Acción:** El usuario envía audios ilegibles (Voz a Texto fallido).
**Respuesta:**

> "⚠️ No pude entender el audio. Por favor, escribime tu mensaje o intentá hablar un poco más claro."

**Acción:** Palabras de Cancelación (`cancelar`, `salir`, `/cancel`, `reiniciar`).
**Respuesta:**

> "❌ Proceso cancelado. He reiniciado tu sesión. ¿Quieres reportar una emergencia o consultar el estado de tu zona?"

**Fast-Track con Fotos directas:** Si el usuario manda una foto en estado IDLE, el bot responde:

> "⏳ Analizando la imagen..."
> _(Si la foto NO es de inundación)_ -> "La imagen no parece mostrar una inundación o problema relacionado. Por favor, describe el problema en texto o envía otra foto."
> _(Si la foto es válida, entra directamente al flujo de pedir ubicación)_ -> "¡Entendido!..." (Pide ubicación).
