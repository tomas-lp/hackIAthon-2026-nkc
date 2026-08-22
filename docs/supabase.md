# Guía de Comandos de Supabase para el Equipo

Este documento detalla los comandos de Supabase que estamos utilizando en el proyecto, para qué sirven y las ventajas que nos ofrecen durante el desarrollo en equipo.

## Requisitos Previos e Instalación

Para poder levantar Supabase localmente y probar el código, cada miembro del equipo debe instalar lo siguiente una sola vez:

1. **Docker Desktop:** El entorno local de Supabase corre dentro de contenedores de Docker.
   - **Instalación:** Descargá e instalá [Docker Desktop](https://www.docker.com/products/docker-desktop/).
   - **Configuración en Windows:** Durante la instalación, asegurate de habilitar la opción de usar el backend de **WSL 2** (Windows Subsystem for Linux), ya que es vital para la compatibilidad y rendimiento de los contenedores en Windows.
   - **Uso:** **Docker Desktop debe estar abierto y corriendo** (el icono de la ballena en la barra de tareas de Windows debe estar en verde) antes de ejecutar cualquier comando de Supabase local. Si está cerrado, los comandos fallarán con el error: `error during connect: This error may indicate that the docker daemon is not running`.
2. **Node.js:** Necesario para ejecutar los comandos (descargalo de [nodejs.org](https://nodejs.org/)).
3. **Login en Supabase CLI:** La primera vez, vas a tener que vincular tu terminal con tu cuenta de Supabase. Corré este comando:
   ```bash
   npx supabase login
   ```
   _(Te va a pedir que generes un Access Token desde la web de Supabase y lo pegues en la consola)._

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

_(Nota: En el archivo `supabase/config.toml` se puede configurar `verify_jwt = false` por función de forma permanente para lograr un efecto similar)._

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

### 3. Encender/Apagar el Entorno Local (Docker)

Si necesitás interactuar con la base de datos localmente, abrir la consola de administración web de Supabase local o levantar todos los servicios en tu máquina (lo cual requiere que Docker Desktop esté abierto):

**Iniciar los servicios locales:**

```bash
npx supabase start
```

- **¿Qué hace?** Lee tu configuración local y levanta contenedores de Docker para la base de datos, autenticación, almacenamiento y el panel de control local (Studio).
- **Ventaja:** Te dará urls locales para probar todo de forma aislada, incluyendo una versión local del panel web en `http://localhost:54323`.

**Detener los servicios locales:**

```bash
npx supabase stop
```

- **¿Qué hace?** Apaga todos los contenedores locales de Supabase en Docker para liberar memoria RAM y procesador en tu máquina cuando termines de desarrollar.

---

### 4. Subir Cambios a Producción (Deploy)

Cuando hayas terminado de modificar algo en tu código local y quieras subirlo al proyecto en la nube de Supabase para que funcione en vivo, vas a usar los comandos de `deploy` o `push`.

**Subir una Edge Function (como el bot):**

```bash
npx supabase functions deploy telegram-bot
```

- **¿Qué hace?** Empaqueta tu código local de la función indicada (en este caso `telegram-bot`) y lo sube a la nube. También aplica las configuraciones que hayas puesto en `supabase/config.toml` (por ejemplo, si le quitaste la verificación de JWT).
- _(Si querés subir todas las funciones juntas, podés usar `npx supabase functions deploy` sin especificar el nombre)._

**Subir cambios de la Base de Datos:**

```bash
npx supabase db push
```

- **¿Qué hace?** Si creaste nuevas migraciones de base de datos localmente (archivos en `supabase/migrations/`), este comando las aplica en tu base de datos remota de producción. ¡Ojo! Solo sube la estructura, no los datos de prueba locales.
