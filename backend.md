# Backend & Arquitectura de Ingesta

> Documentación de la infraestructura técnica del backend, esquema de base de datos en Supabase y arquitectura de las Edge Functions para los bots de Telegram y WhatsApp.

---

## 1. Visión General de la Arquitectura

El backend de **Inú** combina dos componentes principales:

1. **Supabase Edge Functions (Deno Runtime)**: Hospeda la lógica de ingesta conversacional y procesamiento con IA mediante bots multicanal en Telegram y WhatsApp.
2. **Supabase Postgres Database**: Persistencia en tiempo real de sesiones conversacionales, reportes climáticos/emergencias y datos espaciales (PostGIS).

```text
                                 ┌────────────────────────┐
   [ Telegram Bot (BotFather) ] ─┤ Edge Function:         │
                                 │ /telegram-bot          │
                                 └───────────┬────────────┘
                                             │
                                             ▼
                                 ┌────────────────────────┐     ┌────────────────────────┐
                                 │ Módulo Compartido      │ ──► │ Modelos IA             │
                                 │ (_shared)              │     │ - Groq (LLaMA/Gemma)   │
                                 │ - state_machine.ts     │     │ - Gemini 2.5/3.5       │
                                 │ - ai.ts (Fallback/Auto)│     │ - WeatherAPI           │
                                 │ - sessions.ts          │     └────────────────────────┘
                                 │ - weather.ts / scoring │
                                 └───────────┬────────────┘
                                             │
                                             ▼
                                 ┌────────────────────────┐
   [ WhatsApp (Meta Cloud) ] ────┤ Edge Function:         │
                                 │ /whatsapp-bot          │
                                 └───────────┬────────────┘
                                             │
                                             ▼
                                 ┌────────────────────────┐
                                 │ Supabase Postgres BD   │
                                 │ - user_sessions        │
                                 │ - reports (PostGIS)    │
                                 └────────────────────────┘
```

---

## 2. Base de Datos en Supabase (Esquema Real)

El esquema relacional vive en Supabase bajo el esquema `public` y cuenta con Row Level Security (RLS) habilitado.

### 2.1 Tabla `user_sessions`

Mantiene el estado de la máquina de conversacional para cada usuario/canal.

- **`chat_id`** (`bigint`, Primary Key): Identificador único del chat (ID numérico en Telegram o hash numérico del teléfono en WhatsApp).
- **`state`** (`text`, default `'IDLE'`): Estado actual del flujo. Valores posibles:
  - `IDLE`: Esperando inicio o comandos.
  - `ESPERANDO_DESCRIPCION`: Esperando texto o foto del reporte.
  - `ESPERANDO_UBICACION_REPORTE`: Esperando ubicación GPS para confirmar el reporte.
  - `ESPERANDO_UBICACION_CONSULTA`: Esperando ubicación GPS para dar el estado del clima de la zona.
- **`intentos_fallidos`** (`integer`, default `0`): Contador para cancelar flujos atascados tras 3 intentos.
- **`datos_temporales`** (`jsonb`, default `'{}'`): Contexto temporal recopilado en el flujo (ej: tipo de reporte, descripción, nivel de agua, si tiene foto, coordenadas).
- **`ultima_interaccion`** (`timestamptz`, default `now()`): Marca temporal utilizada para expiración automática. Si pasan más de 10 minutos de inactividad, la sesión se reinicia a `IDLE`.

### 2.2 Tabla `reports`

Almacena los reportes validados e ingestados por los bots.

- **`id`** (`uuid`, Primary Key, default `gen_random_uuid()`): UUID del reporte.
- **`chat_id`** (`bigint`, NOT NULL): ID del chat emisor.
- **`lat`** (`double precision`, NOT NULL): Latitud GPS.
- **`lon`** (`double precision`, NOT NULL): Longitud GPS.
- **`location`** (`geometry(Point, 4326)` / USER-DEFINED): Punto espacial en formato PostGIS (`POINT(lon lat)`).
- **`descripcion`** (`text`): Texto del reporte o descripción generada automáticamente por IA en fotos.
- **`criticidad`** (`text`): Nivel o puntuación de criticidad (ej: `score:80`).
- **`tipo`** (`text`, CHECK Constraint):
  - `'INUNDACION_URBANA'`
  - `'LLUVIAS_FUERTES'`
  - `'GRANIZO'`
  - `'ANEGAMIENTO_VIVIENDA'`
- **`riesgo`** (`text`, CHECK Constraint): `'BAJO'`, `'MEDIO'`, `'ALTO'`, `'CRITICO'`.
- **`estado`** (`text`, CHECK Constraint): `'NUEVO'`, `'VALIDADO_CLIMA'`, `'PENDIENTE_VALIDACION'`, `'DESESTIMADO_SIN_ALERTA'`, `'DESESTIMADO_IRRELEVANTE'`.
- **`lluvia_mm`** (`double precision`): Milímetros acumulados registrados.
- **`clima_fuente`** (`text`): Proveedor del dato de clima (WeatherAPI / Open-Meteo).
- **`foto_url`** (`text`, opcional): Enlace a la imagen en Supabase Storage (`reports-photos`).
- **`foto_valida`** (`boolean`): `true` si la IA verificó que la foto corresponde a un daño o anegamiento real.
- **`created_at`** (`timestamptz`, default `now()`): Fecha de creación del reporte.

