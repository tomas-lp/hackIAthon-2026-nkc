# Backend — Crisis-Graph

> Motor de ingesta y verificación de reportes ciudadanos durante emergencias hídricas (Corrientes/Chaco), con NER vía LLM, verificación climática, validación por corroboración y mapa de calor geoespacial.

Este documento es la referencia técnica del backend. Las decisiones de diseño siguen los principios de _Clean Code_ (Robert C. Martin): nombres que revelan intención, funciones pequeñas que hacen una sola cosa, manejo de errores explícito, y código que se lee como una narración del dominio del problema, no como una traducción literal de la infraestructura.

---

## 1. Filosofía del proyecto

Antes de la arquitectura, las reglas que gobiernan cómo escribimos código acá, tomadas directamente de Clean Code:

- **Nombres que revelan intención.** `procesarMensaje()` no dice nada. `extraerEntidadesDeReporte()` sí. Si necesitás un comentario para explicar qué hace una función, el nombre está mal elegido.
- **Funciones pequeñas, y de un solo nivel de abstracción.** Una función que geocodifica no debería también insertar en la base. Si una función tiene un `y` en la descripción ("valida y guarda"), son dos funciones.
- **Los errores son parte del flujo, no un afterthought.** No devolvemos `null` ni tragamos excepciones en silencio. Cada punto de falla externa (API de Groq, Open-Meteo, Supabase) tiene su propio manejo explícito.
- **DRY sin sobre-ingeniería.** Para un hackathon: preferimos código duplicado y legible por sobre una abstracción prematura que nadie del equipo entienda a las 4am.
- **El código se escribe una vez y se lee cien.** Priorizamos claridad sobre "elegancia" o líneas ahorradas.

---

## 2. Idea general y objetivos

Durante inundaciones, la información oficial suele llegar fragmentada y con demora, pero los vecinos ya saben en tiempo real lo que pasa en su barrio. Crisis-Graph centraliza esos reportes desde un bot de Telegram, los interpreta con IA, los cruza con datos climáticos y de corroboración entre usuarios, y arma un mapa de calor en tiempo real para que organismos de emergencia prioricen recursos.

El sistema resuelve tres problemas:

1. **Centralizar** reportes ciudadanos en un único canal simple de usar.
2. **Reducir falsas alarmas** mediante validaciones automáticas (no eliminando reportes dudosos, sino asignándoles un nivel de confianza).
3. **Visualizar** la situación provincial en tiempo real mediante un mapa interactivo.

---

## 3. Arquitectura general

```
[ Ciudadano ] ──texto + ubicación──▶ [ Bot de Telegram ] ──webhook──▶ [ API Route: /api/ingest ]
                                                                                │
                                                                                ▼
                                                          [ Paso 1: extraerEntidades() ]
                                                          Groq API (Llama-3) → JSON estructurado
                                                                                │
                                                                                ▼
                                                          [ Paso 2: verificarFrecuenciaDeUsuario() ]
                                                          Rate limit por telegram_id (30 min)
                                                                                │
                                                                                ▼
                                                          [ Paso 3: verificarConClima() ]
                                                          Open-Meteo API → confirma/no confirma
                                                                                │
                                                                                ▼
                                                          [ Paso 4: calcularNivelDeConfianza() ]
                                                          Corrobora contra reportes cercanos (radio + usuarios distintos)
                                                                                │
                                                                                ▼
                                                          [ Paso 5: guardarReporte() ]
                                                          Supabase (Postgres + PostGIS)
                                                                                │
                                                                                ▼
                                                          [ Frontend Next.js ]
                                                          Mapa de calor + panel de control
                                                          (Supabase Realtime subscription)
```

**Decisión de diseño:** el pipeline es una secuencia de funciones puras encadenadas, no un grafo de agentes (LangGraph). Para el alcance de un hackathon, un flujo secuencial es más fácil de debuggear en vivo y de explicarle al jurado en 30 segundos. Si el proyecto crece post-hackathon, ahí se evalúa migrar a un orquestador.

