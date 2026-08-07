# Backend & Arquitectura del Sistema (Inú)

> Documentación exhaustiva de la infraestructura técnica del backend, esquema de base de datos en Supabase, arquitectura de las Edge Functions (Telegram/WhatsApp) y el consumo de datos desde el frontend (Mapa).

---

## 1. Visión General de la Arquitectura

El ecosistema de **Inú** funciona bajo una arquitectura orientada a eventos y procesamiento en el borde (Edge), conectando plataformas de mensajería con servicios de IA de inferencia ultra rápida y un mapa interactivo de Next.js.

1. **Supabase Edge Functions (Deno Runtime)**: Hospeda los webhooks de Telegram y WhatsApp, así como toda la máquina de estados conversacional, validaciones de seguridad y lógica de negocio (IA, Scoring).
2. **Supabase Postgres Database**: Almacenamiento central con capacidad geoespacial (PostGIS). Contiene las sesiones temporales de los bots y los reportes públicos de emergencias.
3. **Servicios Externos Integrados**:
   - **Groq LPU**: Procesamiento LLM de ultra baja latencia (Llama 3/Gemma) y transcripción de audios con Whisper-large-v3.
   - **Google Gemini**: Procesamiento multimodal (Gemini 2.5 Flash) para validación de imágenes con `thinkingBudget: 0`.
   - **WeatherAPI**: Consulta meteorológica en tiempo real según la coordenada GPS enviada por el usuario.
4. **Frontend (Next.js)**: Dashboard de administración y Mapa interactivo construido con React Leaflet que consume datos en tiempo real de Supabase.

---

## 2. Base de Datos en Supabase (Esquema Público)

El esquema relacional vive en Supabase bajo el esquema `public` y cuenta con Row Level Security (RLS) habilitado (lectura pública para `reports`, escritura exclusiva para `service_role` desde las Edge Functions).

### 2.1 Tabla `user_sessions`

Mantiene el estado de la máquina conversacional de cada usuario en su respectivo canal.

- **`chat_id`** (`bigint`, PK): ID del chat (Telegram ID o teléfono en WhatsApp).
- **`state`** (`text`, default `'IDLE'`):
  - `IDLE`: Esperando inicio.
  - `ESPERANDO_DESCRIPCION_REPORTE`: Esperando texto, audio o foto descriptiva.
  - `ESPERANDO_UBICACION_REPORTE`: Esperando PIN GPS.
  - `ESPERANDO_FOTO_REPORTE`: Esperando foto opcional final.
  - `ESPERANDO_UBICACION_CONSULTA`: Esperando PIN GPS para dar reporte del clima local.
- **`intentos_fallidos`** (`integer`, default `0`): Tolerancia a errores de input del usuario (máximo 3).
- **`datos_temporales`** (`jsonb`): State context (tipo_reporte, puntaje_parcial, es_audio, tiene_foto, foto_base64).
- **`ultima_interaccion`** (`timestamptz`): TTL de la sesión. Reseteado tras inactividad o comando de reinicio (`/cancelar`).

### 2.2 Tabla `reports`

Registro histórico de emergencias ingresadas y procesadas por los Bots.

- **Datos Básicos e Identificación**:
  - `id` (`uuid`, PK), `chat_id` (`bigint`, emisor), `created_at` (`timestamptz`).
- **Geometría y Ubicación**:
  - `lat`, `lon` (`double precision`).
  - `location` (`geometry(Point, 4326)`): Punto espacial en PostGIS.
- **Detalle del Incidente**:
  - `descripcion` (`text`): Texto dictado por el usuario, transcrito de un audio, o generado por IA desde una imagen.
  - `tipo` (`text`, enum): `'INUNDACION_URBANA'`, `'LLUVIAS_FUERTES'`, `'GRANIZO'`, `'ANEGAMIENTO_VIVIENDA'`.
  - `es_audio` (`boolean`): Flag estadístico (`true` si el reporte se originó mediante mensaje de voz).
- **Evidencia Gráfica**:
  - `foto_url` (`text`): Link público de Supabase Storage.
  - `foto_valida` (`boolean`): Confirmación visual de la IA.
