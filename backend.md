# Backend

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

> Base técnica del proyecto: una app de Next.js 16 con React 19, App Router y Supabase como backend de datos y autenticación. La ingesta principal de reportes llegará por Telegram usando un bot creado con BotFather.

Este documento describe la dirección técnica del backend y cómo se alinea con la estructura real del repositorio.

---

## 1. Stack actual

El proyecto usa estas tecnologías hoy:

- Next.js 16.2.12 con App Router.
- React 19.2.4.
- Tailwind CSS 4 para estilos globales.
- Supabase con `@supabase/ssr` y `@supabase/supabase-js`.
- TypeScript.

La integración con Telegram todavía es parte del backend objetivo, no del código montado en el repo. El bot se va a crear con BotFather y va a publicar reportes hacia la app mediante webhook o una ruta API.

---

## 2. Estructura real del proyecto

La estructura actual ya marca bastante bien cómo se organiza el backend:

```text
/app
  layout.tsx
  page.tsx
  globals.css
/utils
  /supabase
    client.ts
    server.ts
    middleware.ts
proxy.ts
```

`utils/supabase` concentra los tres contextos de uso de Supabase:

- `client.ts` para el navegador.
- `server.ts` para Server Components y lógica del servidor.
- `middleware.ts` para mantener sesiones con cookies.

`proxy.ts` actúa como middleware de la aplicación para refrescar o propagar estado de autenticación cuando haga falta.

---

## 3. Rol del backend

El backend no se plantea como un servicio separado con Express o NestJS. En este repo, Next.js es la capa de aplicación completa:

- Sirve el frontend.
- Ejecuta la lógica del servidor.
- Lee y escribe datos en Supabase.
- Recibe la futura entrada desde Telegram.

La idea es evitar duplicación de infraestructura mientras el proyecto sigue siendo de alcance chico o mediano. Si más adelante hace falta un worker separado para procesar mensajes o reintentos, eso se puede agregar sin romper la base actual.

---

## 4. Integración con Supabase

Supabase es la base de datos y la capa de autenticación elegida para el proyecto.

### 4.1 Variables de acceso

Los helpers de `utils/supabase` usan estas variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Si más adelante se agregan operaciones administrativas desde servidor o migraciones manuales, también va a hacer falta una key de servicio, pero no se usa en el cliente.

### 4.2 Responsabilidades

Supabase se va a usar para:

- Persistir usuarios y reportes.
- Consultar el estado de sesión cuando corresponda.
- Exponer datos al frontend de forma simple.
- Mantener cookies de sesión en el flujo server/middleware.

### 4.3 Convención de uso

- `utils/supabase/client.ts` se usa en componentes cliente o lógica que corre en el navegador.
- `utils/supabase/server.ts` se usa en Server Components o handlers del servidor.
- `utils/supabase/middleware.ts` se usa para sincronizar cookies entre request y response.

Esto evita mezclar responsabilidades y deja una sola forma de acceder a Supabase en todo el repo.

---

## 5. Integración con Telegram

El canal de entrada de reportes será un bot de Telegram creado con BotFather.

### 5.1 Flujo esperado

1. El usuario escribe al bot.
2. El bot pide o recibe el reporte y, si hace falta, la ubicación.
3. Telegram entrega el evento al backend.
4. Next.js valida y persiste el dato en Supabase.
5. El frontend consume la información y la muestra en pantalla.

### 5.2 Enfoque técnico

Para esta etapa conviene usar webhook en vez de polling:

- reduce complejidad operativa,
- evita dejar un proceso extra corriendo,
- encaja bien con Next.js desplegado en Vercel o una plataforma similar.

Si después se necesita separar el bot del frontend, el contrato puede mantenerse igual: Telegram entra por HTTP y el backend persiste en Supabase.

### 5.3 Variables de entorno previstas

```env
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
```

La segunda variable es opcional, pero recomendable para verificar que los requests realmente vienen de Telegram.

---

## 6. Estructura recomendada para crecer

La estructura actual es mínima, así que la evolución natural sería algo parecido a esto:

```text
/app
  /api
    /telegram
      route.ts
    /reports
      route.ts
  page.tsx
  layout.tsx
/lib
  /telegram
    parse-update.ts
    verify-webhook.ts
  /reports
    create-report.ts
    list-reports.ts
  /supabase
    admin.ts
/types
  report.ts
  telegram.ts
```

La idea no es inventar una arquitectura sobredimensionada, sino dejar espacio para separar bien:

- entrada de Telegram,
- lógica de negocio,
- acceso a datos,
- tipos compartidos.

---

## 7. Modelo de datos inicial en Supabase

Como base mínima, el backend debería manejar estas entidades:

### 7.1 `users`

- `id`
- `telegram_id`
- `username`
- `created_at`

### 7.2 `reports`

- `id`
- `user_id`
- `source` con valor `telegram`
- `message_text`
- `status`
- `latitude`
- `longitude`
- `created_at`

### 7.3 `report_status`

Estados sugeridos:

- `pending`
- `validated`
- `rejected`

Si después hace falta trazabilidad más fina, se pueden agregar campos para evidencia o notas de moderación.

---

## 8. Flujo de backend recomendado

El flujo debería mantenerse simple:

1. Telegram recibe el mensaje.
2. El backend identifica al usuario.
3. Se valida el contenido mínimo necesario.
4. Se guarda el reporte en Supabase.
5. El frontend consulta o suscribe cambios.

En esta primera versión no hace falta meter múltiples servicios intermedios. Lo importante es que el dato entre, se persista y quede listo para consumo del panel.

---

## 9. Estado actual del repo

Hoy el proyecto todavía tiene una pantalla base en `app/page.tsx` que consulta una tabla llamada `todos`. Eso funciona como placeholder, no como backend final.

La próxima tarea lógica es reemplazar ese acceso por la entidad real del proyecto, probablemente `reports` o una vista equivalente en Supabase.

---

## 10. Variables de entorno

Variables mínimas para trabajar con lo que ya está en el código:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
```

Si se agrega administración de datos desde servidor, también va a ser útil:

```env
SUPABASE_SERVICE_ROLE_KEY=
```

Esa key no debe exponerse en el cliente.

---

## 11. Próximos pasos

1. Crear el proyecto en Supabase y definir las tablas base.
2. Reemplazar el placeholder de `todos` por lecturas reales de `reports`.
3. Crear el bot en BotFather y configurar el webhook.
4. Implementar la ruta de entrada para Telegram en Next.js.
5. Conectar el frontend con Supabase para listar reportes reales.

---

## 12. Decisión de arquitectura

La decisión principal del backend es esta: Next.js hace de aplicación completa, Supabase resuelve datos y sesión, y Telegram entra como canal externo de captura de reportes.

Esa combinación encaja con la estructura actual del repo y evita meter piezas que hoy no están justificadas.