**Ingesta por webhook, no polling:** el bot de Telegram recibe los mensajes mediante un webhook apuntando directo a la API Route de Next.js — no hace falta mantener un proceso separado escuchando conexiones.

---

## 4. Stack

| Capa                   | Tecnología                                          | Motivo                                                                     |
| ---------------------- | --------------------------------------------------- | -------------------------------------------------------------------------- |
| Frontend               | Next.js (App Router) + React + Tailwind + shadcn/ui | Interfaz clara y rápida, mismo proyecto que el backend                     |
| Backend                | Next.js API Routes (Node)                           | No hace falta Express/NestJS aparte; recibe el webhook de Telegram directo |
| Base de datos          | Supabase (Postgres + PostGIS)                       | Geoespacial nativo + Realtime + Auth si hace falta                         |
| Extracción NER         | Groq API (Llama-3, structured output)               | Latencia mínima, clave para demo en vivo                                   |
| Verificación climática | Open-Meteo (gratuita, sin API key)                  | Cero fricción de setup en el tiempo que tienen                             |
| Mapa interactivo       | React Leaflet                                       | Marcadores + mapa de calor por concentración de reportes                   |
| Bot de ingesta         | Telegraf (Node) o python-telegram-bot               | Definir según quién del equipo lo programa                                 |

---

## 5. Estructura de carpetas

```
/app
  /api
    /ingest
      route.ts              → único punto de entrada del webhook de Telegram
  /mapa
    page.tsx                → vista del mapa de calor
  /panel
    page.tsx                → dashboard: estadísticas, últimos incidentes, filtros
/lib
  /pipeline
    extraerEntidades.ts
    verificarFrecuenciaDeUsuario.ts
    verificarConClima.ts
    calcularNivelDeConfianza.ts
    guardarReporte.ts
    procesarReporteCiudadano.ts   → orquesta los 5 pasos, nada más
  /gazetteer
    corrientesResistencia.json
    buscarReferenciaLocal.ts
  /clients
    groqClient.ts
    supabaseClient.ts
    openMeteoClient.ts
/types
  reporte.ts
  usuario.ts
  entidadesExtraidas.ts
```

**Por qué esta estructura:** cada archivo en `/pipeline` corresponde a exactamente un paso del diagrama de arquitectura. `procesarReporteCiudadano.ts` es la única función que conoce el orden de los pasos — el resto no sabe nada del flujo completo, solo hace su parte. Esto es el principio de responsabilidad única aplicado a nivel de archivo, no solo de función.

---

## 6. Modelo de datos (Supabase / PostgreSQL + PostGIS)

```sql
create extension if not exists postgis;

create table usuarios (
  id uuid primary key default gen_random_uuid(),
  telegram_id text not null unique,
  ultimo_reporte_en timestamptz,        -- para el rate limit de 30 min
  creado_en timestamptz not null default now()
);

create table reportes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios(id),
  texto_original text not null,
  tipo_incidente text not null,          -- 'inundacion', 'arbol_caido', 'corte_ruta', 'rescate', etc.
  nivel_riesgo text not null,            -- 'bajo', 'medio', 'alto'
  requiere_evacuacion boolean not null default false,
  descripcion text,                      -- descripción normalizada por la IA
  geom geometry(Point, 4326),            -- coordenadas compartidas por Telegram
  estado_validacion text not null,       -- 'confirmado', 'pendiente', 'baja_confianza'
  reportes_corroborantes int not null default 0,  -- cuántos usuarios distintos reportaron algo similar cerca
  fuente text not null default 'telegram',
  creado_en timestamptz not null default now()
);

create index reportes_geom_idx on reportes using gist (geom);
create index reportes_tipo_idx on reportes (tipo_incidente);
```

**Nota de diseño:** `estado_validacion` tiene tres valores, no dos — la distinción entre `pendiente` (todavía no se pudo verificar clima ni corroboración) y `baja_confianza` (se verificó y no coincide con las condiciones esperadas) importa para el dominio: no es lo mismo "no sabemos" que "dudamos". Colapsar esto en un booleano `verificado: true/false` perdería información que las autoridades necesitan para decidir.