- **Scoring y Clima**:
  - `puntaje_base` (`integer`): Suma del nivel de descripción, la lluvia acumulada y si hay foto validada.
  - `puntaje_descripcion`, `puntaje_foto`, `puntaje_clima` (`integer`): Puntos parciales.
  - `lluvia_mm` (`double precision`): Precipitaciones en las últimas 24h.
  - `clima_fuente` (`text`): Ej: "WeatherAPI".

---

## 3. Arquitectura de los Bots (Edge Functions)

Las funciones Serverless de Supabase actúan como webhooks expuestos a internet, manejando el protocolo de cada red social, y centralizando toda la lógica de validación en el directorio compartido `_shared`.

### 3.1 Directorio `_shared` (Core del Negocio)

- **`state_machine.ts`**: Motor central que implementa la interfaz `IMessengerAdapter` (agnóstico al canal). Evalúa el `state` del usuario y deriva el input (texto, audio, imagen, location) hacia el submódulo correspondiente.
- **`ai.ts`**: Integración con LLMs:
  - **Transcripción de Audio**: Envía los ArrayBuffer (WhatsApp/Telegram .ogg) crudos al modelo `whisper-large-v3-turbo` en Groq para pasarlos a texto en milisegundos.
  - **Identificación de Intención (`classifyIntent`)**: Deriva de manera inteligente entre Reporte vs Consulta usando Groq.
  - **Validación de Texto (`validateDescription`)**: Extrae el tipo de incidente y nivel descriptivo.
  - **Análisis Visual (`analyzePhoto`)**: Invocación multimodal a `gemini-2.5-flash` forzando respuesta JSON para dictaminar si una foto pertenece a una emergencia climática real.
  - _Resiliencia Automática_: Rotación de 2 Keys de Groq; fallback a Gemini Text ante códigos 429/401; auto-descubrimiento de modelos Groq `/v1/models` (ej: caída temporal de `llama3-8b-8192`).
- **`sessions.ts`**: Repositorio de acceso a BD (`supabase-js` con `service_role`).
- **`weather.ts`**: Fetch de precipitaciones a WeatherAPI mediante lat/lon con protección de timeout (5s).
- **`scoring.ts`**: Ecuaciones de confiabilidad. Desgaste del puntaje por tiempo (decay temporal: menos puntos a mayor `edadHoras` del reporte) y base de criticidad.

### 3.2 Webhooks (Adaptadores)

1. **`/telegram-bot`**: Recibe payloads de Telegram, descarga fotos en máxima resolución mediante `getFile`, y transfiere `voice` records usando buffers sin transformaciones base64 costosas.
2. **`/whatsapp-bot`**: Cumple con el Verification Challenge de Meta. Normaliza números de teléfono (remueve el 9 extra de Argentina `549`), maneja Media IDs llamando a la Graph API con Auth tokens.

---

## 4. Flujo y Consumo en el Mapa (Frontend)

El Frontend interactúa con esta base de datos a través del esquema de lectura de Supabase, incorporando cálculos en memoria en el momento de la visualización.

### 4.1 `services/reportService.ts`

Capa de abstracción (Repository) para el fetch de los reportes.

- Realiza consultas PostgREST apuntando a `reports`.
- Descarta reportes de antigüedad superior a `MAX_EDAD_REPORTE_HORAS` (por default, 24h).
- Traduce los resultados brutos SQL (`ReportDbRow`) a la interfaz limpia `Report` requerida por React.
- Extrae el punto lat/lon dinámicamente tolerando varias notaciones (GeoJSON, WKT string, columnas estáticas).
- **Scoring en tiempo real**: Calcula de manera dinámica el `puntajeReal` restándole importancia al reporte a medida que pasan las horas, invocando a `calcPuntajeReal()`.

### 4.2 `features/mapa/MapController.tsx`

Orquestador de cámara en el mapa Leaflet (`useMap`).

- Responsable de animar la vista del usuario (`fitBounds`) hacia los incidentes críticos que se seleccionen en el Sidebar.
- Implementa un algoritmo de clustering geoespacial en vivo: Si el usuario clickea un reporte (A), el controlador busca reportes cercanos a menos de `300 metros` (A ➔ B, B ➔ C) encadenándolos. Luego encuadra el mapa considerando toda esa zona afectada, y finalmente abre el Popup del reporte original de manera suavizada, evitando bugs visuales de Leaflet.