---

## 3. Arquitectura de Edge Functions (`supabase/functions/`)

Las funciones se despliegan en el Deno Runtime de Supabase y consumen el código unificado de `_shared/`.

### 3.1 Módulo Compartido (`_shared/`)

- **`state_machine.ts`**: Lógica conversacional agnóstica a la plataforma (`IMessengerAdapter`). Maneja transiciones de estado, invocación de IA, llamadas de clima, puntuación y persistencia.
- **`ai.ts`**: Integración resilience multi-proveedor:
  - **Estrategia de Fallback de Texto**: Groq API Key 1 ➔ Groq API Key 2 ➔ Gemini Text (`gemini-3.5-flash-lite`, `gemini-3.6-flash`).
  - **Autodescubrimiento Híbrido (Groq)**: Si el modelo configurado (ej: `gpt-oss-20b` / `gpt-oss-120b`) responde con error `404`/`400` (deprecado o fuera de servicio), consulta `/models` en vivo, detecta el mejor modelo disponible (Llama, Gemma, Qwen) y actualiza la caché dinámica.
  - **Visión Optimizada**: Invocación a `gemini-2.5-flash` para imágenes con `thinkingBudget: 0` y JSON estricto (`responseSchema`) para minimizar consumo de tokens y maximizar velocidad.
- **`sessions.ts`**: Manejo de consultas y guardado en `user_sessions` y `reports` mediante `@supabase/supabase-js`.
- **`weather.ts`**: Consulta a WeatherAPI con control de timeout (5s).
- **`scoring.ts`**: Cálculo del `calculateTrustScore` en base a evidencia aportada (foto + ubicación).
- **`constants.ts`**: Configuración de llaves, modelos preferidos, timeouts y patrones Regex para clasificación veloz.

### 3.2 Edge Function `telegram-bot`

- **Ruta/Webhook**: `/functions/v1/telegram-bot`
- **Secretos requeridos**: `BOT_TELEGRAM_TOKEN`, `GROQ_API_KEY_1`, `GROQ_API_KEY_2`, `GEMINI_API_KEY`, `WEATHER_API_KEY`.
- **Funcionamiento**: Recibe el payload del webhook de Telegram BotFather, descarga la foto de mayor resolución si existe (convirtiéndola a base64), implementa `IMessengerAdapter` y delega la ejecución a `processMessage()`.

### 3.3 Edge Function `whatsapp-bot`

- **Ruta/Webhook**: `/functions/v1/whatsapp-bot`
- **Secretos requeridos**: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_VERIFY_TOKEN`, `GROQ_API_KEY_1`, `GROQ_API_KEY_2`, `GEMINI_API_KEY`, `WEATHER_API_KEY`.
- **Funcionamiento**:
  - GET: Responde al challenge de verificación de Meta con `WHATSAPP_VERIFY_TOKEN`.
  - POST: Procesa mensajes entrantes de Meta Cloud API (`v25.0`), normaliza el número argentino (`549...` ➔ `54...`), descarga archivos multimedia de Meta Graph API si los hay, y responde vía POST a Meta.

---

## 4. Flujo de Ejecución Conversacional

1. **Ingreso**: El mensaje (texto, imagen o GPS) llega a la Edge Function (`telegram-bot` o `whatsapp-bot`).
2. **Carga de Sesión**: Se consulta `user_sessions` en Supabase por `chat_id`. Si pasaron >10 min, se resetea a `IDLE`.
3. **Procesamiento de Estado**:
   - `IDLE` ➔ Ejecuta clasificación rápida (Regex `REGEX_REPORTE`/`REGEX_CONSULTA`). Si falla Regex, consulta a Groq/Gemini (`classifyIntent`).
   - `ESPERANDO_DESCRIPCION` ➔ Si el usuario envía foto, analiza la imagen con Gemini 2.5 Flash (`analyzePhoto`). Si envía texto, valida con Groq (`validateDescription`).
   - `ESPERANDO_UBICACION_REPORTE` ➔ Al recibir las coordenadas GPS, calcula la criticidad, construye el punto PostGIS y persiste el registro en la tabla `reports`.
   - `ESPERANDO_UBICACION_CONSULTA` ➔ Al recibir coordenadas, obtiene el clima en tiempo real vía WeatherAPI y le responde al usuario.
4. **Respuesta & Guardado**: Se envía la respuesta al usuario mediante la API del canal correspondiente y se actualiza `user_sessions`.

---

## 5. Variables de Entorno en Supabase

Configuradas en Supabase Dashboard / Secretos:

```env
# Supabase
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=

# Telegram
BOT_TELEGRAM_TOKEN=

# WhatsApp (Meta Cloud API)
WHATSAPP_TOKEN=
WHATSAPP_PHONE_ID=
WHATSAPP_VERIFY_TOKEN=

# Modelos & APIs Externas
GROQ_API_KEY_1=
GROQ_API_KEY_2=
GEMINI_API_KEY=
WEATHER_API_KEY=
```

---

## 6. Comandos de Despliegue

Para desplegar las Edge Functions hacia Supabase:

```bash
# Desplegar todas las funciones (incluye empaquetado automático de _shared)
supabase functions deploy
```