---

## 7. Los cinco pasos del pipeline

Cada función recibe una entrada tipada y devuelve una salida tipada. Ninguna función hace más de lo que su nombre promete.

### 7.1 `extraerEntidades(texto: string): Promise<EntidadesExtraidas>`

Llama a Groq con un prompt que fuerza salida JSON estricta (`tipo`, `riesgo`, `descripcion`, `requiere_evacuacion`). La IA acá no es conversacional — su única función es convertir lenguaje natural en datos estructurados. Si Groq no devuelve JSON válido, la función lanza `ErrorExtraccion`, no devuelve un objeto vacío disfrazado de éxito.

### 7.2 `verificarFrecuenciaDeUsuario(telegramId: string): Promise<boolean>`

Consulta `ultimo_reporte_en` del usuario. Si mandó un reporte hace menos de 30 minutos, la función devuelve `false` y el pipeline corta ahí — evita que una sola persona genere decenas de reportes sobre el mismo evento e infle artificialmente la confianza del mapa.

### 7.3 `verificarConClima(coordenadas: Coordenadas): Promise<'coincide' | 'no_coincide'>`

Consulta Open-Meteo por lluvia/alerta en la zona y momento del reporte. Devuelve un string del dominio, no un booleano genérico — así el resto del código no necesita recordar qué significa `true`.

### 7.4 `calcularNivelDeConfianza(reporte, resultadoClima): Promise<EstadoValidacion>`

Combina dos señales:

- Si el clima coincide → sube la confianza.
- Si hay **otros usuarios distintos** (no el mismo) reportando algo similar dentro de un radio de ~500m → sube la confianza más todavía. Esto es más fuerte que la validación climática sola: cinco personas distintas reportando inundación en la misma zona es más confiable que un evento sin lluvia registrada oficialmente (puede ser rotura de un dique, por ejemplo).
- Si ninguna de las dos señales confirma → el reporte queda en `pendiente`, nunca se descarta. La decisión de fondo es que un falso negativo (ignorar una emergencia real) es mucho más costoso que un falso positivo marcado como pendiente.

### 7.5 `guardarReporte(reporte: ReporteProcesado): Promise<void>`

Único punto de escritura a Supabase. Si falla el insert, lanza el error hacia arriba — no lo loguea y sigue como si nada, porque un reporte perdido en una emergencia es un dato crítico.

### 7.6 Orquestador: `procesarReporteCiudadano(mensaje: MensajeEntrante)`

```ts
export async function procesarReporteCiudadano(mensaje: MensajeEntrante) {
  const puedeReportar = await verificarFrecuenciaDeUsuario(mensaje.telegramId);
  if (!puedeReportar) {
    throw new ErrorLimiteDeFrecuencia(mensaje.telegramId);
  }

  const entidades = await extraerEntidades(mensaje.texto);
  const resultadoClima = await verificarConClima(mensaje.coordenadas);
  const estadoValidacion = await calcularNivelDeConfianza(
    { ...entidades, coordenadas: mensaje.coordenadas },
    resultadoClima
  );

  await guardarReporte({
    ...entidades,
    coordenadas: mensaje.coordenadas,
    estadoValidacion,
  });
}
```

Esta función se lee de arriba a abajo como la descripción del proceso de negocio. Es la prueba de que separar responsabilidades funcionó: no hay detalles de implementación de Groq, PostGIS ni Open-Meteo acá, solo el orden de las decisiones.

---

## 8. Manejo de errores

Regla dura: **ninguna función del pipeline atrapa un error y continúa en silencio.** Si Groq está caído, el reporte no se pierde silenciosamente — se guarda en una tabla `reportes_fallidos` con el motivo, para reprocesar después. Esto es más importante en un sistema de emergencias que en un CRUD cualquiera: perder un reporte de "necesito bote" sin dejar rastro es inaceptable, incluso en una demo.

```ts
try {
  await procesarReporteCiudadano(mensaje);
} catch (error) {
  await registrarFalloDeProcesamiento(mensaje, error);
}
```

