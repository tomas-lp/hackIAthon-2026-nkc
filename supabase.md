# Guía de Comandos de Supabase para el Equipo

Este documento detalla los comandos de Supabase que estamos utilizando en el proyecto, para qué sirven y las ventajas que nos ofrecen durante el desarrollo en equipo.

## Requisitos Previos e Instalación

Para poder levantar Supabase localmente y probar el código, cada miembro del equipo debe instalar lo siguiente una sola vez:

1. **Docker Desktop:** El entorno local de Supabase usa contenedores. Descargá e instalá [Docker Desktop](https://www.docker.com/products/docker-desktop/) y **asegurate de abrirlo y que esté corriendo** antes de usar los comandos.
2. **Node.js:** Necesario para ejecutar los comandos (descargalo de [nodejs.org](https://nodejs.org/)).
3. **Login en Supabase CLI:** La primera vez, vas a tener que vincular tu terminal con tu cuenta de Supabase. Corré este comando:
   ```bash
   npx supabase login
   ```
   *(Te va a pedir que generes un Access Token desde la web de Supabase y lo pegues en la consola).*

---

## Comandos Principales

### 1. Servidor Local de Edge Functions
```bash
npx supabase functions serve
```
Inicia un entorno local de Supabase para probar nuestras Edge Functions (como nuestro `telegram-bot`). 

**Ventajas:**
- **Desarrollo rápido:** Permite probar y debugear las funciones en nuestra computadora antes de subirlas a producción.
- **Hot-reloading:** Detecta cambios en el código de TypeScript/Deno y recarga la función automáticamente.

**Variante importante (Pruebas sin JWT):**
```bash
npx supabase functions serve --no-verify-jwt
```
- **¿Para qué sirve?** Desactiva la verificación de seguridad (tokens JWT) en las llamadas locales.
- **Ventaja:** Ideal para hacer pruebas rápidas desde Postman, cURL o scripts locales sin tener que lidiar con la autenticación de usuarios de Supabase en cada petición. 

*(Nota: En el archivo `supabase/config.toml` se puede configurar `verify_jwt = false` por función de forma permanente para lograr un efecto similar).*

---

### 2. Sincronización de Base de Datos
```bash
npx supabase db pull
```
Descarga la estructura más reciente de la base de datos desde la nube (proyecto remoto de Supabase) hacia nuestro entorno local.

**Ventajas:**
- **Trabajo en equipo sincronizado:** Si alguien hace un cambio en las tablas de la base de datos desde la interfaz web de Supabase (el Dashboard), el resto del equipo puede bajar ese cambio a su código local usando este comando.
- **Consistencia:** Actualiza y repara el historial de migraciones local, asegurando que todos tengamos exactamente las mismas tablas y configuraciones antes de seguir desarrollando.

---

### 3. Subir Cambios a Producción (Deploy)

Cuando hayas terminado de modificar algo en tu código local y quieras subirlo al proyecto en la nube de Supabase para que funcione en vivo, vas a usar los comandos de `deploy` o `push`.

**Subir una Edge Function (como el bot):**
```bash
npx supabase functions deploy telegram-bot
```
- **¿Qué hace?** Empaqueta tu código local de la función indicada (en este caso `telegram-bot`) y lo sube a la nube. También aplica las configuraciones que hayas puesto en `supabase/config.toml` (por ejemplo, si le quitaste la verificación de JWT).
- *(Si querés subir todas las funciones juntas, podés usar `npx supabase functions deploy` sin especificar el nombre).*

**Subir cambios de la Base de Datos:**
```bash
npx supabase db push
```
- **¿Qué hace?** Si creaste nuevas migraciones de base de datos localmente (archivos en `supabase/migrations/`), este comando las aplica en tu base de datos remota de producción. ¡Ojo! Solo sube la estructura, no los datos de prueba locales.
