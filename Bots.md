# Documentación del Bot y Máquina de Estados (Inú)

Este documento detalla todos los flujos posibles del bot, cómo funcionan las integraciones con IA (Groq/Gemini), los mensajes exactos que responde el bot y las lecciones aprendidas críticas para evitar romper el flujo de la conversación (regresiones).

---

## 1. Flujos Posibles del Bot y Mensajes (State Machine)

La lógica central reside en `supabase/functions/_shared/state_machine.ts`. El usuario siempre se encuentra en uno de los siguientes estados:

### `IDLE` (Estado Base / Inicio)

Es el estado por defecto donde el bot espera que el usuario inicie interacción.

- **Comandos globales:** `/start`, `hola`, `hi`
  - **Mensaje del bot:** _"¡Hola! Soy Inú, tu asistente frente a las inundaciones. Puedes reportar una emergencia climática o consultar cómo está tu zona eligiendo una opción del menú debajo."_ (Opciones: 🚨 Enviar Reporte / 📍 Estado de mi zona).
- **Comandos de cancelación:** `/cancel`, `cancelar`, `salir`
  - **Mensaje del bot:** _"❌ Proceso cancelado. He reiniciado tu sesión. ¿Quieres reportar una emergencia o consultar el estado de tu zona?"_
- **Interacciones libres (Fast-Track activado):** Si el usuario envía un texto, foto o audio de la nada:
  1.  Si la IA determina `es_emergencia: true` y extrae dirección:
      - **Mensaje del bot:** _"He registrado que la emergencia se ubica en [Dirección]. ¿Es correcta esta ubicación para ingresarla al mapa?"_ (Opciones: ✅ Sí, es correcta / ❌ No, usaré el GPS)
  2.  Si la IA determina `es_emergencia: true` pero NO hay dirección:
      - **Mensaje del bot:** _"¡Entendido! 📍 Ahora, por favor **envía tu ubicación actual** usando el clip 📎 de WhatsApp (Ubicación)."_
  3.  Si la IA determina `es_emergencia: false` (falla el Fast-Track):
      - **Mensaje del bot:** _"📝 Por favor, **describe brevemente cuál es el problema** (ej: calle inundada, árbol caído, agua dentro del hogar)."_

### `ESPERANDO_DESCRIPCION_REPORTE`

El usuario debe escribir o mandar audio describiendo la emergencia.

- Si `es_emergencia: true` y hay dirección: Pasa a `CONFIRMANDO_DIRECCION` (mensaje igual al anterior).
- Si `es_emergencia: true` y NO hay dirección: Pasa a `ESPERANDO_UBICACION_REPORTE` (mensaje igual al anterior).
- Si `es_emergencia: false`:
  - **Mensaje del bot:** _"⚠️ Tu mensaje no parece estar relacionado con una emergencia climática (lluvia, calle anegada, caída de árbol). Por favor describe el problema nuevamente o escribe /cancelar."_

### `CONFIRMANDO_DIRECCION`

Se le pregunta al usuario si la dirección detectada por la IA es correcta.

- **Respuesta "Sí" / "CONFIRMAR_DIR_SI":**
  - **Mensaje del bot (temporal):** _"⏳ Buscando las coordenadas de [Dirección]..."_
  - **Mensaje del bot (temporal 2):** _"⏳ Analizando el clima histórico y actual en esa ubicación..."_
  - Si sale bien: _"¡Ubicación registrada! 🌧️ Lluvia acumulada (24h): Xmm. 📝 Hemos clasificado la gravedad inicial del incidente. 📷 (Último paso) Envía una **foto del problema** para validar la emergencia, o escribe 'omitir' para finalizar el reporte."_
  - Si falla la búsqueda: _"❌ No fue posible verificar esa dirección exacta en la zona metropolitana. Por favor, comparta su ubicación exacta usando el botón del clip 📎 en WhatsApp y seleccione 'Ubicación'."_
- **Respuesta "No" / Cualquier otra:**
  - **Mensaje del bot:** _"Entendido. Por favor, comparta su ubicación exacta usando el botón del clip 📎 en WhatsApp y seleccione 'Ubicación'."_

### `ESPERANDO_UBICACION_REPORTE`

El bot necesita coordenadas para guardar el reporte.

- **Envío de Ubicación GPS (Clip 📎):**
  - **Mensaje del bot:** _"⏳ Analizando el clima histórico y actual en esa ubicación..."_
  - Luego pasa a `ESPERANDO_FOTO_REPORTE` (mensaje igual al de Confirmar Dirección exitoso).
- **Envío de Texto (Fallback manual):** Si no envía un PIN de mapa, sino un texto "Calle Falsa 123", el bot intenta buscar las coordenadas manualmente.
  - Si falla: _"❌ No fue posible verificar esa dirección. Por favor, comparta su ubicación exacta usando el botón del clip 📎 en WhatsApp y seleccione 'Ubicación'. (Intento X/3)"_
  - Si falla 3 veces: _"Superaste el límite de intentos. Reporte cancelado."_

### `ESPERANDO_FOTO_REPORTE`

Último paso opcional para ganar +5 puntos de score.

- **Envía foto (válida):**
  - **Mensaje del bot (temporal):** _"⏳ Procesando tu imagen con IA..."_
  - **Mensaje final:** _"✅ ¡Reporte guardado con éxito y registrado en el mapa! Nuestros sistemas han estimado la gravedad de la situación. Mantente a salvo."_
- **Envía foto (inválida):**
  - **Mensaje intermedio:** _"⚠️ La imagen no parece ser de una emergencia válida. Se guardará el reporte de todas formas sin puntos extra por foto."_
  - **Mensaje final:** (Mismo de guardado con éxito).
- **Texto "Omitir":** (Mismo de guardado con éxito).
- **Texto irrelevante:** _"📷 Por favor envía una foto del problema o escribe 'omitir' para finalizar."_

### `ESPERANDO_UBICACION_CONSULTA`

Ruta para usuarios que querían saber "El estado de su zona".

- **Envío de Ubicación GPS (Clip 📎):**
  - **Mensaje del bot:** _"📊 Estado de tu zona (Radio 2km): 🌧️ Lluvia acumulada 24h: Xmm 🚨 Hay X reporte(s) cerca de ti. Mantente a salvo."_

---

## 2. Lecciones Críticas de IA (Prevención de Fallos)

Durante el desarrollo de la extracción automática de direcciones (Forward Geocoding), sufrimos la rotura del **Fast-Track** debido a problemas de parseo y sintaxis de los modelos LLM (Groq / Llama 3).

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

### C. Detección Inteligente de Referencias

Nominatim (el mapa) sufre cuando las personas dicen _"vivo entre calle X e Y"_. Para eso, la IA de validación (`ai.ts`) ahora tiene reglas estrictas en el prompt:

- Debe convertir entrecalles a formato intersección (`Calle X y Calle Y`).
- Debe extraer nombres puros de locales si hay referencias (`Hospital Escuela`, `Chango Mas`), eliminando preposiciones como _"enfrente del"_ o _"atrás de"_.
- Debe corregir errores comunes de transcripción de Whisper (ej. "Ezequiela" a "Cerqueira").

Esto hace que la geocodificación final sea altamente exitosa dentro del **Bounding Box** fijado para Corrientes y Resistencia, cuyas 3 estrategias de fallback (estricto, aproximado y global) aseguran precisión total.