---

## 9. Panel de control (frontend)

Cuatro componentes, cada uno alimentado por una query independiente a Supabase — nada de mezclar la lógica de un componente con la de otro:

1. **Mapa principal** — reportes de toda la provincia, con mapa de calor por concentración (React Leaflet).
2. **Estadísticas generales** — total de reportes, inundaciones, calles cortadas, árboles caídos, pedidos de ayuda.
3. **Últimos incidentes** — listado cronológico ("Hace 2 minutos — Barrio Laguna Seca — Agua ingresando a viviendas").
4. **Filtros** — por tipo de incidente (inundación, árbol caído, corte de ruta, evacuación, corte de energía) y por nivel de riesgo.

---

## 10. Variables de entorno

```
GROQ_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # solo en API routes, nunca en el cliente
TELEGRAM_BOT_TOKEN=
```

---

## 11. Datos simulados para la demo

Antes de la presentación, tener listo:

- `seed/mensajes-demo.json` — 30-40 mensajes de ejemplo con distintos niveles de riesgo, tipos de incidente y ubicaciones del gazetteer, incluyendo casos que deliberadamente NO coinciden con el clima (para mostrar el estado `pendiente` en vivo) y casos con múltiples usuarios reportando la misma zona (para mostrar el salto a `confirmado` por corroboración).
- `scripts/reproducirDemo.ts` — script que envía esos mensajes al bot a intervalos (cada 3-5 segundos) para que el mapa se pueble en vivo frente al jurado, en vez de arrancar con el mapa ya lleno.

---

## 12. Plan de desarrollo

**Etapa 1 — Preparación del proyecto.** Repo, Next.js, Tailwind + shadcn/ui, proyecto Supabase, diseño de tablas, variables de entorno, primer deploy en Vercel.

**Etapa 2 — Bot de Telegram.** Crear el bot en BotFather, configurar webhook hacia `/api/ingest`, flujo de texto + solicitud de ubicación, guardado inicial sin procesar.

**Etapa 3 — Procesamiento inteligente.** Conectar Groq, Open-Meteo, implementar `verificarFrecuenciaDeUsuario` y `calcularNivelDeConfianza`, actualizar el registro en Supabase con el resultado.

**Etapa 4 — Visualización.** Mapa interactivo con React Leaflet, mapa de calor, filtros, panel de estadísticas y últimos incidentes.

**Etapa 5 — Pruebas y demo.** Simular escenarios (lluvias, árboles caídos, calles cortadas), verificar el flujo completo Telegram → mapa, corregir errores, optimizar tiempos de respuesta, preparar la demo con `reproducirDemo.ts`.

---

## 13. Pendientes / próximos pasos

- [ ] Cargar el gazetteer de Corrientes/Resistencia (barrios, avenidas, puntos de referencia)
- [ ] Definir el prompt exacto de extracción para Groq (con ejemplos few-shot del dominio local)
- [ ] Levantar el proyecto en Supabase y correr la migración de `usuarios` y `reportes`
- [ ] Armar el bot de Telegram y configurar el webhook (definir quién del equipo lo hace)
- [ ] Implementar la lógica de corroboración por radio + usuarios distintos
- [ ] Conectar Supabase Realtime al frontend para que el mapa y el panel se actualicen sin refrescar

---

## 14. Ideas para una segunda versión (mencionar en el pitch, no desarrollar ahora)

No entran en el alcance del hackathon, pero sirven para mostrar visión de producto si el jurado pregunta "¿y después?":

- **Sistema de reputación de usuarios** — subir la confianza de quienes históricamente reportaron cosas válidas.
- **Carga de fotos** — que la IA confirme visualmente el tipo de incidente.
- **Alertas automáticas** — notificar a usuarios cercanos cuando se detecta una nueva zona crítica.
- **Predicción de expansión del riesgo** — combinar reportes con datos meteorológicos para estimar hacia dónde se puede extender una inundación.
- **Panel para autoridades** — marcar reportes como "atendidos", "en proceso" o "descartados", separando la información ciudadana de la gestión operativa.
